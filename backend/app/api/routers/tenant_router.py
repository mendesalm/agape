from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional

from app.core.database import obter_sessao
from app.api.dependencias import exigir_superadmin, exigir_webmaster, obter_usuario_logado
from app.models.usuario import Usuario
from app.models.estabelecimento import Estabelecimento, ModoOperacao
from app.models.produto import Produto
from app.models.comanda import Comanda, ItemComanda, StatusComanda
from app.models.cliente import Cliente
from app.schemas.tenant_schema import (
    EstabelecimentoCreate, 
    EstabelecimentoUpdate, 
    EstabelecimentoResponse,
    EstabelecimentoDetalhesResponse,
    TenantStatusUpdate,
    MetricasGlobaisSaaSResponse
)
from app.core.security import obter_hash_senha
from app.core.logger import logger
from app.services.email_service import EmailService

router = APIRouter(prefix="/tenants", tags=["Configurações de Estabelecimento (SaaS)"])

@router.get("/metricas-globais", response_model=MetricasGlobaisSaaSResponse)
async def obter_metricas_globais_saas(
    db: AsyncSession = Depends(obter_sessao),
    _superadmin: Usuario = Depends(exigir_superadmin)
):
    """
    (SUPERADMIN) Retorna o dashboard executivo consolidado de todas as instâncias do SaaS BipFy:
    - Bares ativos vs bloqueados
    - Faturamento total transacionado
    - Volume de produtos, clientes e comandas
    """
    # 1. Total e status de Bares
    res_tenants = await db.execute(
        select(
            func.count(Estabelecimento.id),
            func.count(func.nullif(Estabelecimento.ativo == False, True)), # count onde ativo == True
            func.count(func.nullif(Estabelecimento.ativo == True, True))   # count onde ativo == False
        )
    )
    total_est, total_ativos, total_bloqueados = res_tenants.first() or (0, 0, 0)

    # 2. Total de Produtos
    res_prod = await db.execute(select(func.count(Produto.id)))
    total_produtos = res_prod.scalar() or 0

    # 3. Comandas Abertas
    res_comandas_abertas = await db.execute(
        select(func.count(Comanda.id)).where(Comanda.status == StatusComanda.ABERTA)
    )
    total_comandas_abertas = res_comandas_abertas.scalar() or 0

    # 4. Total de Clientes Cadastrados Globalmente
    res_clientes = await db.execute(select(func.count(Cliente.id)))
    total_clientes = res_clientes.scalar() or 0

    # 5. Faturamento Total do Ecossistema (Soma dos itens de comandas fechadas)
    res_faturamento = await db.execute(
        select(func.coalesce(func.sum(ItemComanda.quantidade * ItemComanda.valor_unitario), 0.0))
        .select_from(ItemComanda)
        .join(Comanda, ItemComanda.comanda_id == Comanda.id)
        .where(Comanda.status == StatusComanda.FECHADA)
    )
    faturamento_total = float(res_faturamento.scalar() or 0.0)

    return MetricasGlobaisSaaSResponse(
        total_estabelecimentos=total_est or 0,
        total_estabelecimentos_ativos=total_ativos or 0,
        total_estabelecimentos_bloqueados=total_bloqueados or 0,
        total_produtos_cadastrados=total_produtos,
        total_comandas_abertas=total_comandas_abertas,
        total_clientes_cadastrados=total_clientes,
        faturamento_total_ecossistema=faturamento_total
    )

@router.get("/", response_model=List[EstabelecimentoDetalhesResponse])
async def listar_estabelecimentos(
    ativo: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(obter_sessao),
    _superadmin: Usuario = Depends(exigir_superadmin)
):
    """
    (SUPERADMIN) Lista todas as instâncias/bares parceiros do SaaS BipFy com métricas agregadas.
    """
    query = select(Estabelecimento).offset(skip).limit(limit).order_by(Estabelecimento.id.desc())
    if ativo is not None:
        query = query.where(Estabelecimento.ativo == ativo)

    resultado = await db.execute(query)
    estabelecimentos = resultado.scalars().all()

    resposta: List[EstabelecimentoDetalhesResponse] = []
    for est in estabelecimentos:
        # Métricas de cada bar
        res_p = await db.execute(select(func.count(Produto.id)).where(Produto.tenant_id == est.id))
        total_p = res_p.scalar() or 0

        res_c = await db.execute(select(func.count(Comanda.id)).where(Comanda.tenant_id == est.id))
        total_c = res_c.scalar() or 0

        res_u = await db.execute(select(func.count(Usuario.id)).where(Usuario.tenant_id == est.id))
        total_u = res_u.scalar() or 0

        res_fat = await db.execute(
            select(func.coalesce(func.sum(ItemComanda.quantidade * ItemComanda.valor_unitario), 0.0))
            .select_from(ItemComanda)
            .join(Comanda, ItemComanda.comanda_id == Comanda.id)
            .where(
                Comanda.tenant_id == est.id, 
                Comanda.status == StatusComanda.FECHADA
            )
        )
        fat_est = float(res_fat.scalar() or 0.0)

        # Dados do Administrador Webmaster
        res_adm = await db.execute(
            select(Usuario).where(Usuario.tenant_id == est.id, Usuario.cargo == "WEBMASTER").limit(1)
        )
        adm = res_adm.scalars().first()

        resposta.append(EstabelecimentoDetalhesResponse(
            id=est.id,
            nome_fantasia=est.nome_fantasia,
            cnpj=est.cnpj,
            logo_url=est.logo_url,
            modo_operacao=est.modo_operacao,
            ativo=est.ativo,
            data_cadastro=est.data_cadastro,
            total_produtos=total_p,
            total_comandas=total_c,
            total_usuarios=total_u,
            faturamento_total=fat_est,
            admin_nome=adm.nome if adm else None,
            admin_email=adm.email if adm else None
        ))

    return resposta

@router.post("/", response_model=EstabelecimentoResponse, status_code=status.HTTP_201_CREATED)
async def criar_estabelecimento(
    dados: EstabelecimentoCreate, 
    db: AsyncSession = Depends(obter_sessao),
    _superadmin: Usuario = Depends(exigir_superadmin)
):
    """(SUPERADMIN) Provisiona um novo Bar na plataforma e já gera o usuário Webmaster dono dele."""
    
    # 1. Verifica se email do novo admin já existe
    resultado = await db.execute(select(Usuario).where(Usuario.email == dados.admin_email))
    if resultado.scalars().first():
        raise HTTPException(status_code=400, detail=f"O e-mail '{dados.admin_email}' já está em uso por outro usuário.")

    # 2. Verifica se CNPJ já existe se fornecido
    if dados.cnpj and dados.cnpj.strip():
        res_cnpj = await db.execute(select(Estabelecimento).where(Estabelecimento.cnpj == dados.cnpj.strip()))
        if res_cnpj.scalars().first():
            raise HTTPException(status_code=400, detail=f"O CNPJ '{dados.cnpj}' já está cadastrado para outro bar.")

    # 3. Cria o Estabelecimento
    novo_estabelecimento = Estabelecimento(
        nome_fantasia=dados.nome_fantasia,
        cnpj=dados.cnpj,
        logo_url=dados.logo_url,
        modo_operacao=dados.modo_operacao,
        ativo=dados.ativo
    )
    db.add(novo_estabelecimento)
    await db.commit()
    await db.refresh(novo_estabelecimento)

    # 3. Cria o Usuário Webmaster (Dono do bar)
    novo_usuario = Usuario(
        tenant_id=novo_estabelecimento.id,
        nome=dados.admin_nome,
        email=dados.admin_email,
        senha_hash=obter_hash_senha(dados.admin_senha),
        cargo="WEBMASTER"
    )
    db.add(novo_usuario)
    await db.commit()

    # 4. Dispara e-mail de boas-vindas com as credenciais para o Webmaster
    try:
        await EmailService.enviar_email_boas_vindas_webmaster(
            destinatario=dados.admin_email,
            nome=dados.admin_nome,
            estabelecimento_nome=novo_estabelecimento.nome_fantasia,
            senha=dados.admin_senha
        )
    except Exception as e:
        logger.warning(f"Não foi possível enviar e-mail de boas-vindas: {e}")

    logger.info(f"Instância '{novo_estabelecimento.nome_fantasia}' (ID: {novo_estabelecimento.id}) provisionada com sucesso.")
    return novo_estabelecimento

@router.get("/me", response_model=EstabelecimentoDetalhesResponse)
async def obter_meu_estabelecimento(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """(WEBMASTER/OPERADOR) Retorna as informações do estabelecimento em que o usuário está operando."""
    if not usuario.tenant_id:
        raise HTTPException(status_code=400, detail="Usuário Superadmin não possui tenant vinculado.")

    resultado = await db.execute(select(Estabelecimento).where(Estabelecimento.id == usuario.tenant_id))
    est = resultado.scalars().first()
    if not est:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado.")

    res_p = await db.execute(select(func.count(Produto.id)).where(Produto.tenant_id == est.id))
    res_c = await db.execute(select(func.count(Comanda.id)).where(Comanda.tenant_id == est.id))
    res_u = await db.execute(select(func.count(Usuario.id)).where(Usuario.tenant_id == est.id))
    res_fat = await db.execute(
        select(func.coalesce(func.sum(ItemComanda.quantidade * ItemComanda.valor_unitario), 0.0))
        .select_from(ItemComanda)
        .join(Comanda, ItemComanda.comanda_id == Comanda.id)
        .where(
            Comanda.tenant_id == est.id, 
            Comanda.status == StatusComanda.FECHADA
        )
    )

    return EstabelecimentoDetalhesResponse(
        id=est.id,
        nome_fantasia=est.nome_fantasia,
        cnpj=est.cnpj,
        logo_url=est.logo_url,
        modo_operacao=est.modo_operacao,
        ativo=est.ativo,
        data_cadastro=est.data_cadastro,
        total_produtos=res_p.scalar() or 0,
        total_comandas=res_c.scalar() or 0,
        total_usuarios=res_u.scalar() or 0,
        faturamento_total=float(res_fat.scalar() or 0.0)
    )

@router.put("/me", response_model=EstabelecimentoResponse)
async def atualizar_meu_estabelecimento(
    dados: EstabelecimentoUpdate, 
    db: AsyncSession = Depends(obter_sessao),
    webmaster: Usuario = Depends(exigir_webmaster)
):
    """(WEBMASTER) Atualiza os dados do próprio bar (ex: Mudar logo, modo de operação ou nome)."""
    if not webmaster.tenant_id:
        raise HTTPException(status_code=400, detail="Usuário não possui estabelecimento vinculado.")

    resultado = await db.execute(select(Estabelecimento).where(Estabelecimento.id == webmaster.tenant_id))
    estabelecimento = resultado.scalars().first()
    
    if not estabelecimento:
        raise HTTPException(status_code=404, detail="Estabelecimento não encontrado.")

    atualizacao = dados.model_dump(exclude_unset=True)
    # Webmaster não pode alterar o próprio status de inadimplência
    atualizacao.pop("ativo", None)

    for campo, valor in atualizacao.items():
        setattr(estabelecimento, campo, valor)
        
    await db.commit()
    await db.refresh(estabelecimento)
    return estabelecimento

@router.patch("/{tenant_id}/status", response_model=EstabelecimentoResponse)
async def alterar_status_estabelecimento(
    tenant_id: int,
    dados: TenantStatusUpdate,
    db: AsyncSession = Depends(obter_sessao),
    _superadmin: Usuario = Depends(exigir_superadmin)
):
    """
    (SUPERADMIN) Bloqueia/Suspende ou Ativa um Bar na plataforma.
    Se ativo=False, a trava implacável bloqueia todas as requisições com HTTP 402 Payment Required.
    """
    resultado = await db.execute(select(Estabelecimento).where(Estabelecimento.id == tenant_id))
    estabelecimento = resultado.scalars().first()
    if not estabelecimento:
        raise HTTPException(status_code=404, detail=f"Estabelecimento #{tenant_id} não encontrado.")

    estabelecimento.ativo = dados.ativo
    await db.commit()
    await db.refresh(estabelecimento)
    
    status_str = "ATIVADO" if dados.ativo else "SUSPENSO/BLOQUEADO"
    logger.info(f"Instância #{tenant_id} ({estabelecimento.nome_fantasia}) alterada para {status_str} pelo Superadmin.")
    return estabelecimento

@router.put("/{tenant_id}", response_model=EstabelecimentoResponse)
async def atualizar_estabelecimento_por_id(
    tenant_id: int,
    dados: EstabelecimentoUpdate,
    db: AsyncSession = Depends(obter_sessao),
    _superadmin: Usuario = Depends(exigir_superadmin)
):
    """(SUPERADMIN) Atualiza qualquer parâmetro de uma instância específica."""
    resultado = await db.execute(select(Estabelecimento).where(Estabelecimento.id == tenant_id))
    estabelecimento = resultado.scalars().first()
    if not estabelecimento:
        raise HTTPException(status_code=404, detail=f"Estabelecimento #{tenant_id} não encontrado.")

    atualizacao = dados.model_dump(exclude_unset=True)
    for campo, valor in atualizacao.items():
        setattr(estabelecimento, campo, valor)

    await db.commit()
    await db.refresh(estabelecimento)
    return estabelecimento
