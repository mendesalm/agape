from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.core.database import obter_sessao
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.models.comanda import ItemComanda, Comanda, StatusPreparoItem
from app.models.produto import Produto

router = APIRouter(prefix="/kds", tags=["Kitchen Display System (Fila de Pedidos)"])

# ==========================================
# SCHEMAS (Pydantic)
# ==========================================
class ItemKDSResponse(BaseModel):
    id: int
    comanda_id: int
    nome_cliente: str | None
    produto_nome: str
    quantidade: int
    status: StatusPreparoItem
    data_pedido: datetime
    
    class Config:
        from_attributes = True

class AtualizarStatusItem(BaseModel):
    novo_status: StatusPreparoItem

# ==========================================
# ROTAS
# ==========================================
@router.get("/pendentes", response_model=List[ItemKDSResponse])
async def listar_pedidos_pendentes(
    usuario_atual: Usuario = Depends(obter_usuario_logado),
    db: AsyncSession = Depends(obter_sessao)
):
    """
    Retorna a fila de produção do bar (Itens PENDENTES ou PREPARANDO).
    Usado na tela do Barman (Totem de Cozinha).
    """
    if not usuario_atual.tenant_id:
        raise HTTPException(status_code=403, detail="Usuário não associado a um bar.")

    # Busca os itens que pertencem às comandas abertas deste tenant e que não foram entregues
    resultado = await db.execute(
        select(ItemComanda)
        .join(Comanda)
        .options(
            selectinload(ItemComanda.produto),
            selectinload(ItemComanda.comanda)
        )
        .where(
            Comanda.tenant_id == usuario_atual.tenant_id,
            ItemComanda.status.in_([StatusPreparoItem.PENDENTE, StatusPreparoItem.PREPARANDO, StatusPreparoItem.PRONTO])
        )
        .order_by(ItemComanda.data_pedido.asc()) # Mais antigos primeiro (Fila FIFO)
    )
    itens = resultado.scalars().all()

    resposta = []
    for item in itens:
        resposta.append({
            "id": item.id,
            "comanda_id": item.comanda.id,
            "nome_cliente": item.comanda.nome_cliente,
            "produto_nome": item.produto.nome,
            "quantidade": item.quantidade,
            "status": item.status,
            "data_pedido": item.data_pedido
        })
        
    return resposta

@router.patch("/itens/{item_id}/status")
async def atualizar_status_item(
    item_id: int,
    payload: AtualizarStatusItem,
    usuario_atual: Usuario = Depends(obter_usuario_logado),
    db: AsyncSession = Depends(obter_sessao)
):
    """
    O Barman usa esta rota para avançar o pedido (Ex: PENDENTE -> PREPARANDO -> ENTREGUE).
    """
    # Confirma se o item pertence a uma comanda do bar atual
    resultado = await db.execute(
        select(ItemComanda).join(Comanda).where(
            ItemComanda.id == item_id,
            Comanda.tenant_id == usuario_atual.tenant_id
        )
    )
    item = resultado.scalars().first()

    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado ou não pertence ao seu estabelecimento.")

    item.status = payload.novo_status
    await db.commit()
    
    return {"mensagem": f"Status atualizado para {payload.novo_status.value}", "item_id": item.id}
