import enum
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class CategoriaProduto(str, enum.Enum):
    BEBIDAS = "bebidas"
    ALIMENTOS = "alimentos"
    TABACOS_CONVENIENCIA = "tabacos_conveniencia"
    OUTROS = "outros"

class SubcategoriaProduto(str, enum.Enum):
    ALCOOLICAS = "alcoolicas"
    NAO_ALCOOLICAS = "nao_alcoolicas"
    SNACKS_PETISCOS = "snacks_petiscos"
    REFEICOES = "refeicoes"
    SOBREMESAS = "sobremesas"
    OUTROS = "outros"

class Produto(Base):
    __tablename__ = "agape_produtos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    
    nome = Column(String(100), nullable=False, index=True)
    descricao = Column(String(255), nullable=True)
    foto_url = Column(String(255), nullable=True)
    data_validade = Column(DateTime, nullable=True)
    preco_custo = Column(Float, nullable=False, default=0.0)
    preco_venda = Column(Float, nullable=False)

    categoria = Column(Enum(CategoriaProduto), nullable=False, default=CategoriaProduto.BEBIDAS, index=True)
    subcategoria = Column(Enum(SubcategoriaProduto), nullable=False, default=SubcategoriaProduto.ALCOOLICAS, index=True)
    tipo = Column(String(50), nullable=True, index=True)
    marca = Column(String(50), nullable=True, index=True)
    
    ativo = Column(Boolean, default=True)

    codigo_barras = Column(String(50), nullable=True, index=True)
    qr_code_tag = Column(String(500), nullable=True, index=True)

    estoque_minimo_gondola = Column(Integer, nullable=False, default=5)
    estoque_minimo_armazem = Column(Integer, nullable=False, default=15)

    estabelecimento = relationship("Estabelecimento", back_populates="produtos")
    lotes = relationship("LoteEstoque", back_populates="produto", cascade="all, delete-orphan", order_by="LoteEstoque.data_validade.asc()")
    movimentacoes = relationship("MovimentacaoEstoque", back_populates="produto", cascade="all, delete-orphan")
