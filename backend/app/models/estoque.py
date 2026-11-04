from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class LoteEstoque(Base):
    """Rastreamento de Lote e Validade (Armazém/Dispensa vs. Geladeira/Gôndola) no Salão de Ágapes."""
    __tablename__ = "agape_lotes_estoque"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    produto_id = Column(Integer, ForeignKey("agape_produtos.id"), nullable=False, index=True)
    
    numero_lote = Column(String(50), nullable=False, index=True)
    data_validade = Column(DateTime, nullable=False, index=True)
    data_fabricacao = Column(DateTime, nullable=True)
    
    quantidade_armazem = Column(Integer, nullable=False, default=0)
    quantidade_gondola = Column(Integer, nullable=False, default=0)
    preco_custo_unitario = Column(Float, nullable=False, default=0.0)
    
    ativo = Column(Boolean, default=True)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

    produto = relationship("Produto", back_populates="lotes")
    estabelecimento = relationship("Estabelecimento")
    movimentacoes = relationship("MovimentacaoEstoque", back_populates="lote")
