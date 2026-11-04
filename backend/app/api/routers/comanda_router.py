from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import obter_sessao
from app.schemas.comanda_schema import ComandaCreate, ComandaResponse, ItemComandaCreate, StatusComanda
from app.services.comanda_service import ComandaService
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario

router = APIRouter(prefix="/comandas", tags=["Comandas Eletrônicas (SaaS)"])

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

from pydantic import BaseModel

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
    Localiza a comanda aberta dele ou cria uma comanda nova automaticamente.
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
    """Adiciona um produto à comanda debitando o saldo no Event Sourcing de Estoque."""
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.adicionar_item(comanda_id, dados)

@router.patch("/{comanda_id}/fechar", response_model=ComandaResponse)
async def fechar_comanda(
    comanda_id: int, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """Altera o status da comanda para FECHADA."""
    servico = ComandaService(db, usuario.tenant_id)
    return await servico.fechar_comanda(comanda_id)
