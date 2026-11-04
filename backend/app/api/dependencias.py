from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import obter_sessao
from app.core.security import decodificar_token_acesso
from app.models.usuario import Usuario

# Esquema de autenticação do FastAPI (Extrai o token do cabeçalho Authorization: Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def obter_usuario_logado(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(obter_sessao)
) -> Usuario:
    try:
        payload = decodificar_token_acesso(token)
        usuario_id = payload.get("sub") # Convencionalmente, 'sub' é o ID do sujeito (usuário)
        if usuario_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Não foi possível validar as credenciais. Erro: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    resultado = await db.execute(select(Usuario).where(Usuario.id == int(usuario_id)))
    usuario = resultado.scalars().first()
    
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
        
    if not usuario.ativo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")
        
    # [HERANÇA SIGMA]: Trava implacável de inadimplência SaaS
    if usuario.tenant_id:
        from app.models.estabelecimento import Estabelecimento
        resultado_tenant = await db.execute(select(Estabelecimento).where(Estabelecimento.id == usuario.tenant_id))
        estabelecimento = resultado_tenant.scalars().first()
        if estabelecimento and not estabelecimento.ativo:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Assinatura SaaS pendente ou bloqueada. Regularize o pagamento para restaurar o acesso.",
            )

    return usuario

def exigir_superadmin(usuario: Usuario = Depends(obter_usuario_logado)):
    if usuario.cargo != "SUPERADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado. Apenas o Superusuário do sistema pode realizar esta ação.")
    return usuario

def exigir_webmaster(usuario: Usuario = Depends(obter_usuario_logado)):
    if usuario.cargo not in ["SUPERADMIN", "WEBMASTER"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado. Apenas o Dono do Estabelecimento (Webmaster) tem permissão.")
    return usuario

