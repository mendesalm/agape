from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.comanda import StatusComanda

# Schemas para Item da Comanda
class ItemComandaBase(BaseModel):
    produto_id: int
    quantidade: int = Field(default=1, gt=0)

class ItemComandaCreate(ItemComandaBase):
    pass

class ItemComandaResponse(ItemComandaBase):
    id: int
    comanda_id: int
    produto_nome: Optional[str] = None
    valor_unitario: float
    data_pedido: datetime
    status: Optional[str] = None

    class Config:
        from_attributes = True

# Schemas para Comanda
class ComandaBase(BaseModel):
    nome_cliente: Optional[str] = Field(None, max_length=100)
    identificador_cartao: Optional[str] = Field(None, max_length=50)

class ComandaCreate(ComandaBase):
    pass

class ComandaUpdateStatus(BaseModel):
    status: StatusComanda

class ComandaResponse(ComandaBase):
    id: int
    status: StatusComanda
    data_abertura: datetime
    data_fechamento: Optional[datetime] = None
    itens: List[ItemComandaResponse] = []
    total: float = 0.0 # Calculado em tempo de resposta

    class Config:
        from_attributes = True
