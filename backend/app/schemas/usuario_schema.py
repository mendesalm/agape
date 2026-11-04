from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UsuarioBase(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr
    cargo: str = Field(..., description="Cargos aceitos: GERENTE, GARCOM, WEBMASTER")
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)

class UsuarioResponse(UsuarioBase):
    id: int
    tenant_id: Optional[int]

    class Config:
        from_attributes = True
