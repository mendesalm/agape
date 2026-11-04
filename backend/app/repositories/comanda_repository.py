from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.models.comanda import Comanda, ItemComanda, StatusComanda
from app.schemas.comanda_schema import ComandaCreate

class ComandaRepository:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def listar_todas(self, status: Optional[StatusComanda] = None, skip: int = 0, limit: int = 100) -> List[Comanda]:
        query = select(Comanda).options(selectinload(Comanda.itens).selectinload(ItemComanda.produto)).where(Comanda.tenant_id == self.tenant_id)
        if status:
            query = query.where(Comanda.status == status)
        query = query.offset(skip).limit(limit)
        
        resultado = await self.db.execute(query)
        return resultado.scalars().all() # type: ignore

    async def buscar_por_id(self, comanda_id: int) -> Optional[Comanda]:
        resultado = await self.db.execute(
            select(Comanda).options(selectinload(Comanda.itens).selectinload(ItemComanda.produto))
            .where(Comanda.id == comanda_id, Comanda.tenant_id == self.tenant_id)
        )
        return resultado.scalars().first()
        
    async def buscar_por_cartao(self, identificador_cartao: str) -> Optional[Comanda]:
        resultado = await self.db.execute(
            select(Comanda).options(selectinload(Comanda.itens).selectinload(ItemComanda.produto))
            .where(
                Comanda.identificador_cartao == identificador_cartao, 
                Comanda.status == StatusComanda.ABERTA,
                Comanda.tenant_id == self.tenant_id
            )
        )
        return resultado.scalars().first()

    async def criar(self, dados: ComandaCreate) -> Comanda:
        nova_comanda = Comanda(
            tenant_id=self.tenant_id,
            nome_cliente=dados.nome_cliente,
            identificador_cartao=dados.identificador_cartao
        )
        self.db.add(nova_comanda)
        await self.db.commit()
        await self.db.refresh(nova_comanda)
        return nova_comanda

    async def adicionar_item(self, comanda_id: int, produto_id: int, quantidade: int, valor_unitario: float) -> ItemComanda:
        novo_item = ItemComanda(
            comanda_id=comanda_id,
            produto_id=produto_id,
            quantidade=quantidade,
            valor_unitario=valor_unitario
        )
        self.db.add(novo_item)
        await self.db.commit()
        await self.db.refresh(novo_item)
        return novo_item

    async def atualizar_status(self, comanda: Comanda, novo_status: StatusComanda) -> Comanda:
        comanda.status = novo_status
        if novo_status == StatusComanda.FECHADA:
            comanda.data_fechamento = datetime.utcnow()
            
        await self.db.commit()
        await self.db.refresh(comanda)
        return comanda
