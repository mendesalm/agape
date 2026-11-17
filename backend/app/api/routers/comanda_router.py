from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import time
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel, Field
import uuid
import re

from app.core.database import obter_sessao
from app.schemas.comanda_schema import (
    ComandaCreate, 
    ComandaResponse, 
    ItemComandaCreate, 
    StatusComanda, 
    FecharComandaRequest,
    RecargaSaldoBarRequest,
    ComprovanteTermicoResponse,
    DadosCartaoCredito
)
from app.services.comanda_service import ComandaService
from app.services.carteira_service import CarteiraService
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.models.cliente import Cliente, CarteiraCliente, CartaoFisico, VinculoCartaoCliente, StatusCartaoFisico
from app.models.comanda import Comanda, ItemComanda

router = APIRouter(prefix="/comandas", tags=["Comandas Eletrônicas & PDV Bar (SaaS)"])

@router.get("/", response_model=List[ComandaResponse])
async def listar_comandas(
    status: Optional[StatusComanda] = Query(None, description="Filtrar pelo status da comanda"),
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.listar_comandas(status, skip, limit)

@router.post("/", response_model=ComandaResponse, status_code=status.HTTP_201_CREATED)
async def abrir_comanda(
    dados: ComandaCreate, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.abrir_comanda(dados)

class IdentificarCartaoRequest(BaseModel):
    identificador_cartao: str
    nome_cliente: Optional[str] = None

@router.post("/identificar-cartao", response_model=ComandaResponse)
async def identificar_ou_abrir_por_cartao(
    dados: IdentificarCartaoRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    (PDV Balcão) Operador bipa o Cartão/QR Code do cliente.
    Localiza a comanda aberta dele ou cria uma comanda nova automaticamente vinculando o cliente.
    """
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.buscar_ou_abrir_por_cartao(dados.identificador_cartao, dados.nome_cliente)

@router.get("/clientes/busca")
async def buscar_clientes(
    q: Optional[str] = Query(None, description="Nome, CIM ou CPF"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Lista ou pesquisa clientes/irmãos cadastrados no Ágape para seleção rápida.
    """
    query = select(Cliente)
    if q and q.strip():
        termo = f"%{q.strip()}%"
        query = query.where(
            (Cliente.nome.ilike(termo)) | 
            (Cliente.cpf.ilike(termo)) | 
            (Cliente.cim.ilike(termo))
        )
    query = query.order_by(Cliente.nome.asc()).limit(50)
    res = await db.execute(query)
    clientes = res.scalars().all()
    
    resultado = []
    for c in clientes:
        resultado.append({
            "id": c.id,
            "nome": c.nome,
            "cpf": c.cpf,
            "cim": c.cim,
            "telefone": c.telefone,
            "email": c.email,
            "tipo_consumidor": c.tipo_consumidor,
            "nome_loja_origem": c.nome_loja_origem
        })
    return resultado

class DocumentoVinculoItem(BaseModel):
    tipo: str = "DOCUMENTO_QR"
    rotulo: str = "Documento QR"
    codigo: str

class ClienteCadastroAgapeRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    telefone: Optional[str] = Field(None, max_length=20)
    cpf_ou_cim: Optional[str] = Field(None, max_length=30)
    tipo_consumidor: str = Field(default="IRMAO_QUADRO") # IRMAO_QUADRO ou CONVIDADO_NAO_MACOM
    documentos_qr: List[DocumentoVinculoItem] = Field(default_factory=list)
    codigo_cartao_coringa: Optional[str] = Field(None, max_length=100)

class DependenteCadastroRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., min_length=5, max_length=100)
    telefone: Optional[str] = Field(None, max_length=20)
    parentesco: str = Field(default="Esposa", max_length=40)

@router.post("/clientes", status_code=status.HTTP_201_CREATED)
async def cadastrar_cliente_agape(
    dados: ClienteCadastroAgapeRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Cadastra um novo Irmão ou Convidado no Ágape com e-mail obrigatório,
    vínculo opcional de documentos com QR Code e/ou cartão genérico de comanda.
    """
    email_limpo = dados.email.strip().lower()
    if "@" not in email_limpo or "." not in email_limpo.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Informe um e-mail válido.")

    tipo = dados.tipo_consumidor.upper().strip()
    if tipo not in ("IRMAO_QUADRO", "IRMAO_VISITANTE", "CONVIDADO_NAO_MACOM"):
        raise HTTPException(status_code=400, detail="Tipo de consumidor inválido. Use Novo Irmão ou Convidado.")

    digitos = re.sub(r"\D", "", dados.cpf_ou_cim or "")
    cpf_val = None
    cim_val = None
    if len(digitos) == 11:
        cpf_val = digitos
    elif 4 <= len(digitos) <= 8:
        cim_val = digitos
        cpf_val = f"CIM:{digitos}"
    else:
        cpf_val = f"CAD:{uuid.uuid4().hex[:10].upper()}"

    # Verifica se já existe por CPF ou CIM
    cond = (Cliente.cpf == cpf_val)
    if cim_val:
        cond = cond | (Cliente.cim == cim_val)
    res_ex = await db.execute(select(Cliente).where(cond))
    existente = res_ex.scalars().first()
    if existente:
        raise HTTPException(
            status_code=400,
            detail=f"Já existe um cadastro com este documento para {existente.nome}."
        )

    docs_json = []
    for idx, doc in enumerate(dados.documentos_qr):
        cod = doc.codigo.strip()
        if not cod:
            continue
        docs_json.append({
            "id": f"{doc.tipo.lower()}_{int(time.time())}_{idx}",
            "tipo": doc.tipo.upper(),
            "rotulo": doc.rotulo.strip() or doc.tipo.upper(),
            "codigo": cod,
            "cadastrado_em": datetime.utcnow().isoformat() + "Z",
            "ativo": True
        })

    novo = Cliente(
        nome=dados.nome.strip(),
        email=email_limpo,
        telefone=(dados.telefone or "").strip() or None,
        cpf=cpf_val,
        cim=cim_val,
        tipo_consumidor=tipo,
        identificadores_qr=docs_json,
        ativo=True
    )
    db.add(novo)
    await db.flush()

    await CarteiraService.obter_ou_criar_carteira(db, novo.id, usuario.tenant_id)

    # Se informou cartão genérico de comanda, associa ao cliente
    if dados.codigo_cartao_coringa and dados.codigo_cartao_coringa.strip():
        cod_cartao = dados.codigo_cartao_coringa.strip()
        res_cartao = await db.execute(
            select(CartaoFisico).where(
                CartaoFisico.tenant_id == usuario.tenant_id,
                CartaoFisico.codigo_identificador == cod_cartao
            )
        )
        cartao = res_cartao.scalars().first()
        if not cartao:
            cartao = CartaoFisico(
                tenant_id=usuario.tenant_id,
                codigo_identificador=cod_cartao,
                status=StatusCartaoFisico.EM_USO
            )
            db.add(cartao)
            await db.flush()
        else:
            cartao.status = StatusCartaoFisico.EM_USO

        db.add(VinculoCartaoCliente(
            tenant_id=usuario.tenant_id,
            cartao_id=cartao.id,
            cliente_id=novo.id,
            ativo=True
        ))

    await db.commit()
    await db.refresh(novo)
    return await _montar_detalhes_cliente(db, novo, usuario.tenant_id)

@router.post("/cliente/{cliente_id}/dependentes", status_code=status.HTTP_201_CREATED)
async def cadastrar_dependente_cliente(
    cliente_id: int,
    dados: DependenteCadastroRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Cadastra um dependente (Esposa, Filho, etc.) já referenciado ao Irmão titular,
    com e-mail obrigatório, autorizado a retirar itens em nome do titular.
    """
    email_limpo = dados.email.strip().lower()
    if "@" not in email_limpo or "." not in email_limpo.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Informe um e-mail válido para o dependente.")

    res_titular = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    titular = res_titular.scalars().first()
    if not titular:
        raise HTTPException(status_code=404, detail="Cliente titular não encontrado.")

    dep = Cliente(
        nome=dados.nome.strip(),
        email=email_limpo,
        telefone=(dados.telefone or "").strip() or None,
        cpf=f"DEP-{titular.id}-{uuid.uuid4().hex[:8].upper()}",
        tipo_consumidor="FAMILIAR",
        obreiro_responsavel_id=titular.id,
        observacao=dados.parentesco.strip() or "Dependente",
        ativo=True
    )
    db.add(dep)
    await db.commit()
    await db.refresh(dep)
    return await _montar_detalhes_cliente(db, titular, usuario.tenant_id)

class DependenteControleRequest(BaseModel):
    autorizacao_pausada: Optional[bool] = None
    limite_sessao: Optional[float] = Field(None, ge=0)

@router.patch("/cliente/{cliente_id}/dependentes/{dependente_id}")
async def atualizar_controle_dependente(
    cliente_id: int,
    dependente_id: int,
    dados: DependenteControleRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Permite ao titular pausar/reativar a autorização de um dependente
    ou definir/limpar o limite máximo de consumo por sessão.
    """
    res_titular = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    titular = res_titular.scalars().first()
    if not titular:
        raise HTTPException(status_code=404, detail="Titular não encontrado.")

    res_dep = await db.execute(
        select(Cliente).where(
            Cliente.id == dependente_id,
            Cliente.obreiro_responsavel_id == cliente_id
        )
    )
    dep = res_dep.scalars().first()
    if not dep:
        raise HTTPException(status_code=404, detail="Dependente não encontrado para este titular.")

    payload = dados.model_dump(exclude_unset=True)
    if "autorizacao_pausada" in payload and payload["autorizacao_pausada"] is not None:
        dep.autorizacao_pausada = payload["autorizacao_pausada"]
    if "limite_sessao" in payload:
        dep.limite_sessao = payload["limite_sessao"]

    await db.commit()
    await db.refresh(dep)
    return await _montar_detalhes_cliente(db, titular, usuario.tenant_id)

@router.get("/cliente/meu-perfil")
async def obter_meu_perfil_cliente(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Localiza automaticamente o perfil de Cliente do usuário logado (ou cria/vincula se inexistente),
    junto com seu saldo de carteira, comanda aberta e cartão ativo.
    """
    # 1. Tenta localizar por e-mail ou nome
    res = await db.execute(select(Cliente).where(Cliente.email == usuario.email))
    cliente = res.scalars().first()
    
    if not cliente:
        res_nome = await db.execute(select(Cliente).where(Cliente.nome.ilike(f"%{usuario.nome}%")))
        cliente = res_nome.scalars().first()

    if not cliente:
        # Se for admin ou teste, busca o primeiro cliente do banco ou cria
        res_first = await db.execute(select(Cliente).order_by(Cliente.id.asc()))
        cliente = res_first.scalars().first()

    if not cliente:
        # Cria um cliente automático para o usuário logado
        cliente = Cliente(
            nome=usuario.nome,
            cpf=f"USER-{usuario.id}",
            email=usuario.email,
            tipo_consumidor="IRMAO_QUADRO"
        )
        db.add(cliente)
        await db.commit()
        await db.refresh(cliente)

    return await _montar_detalhes_cliente(db, cliente, usuario.tenant_id)

@router.get("/cliente/{cliente_id}/detalhes")
async def obter_detalhes_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Retorna o perfil completo do cliente, saldo da carteira, comanda aberta e cartão ativo.
    """
    res = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = res.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return await _montar_detalhes_cliente(db, cliente, usuario.tenant_id)

async def _montar_detalhes_cliente(db: AsyncSession, cliente: Cliente, tenant_id: int):
    # Carteira
    carteira = await CarteiraService.obter_ou_criar_carteira(db, cliente.id, tenant_id)

    # Cartão ativo (se houver)
    res_vinc = await db.execute(
        select(VinculoCartaoCliente)
        .options(selectinload(VinculoCartaoCliente.cartao))
        .where(
            VinculoCartaoCliente.cliente_id == cliente.id,
            VinculoCartaoCliente.tenant_id == tenant_id,
            VinculoCartaoCliente.ativo == True
        )
    )
    vinc = res_vinc.scalars().first()
    cartao_codigo = vinc.cartao.codigo_identificador if (vinc and vinc.cartao) else None

    # Comanda aberta
    res_comanda = await db.execute(
        select(Comanda)
        .options(
            selectinload(Comanda.itens).selectinload(ItemComanda.produto),
            selectinload(Comanda.cliente)
        )
        .where(
            Comanda.cliente_id == cliente.id,
            Comanda.tenant_id == tenant_id,
            Comanda.status == StatusComanda.ABERTA
        )
        .order_by(Comanda.id.desc())
    )
    comanda_aberta = res_comanda.scalars().first()
    comanda_info = None
    if comanda_aberta:
        total = sum(i.quantidade * i.valor_unitario for i in (comanda_aberta.itens or []))
        comanda_info = {
            "id": comanda_aberta.id,
            "identificador_cartao": comanda_aberta.identificador_cartao,
            "data_abertura": comanda_aberta.data_abertura.isoformat() if comanda_aberta.data_abertura else None,
            "total": total,
            "itens": [
                {
                    "id": item.id,
                    "produto_id": item.produto_id,
                    "nome_produto": getattr(item, "nome_produto", None) or f"Item #{item.produto_id}",
                    "quantidade": item.quantidade,
                    "valor_unitario": item.valor_unitario,
                    "subtotal": item.quantidade * item.valor_unitario,
                    "observacao": item.observacao
                }
                for item in (comanda_aberta.itens or [])
            ]
        }

    # Dependentes autorizados vinculados a este titular
    res_deps = await db.execute(
        select(Cliente).where(
            Cliente.obreiro_responsavel_id == cliente.id,
            Cliente.ativo == True
        ).order_by(Cliente.nome.asc())
    )
    deps_lista = res_deps.scalars().all()

    # Calcula consumo acumulado por dependente (itens marcados com observação "Retirado por: Nome" ou comandas próprias)
    consumo_por_dep = {d.id: 0.0 for d in deps_lista}
    if deps_lista:
        res_com_tit = await db.execute(
            select(Comanda)
            .options(selectinload(Comanda.itens))
            .where(
                Comanda.cliente_id == cliente.id,
                Comanda.tenant_id == tenant_id,
                Comanda.status != StatusComanda.CANCELADA
            )
        )
        for com in res_com_tit.scalars().all():
            for it in (com.itens or []):
                obs_it = (getattr(it, "observacao", None) or "").lower()
                for d in deps_lista:
                    if d.nome.lower() in obs_it:
                        consumo_por_dep[d.id] += float(it.quantidade * it.valor_unitario)

    dependentes = [
        {
            "id": d.id,
            "nome": d.nome,
            "parentesco": d.observacao or "Dependente",
            "email": d.email,
            "telefone": d.telefone,
            "tipo_consumidor": d.tipo_consumidor,
            "limite_sessao": getattr(d, "limite_sessao", None),
            "autorizacao_pausada": bool(getattr(d, "autorizacao_pausada", False)),
            "consumo_total": round(consumo_por_dep.get(d.id, 0.0), 2),
        }
        for d in deps_lista
    ]

    return {
        "cliente": {
            "id": cliente.id,
            "nome": cliente.nome,
            "cpf": cliente.cpf,
            "cim": cliente.cim,
            "telefone": cliente.telefone,
            "email": cliente.email,
            "tipo_consumidor": cliente.tipo_consumidor,
            "nome_loja_origem": cliente.nome_loja_origem,
            "grau_maconico": getattr(cliente, "grau_maconico", None),
            "situacao_gob": getattr(cliente, "situacao_gob", None),
            "validado_metagob": getattr(cliente, "validado_metagob", False),
            "identificadores_qr": getattr(cliente, "identificadores_qr", []) or [],
            "observacao": cliente.observacao
        },
        "carteira": {
            "saldo": carteira.saldo,
            "limite_fiado": getattr(carteira, "limite_fiado", 100.0)
        },
        "cartao_ativo": cartao_codigo,
        "comanda_aberta": comanda_info,
        "dependentes": dependentes
    }

class QuitarComandaClienteRequest(BaseModel):
    forma_pagamento: str = "pix" # "pix", "carteira", "cartao_credito"
    devolver_cartao: bool = True
    dados_cartao: Optional[DadosCartaoCredito] = None

@router.post("/cliente/{cliente_id}/quitar-comanda-aberta")
async def quitar_comanda_cliente(
    cliente_id: int,
    dados: QuitarComandaClienteRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Permite ao cliente quitar sua comanda em aberto diretamente pelo celular:
    - via Pix (imediatamente liquidado)
    - via Cartão de Crédito Online (com tokenização Asaas / antifraude)
    - via Carteira de Saldo (se tiver saldo suficiente)
    E opcionalmente desvincula e libera o cartão físico de volta ao estoque.
    """
    res_comanda = await db.execute(
        select(Comanda)
        .options(
            selectinload(Comanda.itens).selectinload(ItemComanda.produto),
            selectinload(Comanda.cliente)
        )
        .where(
            Comanda.cliente_id == cliente_id,
            Comanda.tenant_id == usuario.tenant_id,
            Comanda.status == StatusComanda.ABERTA
        )
    )
    comanda = res_comanda.scalars().first()
    if not comanda:
        raise HTTPException(status_code=404, detail="Não há comanda aberta para este cliente.")

    servico = ComandaService(db, usuario.tenant_id)
    forma = "saldo_bar_fiado" if dados.forma_pagamento == "carteira" else dados.forma_pagamento

    obs = "Quitação de Comanda via Portal do Cliente (Auto-checkout Celular)"
    if dados.forma_pagamento == "cartao_credito":
        if dados.dados_cartao and dados.dados_cartao.numero:
            num_limpo = dados.dados_cartao.numero.replace(" ", "").replace("-", "")
            final_4 = num_limpo[-4:] if len(num_limpo) >= 4 else "XXXX"
            titular = f" - {dados.dados_cartao.nome_titular.upper()}" if dados.dados_cartao.nome_titular else ""
            obs = f"Quitação Cartão Crédito Online (Final •••• {final_4}{titular}) via Portal do Irmão"
        else:
            obs = "Quitação Cartão Crédito Online via Portal do Irmão"

    req_fechamento = FecharComandaRequest(
        forma_pagamento=forma,
        observacao=obs,
        dados_cartao=dados.dados_cartao
    )
    comanda_fechada = await servico.fechar_comanda(comanda.id, req_fechamento, usuario=usuario)

    # Libera cartão se solicitado
    cartao_liberado = None
    if dados.devolver_cartao and comanda.identificador_cartao:
        res_vinc = await db.execute(
            select(VinculoCartaoCliente)
            .options(selectinload(VinculoCartaoCliente.cartao))
            .where(
                VinculoCartaoCliente.cliente_id == cliente_id,
                VinculoCartaoCliente.ativo == True
            )
        )
        vinc = res_vinc.scalars().first()
        if vinc:
            vinc.ativo = False
            vinc.data_desvinculo = datetime.utcnow()
            vinc.observacao = "Devolução e liberação via Auto-checkout do Cliente"
            if vinc.cartao:
                vinc.cartao.status = StatusCartaoFisico.DISPONIVEL
                cartao_liberado = vinc.cartao.codigo_identificador
        await db.commit()

    return {
        "sucesso": True,
        "mensagem": "Comanda quitada com sucesso!",
        "comanda_id": comanda.id,
        "cartao_liberado": cartao_liberado
    }

@router.get("/{comanda_id}", response_model=ComandaResponse)
async def obter_comanda(
    comanda_id: int, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.obter_comanda(comanda_id)

@router.post("/{comanda_id}/itens", response_model=ComandaResponse)
async def adicionar_item_comanda(
    comanda_id: int, 
    dados: ItemComandaCreate, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """Adiciona um produto à comanda debitando o saldo no Event Sourcing de Estoque com auditoria de operador."""
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.adicionar_item(comanda_id, dados, operador_id=usuario.id)

@router.delete("/{comanda_id}/itens/{item_id}", response_model=ComandaResponse)
async def remover_item_comanda(
    comanda_id: int,
    item_id: int,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """Remove um item lançado por engano e estorna a quantidade ao estoque de gôndola."""
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.remover_item(comanda_id, item_id, operador_id=usuario.id)

@router.patch("/{comanda_id}/fechar", response_model=ComandaResponse)
async def fechar_comanda(
    comanda_id: int, 
    dados: Optional[FecharComandaRequest] = None,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Encerra a comanda com a forma de pagamento escolhida (Pix, Dinheiro, Cartão ou Saldo/Fiado no Bar).
    Aplica validação de limite devedor máximo (R$ 100,00) e audita estoques e operador.
    """
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.fechar_comanda(comanda_id, dados, usuario=usuario)

@router.get("/{comanda_id}/comprovante-termico", response_model=ComprovanteTermicoResponse)
async def obter_comprovante_termico(
    comanda_id: int,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Gera o comprovante pronto para impressora térmica portátil (ESC/POS 58mm / 80mm).
    """
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.gerar_comprovante_termico(comanda_id)

@router.get("/relatorios/extrato-periodo")
async def obter_extrato_periodo(
    cliente_id: int = Query(..., description="ID do Cliente no Ágape"),
    data_inicio: datetime = Query(..., description="Data/Hora inicial ISO"),
    data_fim: datetime = Query(..., description="Data/Hora final ISO"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Emite a fatura detalhada das consumações de um obreiro em um determinado período
    formatada para comprovante térmico e visualização auditável.
    """
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.gerar_extrato_periodo_termico(cliente_id, data_inicio, data_fim)

@router.post("/carteira/recarga")
async def recarregar_conta_bar(
    dados: RecargaSaldoBarRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Insere créditos na conta do Bar do obreiro ou quita débito acumulado
    via Pix, Dinheiro, Cartão ou Boleto.
    A receita é destinada exclusivamente ao caixa do Bar.
    """
    obs = dados.observacao or "Recarga no Bar"
    if dados.forma_pagamento == "cartao_credito" and dados.dados_cartao and dados.dados_cartao.numero:
        num_limpo = dados.dados_cartao.numero.replace(" ", "").replace("-", "")
        final_4 = num_limpo[-4:] if len(num_limpo) >= 4 else "XXXX"
        obs = f"[Cartão •••• {final_4}] {obs}"

    carteira = await CarteiraService.adicionar_creditos_bar(
        db=db,
        cliente_id=dados.cliente_id,
        tenant_id=usuario.tenant_id,
        valor=dados.valor,
        forma_pagamento=dados.forma_pagamento,
        operador_nome=usuario.nome,
        observacao=obs
    )
    return {
        "mensagem": f"Crédito de R$ {dados.valor:.2f} lançado com sucesso na conta do bar.",
        "cliente_id": dados.cliente_id,
        "saldo_atual": carteira.saldo,
        "limite_fiado": getattr(carteira, "limite_fiado", 100.0)
    }

@router.get("/cliente/{cliente_id}", response_model=List[ComandaResponse])
async def listar_faturas_cliente(
    cliente_id: int,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Lista o histórico completo de comandas e faturas de um cliente/irmão no Bar.
    """
    res = await db.execute(
        select(Comanda)
        .options(
            selectinload(Comanda.itens).selectinload(ItemComanda.produto),
            selectinload(Comanda.cliente)
        )
        .where(
            Comanda.tenant_id == usuario.tenant_id,
            Comanda.cliente_id == cliente_id
        )
        .order_by(Comanda.data_abertura.desc())
    )
    comandas = res.scalars().all()
    servico = ComandaService(db, usuario.tenant_id)
    for c in comandas:
        servico._enriquecer_comanda(c)
    return comandas

class AtualizarPerfilClienteRequest(BaseModel):
    telefone: Optional[str] = None
    email: Optional[str] = None
    observacao: Optional[str] = None

@router.patch("/cliente/{cliente_id}/perfil")
async def atualizar_perfil_cliente(
    cliente_id: int,
    dados: AtualizarPerfilClienteRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Atualiza os dados de contato do cliente/irmão (telefone/WhatsApp e e-mail).
    """
    res = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = res.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    if dados.telefone is not None:
        cliente.telefone = dados.telefone
    if dados.email is not None:
        cliente.email = dados.email
    if dados.observacao is not None:
        cliente.observacao = dados.observacao

    await db.commit()
    await db.refresh(cliente)
    return {
        "id": cliente.id,
        "nome": cliente.nome,
        "cpf": cliente.cpf,
        "cim": cliente.cim,
        "telefone": cliente.telefone,
        "email": cliente.email,
        "observacao": cliente.observacao
    }

class VincularDocumentoRequest(BaseModel):
    tipo: str = "CNH" # CNH, CNI, E_GOB_CARD, MILITAR, ENTIDADE_CLASSE, OUTRO
    rotulo: str
    codigo: str

@router.post("/cliente/{cliente_id}/vincular-documento")
async def vincular_documento_cliente(
    cliente_id: int,
    dados: VincularDocumentoRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Atrela um documento com QR Code (CNH, CNI, e-GOB Card, Militar, OAB)
    ao cadastro do cliente no Salão de Ágapes.
    """
    cod_limpo = dados.codigo.strip()
    if not cod_limpo:
        raise HTTPException(status_code=400, detail="Código do documento não pode ser vazio.")

    # 1. Trava de unicidade: impede que o mesmo QR Code pertença a mais de um cliente
    try:
        res_unic = await db.execute(
            select(Cliente).where(
                Cliente.identificadores_qr.contains([{"codigo": cod_limpo}]),
                Cliente.id != cliente_id
            )
        )
        outro_cliente = res_unic.scalars().first()
        if outro_cliente:
            raise HTTPException(
                status_code=400, 
                detail=f"Este documento já está vinculado ao irmão {outro_cliente.nome}."
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. Busca o cliente
    res = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = res.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    docs = list(cliente.identificadores_qr or [])
    # Remove se já existia com o mesmo código para atualizar rótulo/tipo
    docs = [d for d in docs if d.get("codigo") != cod_limpo]

    doc_id = f"{dados.tipo.lower()}_{int(time.time())}"
    novo_doc = {
        "id": doc_id,
        "tipo": dados.tipo.upper(),
        "rotulo": dados.rotulo.strip() or dados.tipo.upper(),
        "codigo": cod_limpo,
        "cadastrado_em": datetime.utcnow().isoformat() + "Z",
        "ativo": True
    }
    docs.append(novo_doc)
    cliente.identificadores_qr = docs
    flag_modified(cliente, "identificadores_qr")

    await db.commit()
    await db.refresh(cliente)

    return {
        "sucesso": True,
        "mensagem": f"Documento '{novo_doc['rotulo']}' vinculado com sucesso!",
        "documento": novo_doc,
        "identificadores_qr": cliente.identificadores_qr
    }

@router.delete("/cliente/{cliente_id}/desvincular-documento/{doc_id}")
async def desvincular_documento_cliente(
    cliente_id: int,
    doc_id: str,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Remove uma credencial/documento vinculada do cliente.
    """
    res = await db.execute(select(Cliente).where(Cliente.id == cliente_id))
    cliente = res.scalars().first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    docs = list(cliente.identificadores_qr or [])
    docs_filtrados = [d for d in docs if d.get("id") != doc_id and d.get("codigo") != doc_id]

    if len(docs) == len(docs_filtrados):
        raise HTTPException(status_code=404, detail="Documento não encontrado para este cliente.")

    cliente.identificadores_qr = docs_filtrados
    flag_modified(cliente, "identificadores_qr")

    await db.commit()
    await db.refresh(cliente)

    return {
        "sucesso": True,
        "mensagem": "Documento desvinculado com sucesso.",
        "identificadores_qr": cliente.identificadores_qr
    }

class EnviarComprovanteRequest(BaseModel):
    canal: str = Field(default="ambos", pattern="^(whatsapp|email|ambos)$")
    email_destino: Optional[str] = None
    telefone_destino: Optional[str] = None

@router.post("/{comanda_id}/enviar-comprovante")
async def enviar_comprovante_comanda(
    comanda_id: int,
    dados: EnviarComprovanteRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Gera o resumo formatado da comanda fechada (itens, total e saldo atualizado)
    e retorna os links de WhatsApp/e-mail, além de disparar via SMTP quando configurado.
    """
    import urllib.parse
    import smtplib
    from email.message import EmailMessage
    from app.core.config import config

    servico = ComandaService(db, usuario.tenant_id)
    comp = await servico.gerar_comprovante_termico(comanda_id)

    res_com = await db.execute(
        select(Comanda).options(selectinload(Comanda.cliente)).where(Comanda.id == comanda_id)
    )
    comanda_obj = res_com.scalars().first()
    cli = comanda_obj.cliente if comanda_obj else None

    email_dest = (dados.email_destino or (cli.email if cli else "") or "").strip()
    tel_dest = (dados.telefone_destino or (cli.telefone if cli else "") or "").strip()
    tel_digitos = re.sub(r"\D", "", tel_dest)
    if tel_digitos and not tel_digitos.startswith("55") and len(tel_digitos) in (10, 11):
        tel_digitos = f"55{tel_digitos}"

    linhas_itens = "\n".join(
        f"• {it.quantidade}x {it.produto_nome} — R$ {it.subtotal:.2f}"
        for it in comp.itens
    )
    saldo_linha = (
        f"\nSaldo Atual na Carteira: R$ {comp.saldo_atual:.2f}"
        if comp.saldo_atual is not None
        else ""
    )
    resumo_texto = (
        f"E-Sigma ∴ Ágape — Comprovante Comanda #{comp.comanda_id}\n"
        f"Estabelecimento: {comp.estabelecimento_nome}\n"
        f"Cliente: {comp.cliente_nome or 'Consumidor'}\n"
        f"Data: {comp.data_hora}\n\n"
        f"Itens:\n{linhas_itens}\n\n"
        f"TOTAL: R$ {comp.total:.2f}\n"
        f"Pagamento: {comp.forma_pagamento.upper()}"
        f"{saldo_linha}\n\n"
        f"Obrigado pela Fraternidade!"
    )

    whatsapp_url = (
        f"https://wa.me/{tel_digitos}?text={urllib.parse.quote(resumo_texto)}"
        if tel_digitos
        else f"https://wa.me/?text={urllib.parse.quote(resumo_texto)}"
    )
    mailto_url = (
        f"mailto:{urllib.parse.quote(email_dest)}?subject={urllib.parse.quote(f'Comprovante Ágape - Comanda #{comp.comanda_id}')}&body={urllib.parse.quote(resumo_texto)}"
        if email_dest
        else None
    )

    enviado_email = False
    aviso_email = None
    if dados.canal in ("email", "ambos") and email_dest:
        if config.SMTP_HOST and config.SMTP_USER and config.SMTP_PASSWORD:
            try:
                msg = EmailMessage()
                msg["Subject"] = f"Comprovante Ágape — Comanda #{comp.comanda_id}"
                msg["From"] = config.SMTP_FROM
                msg["To"] = email_dest
                msg.set_content(resumo_texto)

                with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=8) as server:
                    if config.SMTP_TLS:
                        server.starttls()
                    server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                    server.send_message(msg)
                enviado_email = True
            except Exception as e:
                aviso_email = f"Falha ao enviar via SMTP ({e}). Use o fallback mailto."
        else:
            aviso_email = "SMTP não configurado no servidor; abrindo rascunho de e-mail."

    return {
        "sucesso": True,
        "email_destino": email_dest or None,
        "telefone_destino": tel_dest or None,
        "enviado_email": enviado_email,
        "aviso_email": aviso_email,
        "whatsapp_url": whatsapp_url,
        "mailto_url": mailto_url,
        "resumo_texto": resumo_texto,
    }
