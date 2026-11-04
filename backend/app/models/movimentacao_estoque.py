from sqlalchemy import Column, Integer, ForeignKey, Enum, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoMovimentacao(str, enum.Enum):
    ENTRADA_COMPRA = "entrada_compra"
    TRANSFERENCIA_GONDOLA = "transferencia_gondola"
    TRANSFERENCIA_ARMAZEM = "transferencia_armazem"
    SAIDA_VENDA = "saida_venda"
    PERDA_QUEBRA = "perda_quebra"
    AJUSTE_INVENTARIO = "ajuste_inventario"

class MovimentacaoEstoque(Base):
    __tablename__ = "agape_movimentacoes_estoque"

    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("agape_produtos.id"), nullable=False, index=True)
    lote_id = Column(Integer, ForeignKey("agape_lotes_estoque.id"), nullable=True, index=True)
    
    tipo = Column(Enum(TipoMovimentacao), nullable=False)
    quantidade = Column(Integer, nullable=False)
    local_origem = Column(String(30), nullable=True)
    local_destino = Column(String(30), nullable=True)
    motivo = Column(String(255), nullable=True)
    data_movimentacao = Column(DateTime, default=datetime.utcnow, nullable=False)

    produto = relationship("Produto", back_populates="movimentacoes")
    lote = relationship("LoteEstoque", back_populates="movimentacoes")
