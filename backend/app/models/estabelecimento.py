import enum
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class ModoOperacao(str, enum.Enum):
    HONESTY_MARKET = "honesty_market" # Autoatendimento fraternal (Celular do Irmão / Familiar)
    HIBRIDO = "hibrido"               # Permite Celular + Atendimento Assistido no Balcão do Ágape
    RESTRITO = "restrito"             # Apenas Operador de Balcão / Garçom

class Estabelecimento(Base):
    """Representa o Salão de Ágapes de uma Loja Maçônica no e-Sigma Ágape."""
    __tablename__ = "agape_estabelecimentos"

    id = Column(Integer, primary_key=True, index=True)
    loja_esigma_id = Column(Integer, unique=True, index=True, nullable=True) # ID na tabela 'lojas' do lojas_db
    nome_fantasia = Column(String(100), nullable=False)
    numero_loja = Column(String(20), nullable=True)
    rito = Column(String(50), nullable=True)
    cnpj = Column(String(18), unique=True, index=True, nullable=True)
    logo_url = Column(String(255), nullable=True)
    ativo = Column(Boolean, default=True)
    modo_operacao = Column(Enum(ModoOperacao), default=ModoOperacao.HIBRIDO, nullable=False)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

    # Relacionamentos
    produtos = relationship("Produto", back_populates="estabelecimento", cascade="all, delete-orphan")
    comandas = relationship("Comanda", back_populates="estabelecimento", cascade="all, delete-orphan")
