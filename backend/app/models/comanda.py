from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class StatusComanda(str, enum.Enum):
    ABERTA = "aberta"
    FECHADA = "fechada"
    CANCELADA = "cancelada"

class Comanda(Base):
    __tablename__ = "agape_comandas"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("agape_clientes.id"), nullable=True, index=True)
    nome_cliente = Column(String(100), nullable=True)
    identificador_cartao = Column(String(50), index=True, nullable=True)
    status = Column(Enum(StatusComanda), default=StatusComanda.ABERTA, nullable=False)
    data_abertura = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_fechamento = Column(DateTime, nullable=True)

    # Auditoria de Fechamento / Venda Direta
    operador_id = Column(Integer, ForeignKey("agape_usuarios.id"), nullable=True, index=True)
    forma_pagamento = Column(String(30), nullable=True) # pix, dinheiro, cartao_debito, cartao_credito, saldo_bar_fiado
    valor_total = Column(Float, default=0.0)
    troco = Column(Float, default=0.0)
    observacao = Column(String(255), nullable=True)

    estabelecimento = relationship("Estabelecimento", back_populates="comandas")
    cliente = relationship("Cliente")
    operador = relationship("Usuario")
    itens = relationship("ItemComanda", back_populates="comanda", cascade="all, delete-orphan")

class StatusPreparoItem(str, enum.Enum):
    PENDENTE = "pendente"
    PREPARANDO = "preparando"
    PRONTO = "pronto"
    ENTREGUE = "entregue"

class ItemComanda(Base):
    __tablename__ = "agape_itens_comanda"

    id = Column(Integer, primary_key=True, index=True)
    comanda_id = Column(Integer, ForeignKey("agape_comandas.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("agape_produtos.id"), nullable=False)
    operador_id = Column(Integer, ForeignKey("agape_usuarios.id"), nullable=True, index=True) # Quem bipou no balcão (auditoria)
    quantidade = Column(Integer, nullable=False, default=1)
    valor_unitario = Column(Float, nullable=False)
    status = Column(Enum(StatusPreparoItem), default=StatusPreparoItem.PENDENTE, nullable=False)
    data_pedido = Column(DateTime, default=datetime.utcnow, nullable=False)

    comanda = relationship("Comanda", back_populates="itens")
    produto = relationship("Produto")
