from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import datetime

from app.core.database import obter_sessao
from app.schemas.comanda_schema import (
    ComandaCreate, 
    ComandaResponse, 
    ItemComandaCreate, 
    StatusComanda, 
    FecharComandaRequest,
    RecargaSaldoBarRequest,
    ComprovanteTermicoResponse
)
from app.services.comanda_service import ComandaService
from app.services.carteira_service import CarteiraService
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from pydantic import BaseModel

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
    carteira = await CarteiraService.adicionar_creditos_bar(
        db=db,
        cliente_id=dados.cliente_id,
        tenant_id=usuario.tenant_id,
        valor=dados.valor,
        forma_pagamento=dados.forma_pagamento,
        operador_nome=usuario.nome,
        observacao=dados.observacao
    )
    return {
        "mensagem": f"Crédito de R$ {dados.valor:.2f} lançado com sucesso na conta do bar.",
        "cliente_id": dados.cliente_id,
        "saldo_atual": carteira.saldo,
        "limite_fiado": getattr(carteira, "limite_fiado", 100.0)
    }
