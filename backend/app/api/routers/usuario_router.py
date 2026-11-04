from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.core.database import obter_sessao
from app.api.dependencias import exigir_webmaster
from app.models.usuario import Usuario
from app.schemas.usuario_schema import UsuarioCreate, UsuarioResponse
from app.core.security import obter_hash_senha

router = APIRouter(prefix="/usuarios", tags=["Gestão de Funcionários"])

@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def criar_usuario(
    dados: UsuarioCreate, 
    db: AsyncSession = Depends(obter_sessao),
    dono: Usuario = Depends(exigir_webmaster)
):
    """(WEBMASTER) Cria um novo funcionário (Garçom/Gerente) no próprio bar."""
    
    if dados.cargo not in ["GERENTE", "GARCOM", "WEBMASTER"]:
        raise HTTPException(status_code=400, detail="Cargo inválido.")

    # Verifica duplicidade de email
    resultado = await db.execute(select(Usuario).where(Usuario.email == dados.email))
    if resultado.scalars().first():
        raise HTTPException(status_code=400, detail="E-mail já está em uso.")

    novo_usuario = Usuario(
        tenant_id=dono.tenant_id,
        nome=dados.nome,
        email=dados.email,
        senha_hash=obter_hash_senha(dados.senha),
        cargo=dados.cargo
    )
    db.add(novo_usuario)
    await db.commit()
    await db.refresh(novo_usuario)
    
    return novo_usuario

@router.get("/", response_model=List[UsuarioResponse])
async def listar_funcionarios(
    db: AsyncSession = Depends(obter_sessao),
    dono: Usuario = Depends(exigir_webmaster)
):
    """(WEBMASTER) Lista os funcionários do bar."""
    
    resultado = await db.execute(select(Usuario).where(Usuario.tenant_id == dono.tenant_id))
    return resultado.scalars().all() # type: ignore
