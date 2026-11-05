from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.core.database import obter_sessao
from app.core.security import decodificar_token_acesso
from app.models.usuario import Usuario
from app.models.estabelecimento import Estabelecimento

# Esquema de autenticação do FastAPI (Extrai o token do cabeçalho Authorization: Bearer <token>)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def obter_usuario_logado(
    token: str = Depends(oauth2_scheme),
    x_estabelecimento_id: Optional[str] = Header(default=None, alias="X-Estabelecimento-ID"),
    db: AsyncSession = Depends(obter_sessao)
) -> Usuario:
    try:
        payload = decodificar_token_acesso(token)
        usuario_id = payload.get("sub")
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

    # Resolução dinâmica de Âmbito (Loja Ativa enviada no cabeçalho X-Estabelecimento-ID)
    if x_estabelecimento_id and str(x_estabelecimento_id).strip().isdigit():
        req_tenant_id = int(str(x_estabelecimento_id).strip())
        if usuario.cargo == "SUPERADMIN":
            usuario.tenant_id = req_tenant_id
        elif usuario.tenant_id == req_tenant_id:
            usuario.tenant_id = req_tenant_id
        else:
            # Verifica se o Obreiro possui vínculo com esta Loja em obreiro_loja_associacoes
            try:
                res_assoc = await db.execute(
                    text("""
                        SELECT 1
                        FROM obreiro_loja_associacoes ola
                        JOIN obreiros o ON o.id = ola.obreiro_id
                        JOIN agape_estabelecimentos ae ON ae.loja_esigma_id = ola.loja_id
                        WHERE ae.id = :tid
                          AND (LOWER(COALESCE(o.email, '')) = :email OR o.id = :ob_id)
                        LIMIT 1
                    """),
                    {
                        "tid": req_tenant_id,
                        "email": (usuario.email or "").lower(),
                        "ob_id": usuario.obreiro_responsavel_id or -1
                    }
                )
                if res_assoc.first():
                    usuario.tenant_id = req_tenant_id
            except Exception:
                pass

    # Caso um SuperAdmin ainda não tenha tenant_id definido para operações de Loja, vincula à Loja 2181 por padrão
    if not usuario.tenant_id:
        res_padrao = await db.execute(
            select(Estabelecimento).where(Estabelecimento.numero_loja == "2181")
        )
        est_padrao = res_padrao.scalars().first()
        if not est_padrao:
            res_first = await db.execute(select(Estabelecimento).order_by(Estabelecimento.id.asc()).limit(1))
            est_padrao = res_first.scalars().first()
        if est_padrao:
            usuario.tenant_id = est_padrao.id
        
    # [HERANÇA SIGMA]: Trava implacável de inadimplência SaaS
    if usuario.tenant_id and usuario.cargo != "SUPERADMIN":
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
