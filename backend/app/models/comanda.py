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
    __tablename__ = "comandas"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("estabelecimentos.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("agape_clientes.id"), nullable=True, index=True)
    nome_cliente = Column(String(100), nullable=True) # Mantido para comandas anônimas (sem conta)
    identificador_cartao = Column(String(50), index=True, nullable=True) # Ex: Número do QR Code (removido unique=True global, unique deve ser por tenant)
    status = Column(Enum(StatusComanda), default=StatusComanda.ABERTA, nullable=False)
    data_abertura = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_fechamento = Column(DateTime, nullable=True)

    # Relacionamentos
    estabelecimento = relationship("Estabelecimento", back_populates="comandas")
    cliente = relationship("Cliente")
    itens = relationship("ItemComanda", back_populates="comanda", cascade="all, delete-orphan")

class StatusPreparoItem(str, enum.Enum):
    PENDENTE = "pendente"    # Pedido feito no Totem/Celular
    PREPARANDO = "preparando" # Barman começou a fazer
    PRONTO = "pronto"        # Aguardando retirada
    ENTREGUE = "entregue"    # Finalizado

class ItemComanda(Base):
    __tablename__ = "itens_comanda"

    id = Column(Integer, primary_key=True, index=True)
    comanda_id = Column(Integer, ForeignKey("comandas.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    valor_unitario = Column(Float, nullable=False) # Guardar o valor no momento da compra
    status = Column(Enum(StatusPreparoItem), default=StatusPreparoItem.PENDENTE, nullable=False)
    data_pedido = Column(DateTime, default=datetime.utcnow, nullable=False)

    comanda = relationship("Comanda", back_populates="itens")
    produto = relationship("Produto") # Apenas leitura para facilitar joins, se necessário
