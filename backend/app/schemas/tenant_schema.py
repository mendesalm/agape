from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.estabelecimento import ModoOperacao

class EstabelecimentoBase(BaseModel):
    nome_fantasia: str = Field(..., max_length=150)
    numero_loja: Optional[str] = Field(None, max_length=30)
    rito: Optional[str] = Field(None, max_length=80)
    cnpj: Optional[str] = Field(None, max_length=18)
    logo_url: Optional[str] = Field(None, max_length=255)
    modo_operacao: ModoOperacao = Field(default=ModoOperacao.HONESTY_MARKET, description="Modo operacional do bar")
    ativo: bool = True

class EstabelecimentoCreate(EstabelecimentoBase):
    # O Superadmin também passa os dados do primeiro dono (Webmaster) ao criar o bar
    admin_email: str
    admin_nome: str
    admin_senha: str

class EstabelecimentoUpdate(BaseModel):
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    logo_url: Optional[str] = None
    modo_operacao: Optional[ModoOperacao] = None
    ativo: Optional[bool] = None

class TenantStatusUpdate(BaseModel):
    ativo: bool = Field(..., description="True para ativar, False para suspender/bloquear o acesso")

class EstabelecimentoResponse(EstabelecimentoBase):
    id: int
    data_cadastro: Optional[datetime] = None

    class Config:
        from_attributes = True

class EstabelecimentoDetalhesResponse(EstabelecimentoResponse):
    total_produtos: int = 0
    total_comandas: int = 0
    total_usuarios: int = 0
    faturamento_total: float = 0.0
    admin_nome: Optional[str] = None
    admin_email: Optional[str] = None

class MetricasGlobaisSaaSResponse(BaseModel):
    total_estabelecimentos: int = 0
    total_estabelecimentos_ativos: int = 0
    total_estabelecimentos_bloqueados: int = 0
    total_produtos_cadastrados: int = 0
    total_comandas_abertas: int = 0
    total_clientes_cadastrados: int = 0
    faturamento_total_ecossistema: float = 0.0
