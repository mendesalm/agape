from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CatalogoMestreBase(BaseModel):
    codigo_barras: str = Field(..., max_length=50, description="EAN-13, EAN-8 ou GTIN de fábrica")
    nome: str = Field(..., max_length=120)
    marca: Optional[str] = Field(None, max_length=60)
    categoria: str = Field(default="bebidas", max_length=30)
    subcategoria: str = Field(default="alcoolicas", max_length=30)
    tipo: Optional[str] = Field(None, max_length=50)
    preco_custo_sugerido: float = Field(default=0.0, ge=0)
    preco_venda_sugerido: float = Field(default=0.0, ge=0)
    foto_url: Optional[str] = Field(None, max_length=255)
    descricao: Optional[str] = Field(None, max_length=255)
    ativo: bool = True

class CatalogoMestreCreate(CatalogoMestreBase):
    pass

class CatalogoMestreUpdate(BaseModel):
    codigo_barras: Optional[str] = None
    nome: Optional[str] = None
    marca: Optional[str] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    tipo: Optional[str] = None
    preco_custo_sugerido: Optional[float] = None
    preco_venda_sugerido: Optional[float] = None
    foto_url: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None

class CatalogoMestreResponse(CatalogoMestreBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True
