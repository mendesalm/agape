from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import time
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel

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
        "comanda_aberta": comanda_info
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
