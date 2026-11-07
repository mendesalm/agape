from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime
from app.core.database import Base

class CatalogoMestreProduto(Base):
    """
    Catálogo Global/Mestre de Produtos gerenciado exclusivamente pelo SuperAdmin.
    Serve como repositório padrão de produtos para todos os bares e estabelecimentos (tenants).
    Possui fotos armazenadas localmente no próprio servidor em alta definição.
    """
    __tablename__ = "catalogo_mestre_produtos"

    id = Column(Integer, primary_key=True, index=True)
    
    # Código de Barras de Fábrica (EAN-13, EAN-8 ou GTIN)
    codigo_barras = Column(String(50), unique=True, index=True, nullable=False)
    
    # Dados de Identificação
    nome = Column(String(120), nullable=False, index=True)
    marca = Column(String(60), nullable=True, index=True)
    descricao = Column(String(255), nullable=True)
    
    # Classificação Estruturada
    categoria = Column(String(30), nullable=False, default="bebidas", index=True) # "bebidas", "alimentos", "outros"
    subcategoria = Column(String(30), nullable=False, default="alcoolicas", index=True) # "alcoolicas", "nao_alcoolicas", "snacks_petiscos", etc.
    tipo = Column(String(50), nullable=True, index=True) # "cervejas", "destilados", "refrigerantes", "aguas_minerais", etc.
    
    # Foto local no servidor
    foto_url = Column(String(255), nullable=True)
    
    # Precificação de Referência
    preco_custo_sugerido = Column(Float, nullable=False, default=0.0)
    preco_venda_sugerido = Column(Float, nullable=False, default=0.0)
    
    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
