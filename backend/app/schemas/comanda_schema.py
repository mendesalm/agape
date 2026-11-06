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
    cliente_id: Optional[int] = None

class ComandaUpdateStatus(BaseModel):
    status: StatusComanda

class DadosCartaoCredito(BaseModel):
    numero: Optional[str] = None
    nome_titular: Optional[str] = None
    validade: Optional[str] = None
    cvv: Optional[str] = None
    salvar_cartao: Optional[bool] = False

class FecharComandaRequest(BaseModel):
    forma_pagamento: str = Field(default="pix", description="pix, dinheiro, cartao_debito, cartao_credito, saldo_bar_fiado")
    valor_recebido: Optional[float] = Field(None, ge=0)
    troco: Optional[float] = Field(0.0, ge=0)
    observacao: Optional[str] = Field(None, max_length=255)
    cliente_id: Optional[int] = None
    dados_cartao: Optional[DadosCartaoCredito] = None

class RecargaSaldoBarRequest(BaseModel):
    cliente_id: int
    valor: float = Field(..., gt=0, description="Valor da recarga de saldo no bar")
    forma_pagamento: str = Field(default="pix", description="pix, dinheiro, cartao_debito, cartao_credito, cartao, boleto")
    observacao: Optional[str] = Field(None, max_length=255)
    dados_cartao: Optional[DadosCartaoCredito] = None

class ComandaResponse(ComandaBase):
    id: int
    tenant_id: int
    cliente_id: Optional[int] = None
    operador_id: Optional[int] = None
    forma_pagamento: Optional[str] = None
    status: StatusComanda
    data_abertura: datetime
    data_fechamento: Optional[datetime] = None
    itens: List[ItemComandaResponse] = []
    total: float = 0.0 # Calculado em tempo de resposta
    troco: Optional[float] = 0.0
    observacao: Optional[str] = None

    class Config:
        from_attributes = True

class ComprovanteTermicoResponse(BaseModel):
    comanda_id: int
    data_hora: datetime
    estabelecimento_nome: str
    loja_numero: Optional[str] = None
    operador_nome: Optional[str] = None
    cliente_nome: Optional[str] = None
    cliente_documento: Optional[str] = None
    tipo_consumidor: Optional[str] = None
    itens: List[dict] = []
    total: float
    forma_pagamento: str
    saldo_anterior: Optional[float] = None
    saldo_atual: Optional[float] = None
    limite_fiado: float = 100.0
    texto_escpos: str # Cupom 58mm / 80mm formatado
