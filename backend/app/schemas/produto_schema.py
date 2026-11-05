from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.produto import CategoriaProduto, SubcategoriaProduto

class LoteEstoqueBase(BaseModel):
    numero_lote: str = Field(..., max_length=50)
    data_validade: datetime
    data_fabricacao: Optional[datetime] = None
    preco_custo_unitario: float = Field(default=0.0, ge=0)

class LoteEstoqueResponse(LoteEstoqueBase):
    id: int
    produto_id: int
    tenant_id: int
    quantidade_gondola: int = 0
    quantidade_armazem: int = 0
    dias_para_vencer: int = 0
    status_validade: str = "ok" # "ok", "vencendo", "vencido"
    ativo: bool = True

    class Config:
        from_attributes = True

class LoteEntradaCreate(LoteEstoqueBase):
    quantidade: int = Field(..., gt=0, description="Quantidade de itens recebidos")
    destino: str = Field(default="armazem", pattern="^(armazem|gondola)$", description="Destino inicial: armazem ou gondola")

class TransferenciaEstoqueRequest(BaseModel):
    quantidade: int = Field(..., gt=0, description="Quantidade a transferir")
    lote_id: Optional[int] = Field(None, description="Opcional. Se omitido, aplica algoritmo FEFO automaticamente")

class PerdaLoteRequest(BaseModel):
    quantidade: int = Field(..., gt=0)
    tipo_perda: str = Field(default="quebra", description="quebra, vencimento, avaria_transporte, descarte_operacional, outro")
    justificativa: Optional[str] = Field(None, max_length=255)
    motivo: Optional[str] = Field(None, max_length=255)
    local: str = Field(default="gondola", pattern="^(gondola|armazem)$")
    lote_id: Optional[int] = None

# Schema Base
class ProdutoBase(BaseModel):
    nome: str = Field(..., max_length=100)
    descricao: Optional[str] = Field(None, max_length=255)
    foto_url: Optional[str] = Field(None, max_length=255)
    codigo_barras: Optional[str] = Field(None, max_length=50, description="EAN-13 / GTIN de fábrica")
    qr_code_tag: Optional[str] = Field(None, max_length=500, description="QR Code de fábrica impresso na lata/garrafa/embalagem ou tag de identificação")
    data_validade: Optional[datetime] = None
    preco_custo: float = Field(default=0.0, ge=0)
    preco_venda: float = Field(..., gt=0)
    
    # Taxonomia Estruturada (Enums e Classificadores)
    categoria: CategoriaProduto = Field(default=CategoriaProduto.BEBIDAS, description="Categoria Macro")
    subcategoria: SubcategoriaProduto = Field(default=SubcategoriaProduto.ALCOOLICAS, description="Subcategoria")
    tipo: Optional[str] = Field(None, max_length=50, description="Ex: cervejas, refrigerantes, sucos")
    marca: Optional[str] = Field(None, max_length=50, description="Ex: Skol, Heineken, Coca-Cola Zero")
    
    ativo: bool = True
    estoque_minimo_gondola: int = Field(default=5, ge=0)
    estoque_minimo_armazem: int = Field(default=15, ge=0)

class ProdutoCreate(ProdutoBase):
    estoque_inicial_armazem: int = Field(default=0, ge=0)
    estoque_inicial_gondola: int = Field(default=0, ge=0)
    numero_lote_inicial: Optional[str] = Field("LOTE-INICIAL", max_length=50)

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    foto_url: Optional[str] = None
    codigo_barras: Optional[str] = None
    qr_code_tag: Optional[str] = None
    data_validade: Optional[datetime] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    categoria: Optional[CategoriaProduto] = None
    subcategoria: Optional[SubcategoriaProduto] = None
    tipo: Optional[str] = None
    marca: Optional[str] = None
    ativo: Optional[bool] = None
    estoque_minimo_gondola: Optional[int] = None
    estoque_minimo_armazem: Optional[int] = None

class ProdutoResponse(ProdutoBase):
    id: int
    tenant_id: int
    
    # Visão Consolidada dos 2 Níveis de Estoque
    quantidade_gondola: int = 0
    quantidade_armazem: int = 0
    quantidade_estoque: int = 0  # Total geral (gondola + armazem)
    
    # Flags de Alerta
    alerta_reposicao_gondola: bool = False
    alerta_compra_armazem: bool = False
    
    # Lotes associados ordenados por FEFO
    lotes: List[LoteEstoqueResponse] = []

    class Config:
        from_attributes = True

class AlertaEstoqueGeral(BaseModel):
    reposicoes_pendentes: List[ProdutoResponse] = []
    compras_necessarias: List[ProdutoResponse] = []
    lotes_vencendo: List[LoteEstoqueResponse] = []
    lotes_vencidos: List[LoteEstoqueResponse] = []
