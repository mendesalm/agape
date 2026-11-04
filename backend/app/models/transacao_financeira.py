from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoTransacao(str, enum.Enum):
    RECEITA = "receita"
    DESPESA = "despesa"

class TransacaoFinanceira(Base):
    __tablename__ = "agape_transacoes_financeiras"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    tipo = Column(Enum(TipoTransacao), nullable=False)
    valor = Column(Float, nullable=False)
    descricao = Column(String(255), nullable=True)
    origem_id = Column(Integer, nullable=True)
    data_transacao = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    estabelecimento = relationship("Estabelecimento")
