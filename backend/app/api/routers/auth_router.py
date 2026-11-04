import asyncio
import urllib.request
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from app.core.database import obter_sessao
from app.core.security import verificar_senha, criar_token_acesso
from app.models.usuario import Usuario
from app.models.estabelecimento import Estabelecimento
from app.api.dependencias import obter_usuario_logado

router = APIRouter(prefix="/auth", tags=["Autenticação & SSO e-Sigma"])

# Hashes alternativos do SuperAdmin no ecossistema (Harmonia / e-Sigma)
HASHES_SUPERADMIN_ECOSSISTEMA = [
    "$2b$12$fjkzsU/viQH8kOEQh1wDXu1KuapJwiwGuzcO.HUlScnOIcmB9N4uS", # sistema@e-sigma.app (esigma)
    "$2b$12$h5sxgt1TDwRKVKi.k7.MP.anix7omCgKUrBOo9Syp0UXsdJenoxu.", # sistema@e-sigma.app (harmonia)
    "$2b$12$w/e9Yag81fTe6vlN7Fh.zezcW2oUi5ROxE1vxQPLHmHyo8wfz02ry", # mendesalm@gmail.com (esigma)
]

class SsoTokenRequest(BaseModel):
    sso_token: str

@router.post("/login")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(obter_sessao)
):
    """
    Autenticação unificada do e-Sigma Ágape:
    1. Aceita operadores do Ágape ('agape_usuarios', incluindo não maçons/familiares e SuperAdmins).
    2. Aceita login por CIM, CPF ou E-mail de Obreiros ('obreiros' no lojas_db) ou SuperAdmin do e-Sigma/Harmonia.
    """
    identificador = form_data.username.strip()
    identificador_lower = identificador.lower()

    # Tolerância de alias para contas de estação (loja2181@harmonia.e-sigma.app <-> loja2181@agape.e-sigma.app)
    resultado = await db.execute(select(Usuario).where(Usuario.email == identificador_lower))
    usuario = resultado.scalars().first()

    # Se digitou CIM 272875, resolve para mendesalm@gmail.com (SuperAdmin)
    if not usuario and identificador == "272875":
        res_mendes = await db.execute(select(Usuario).where(Usuario.email == "mendesalm@gmail.com"))
        usuario = res_mendes.scalars().first()

    # Se não achou em agape_usuarios, verifica se é um Obreiro em 'obreiros' no lojas_db
    if not usuario:
        try:
            termo_limpo = identificador.replace(".", "").replace("-", "")
            res_ob = await db.execute(
                text("""
                    SELECT o.id, o.nome_completo, o.email, o.cpf, o.cim, o.hash_senha,
                           ola.loja_id
                    FROM obreiros o
                    LEFT JOIN obreiro_loja_associacoes ola ON ola.obreiro_id = o.id
                    WHERE LOWER(COALESCE(o.email, '')) = :email
                       OR TRIM(COALESCE(o.cim, '')) = :raw
                       OR REPLACE(REPLACE(COALESCE(o.cpf, ''), '.', ''), '-', '') = :limpo
                    LIMIT 1
                """),
                {"email": identificador_lower, "raw": identificador, "limpo": termo_limpo}
            )
            row_ob = res_ob.mappings().first()
            if row_ob and row_ob["hash_senha"] and verificar_senha(form_data.password, row_ob["hash_senha"]):
                tenant_id = None
                if row_ob["loja_id"]:
                    est = (await db.execute(select(Estabelecimento).where(Estabelecimento.loja_esigma_id == row_ob["loja_id"]))).scalars().first()
                    if est:
                        tenant_id = est.id
                email_ob = (row_ob["email"] or f"cim{row_ob['cim']}@agape.e-sigma.app").strip().lower()
                cargo_ob = "SUPERADMIN" if (str(row_ob["cim"]) == "272875" or email_ob == "mendesalm@gmail.com") else "WEBMASTER"
                usuario = Usuario(
                    nome=row_ob["nome_completo"],
                    email=email_ob,
                    cpf=row_ob["cpf"],
                    senha_hash=row_ob["hash_senha"],
                    cargo=cargo_ob,
                    tipo_vinculo="OFICIAL_LOJA",
                    obreiro_responsavel_id=row_ob["id"],
                    tenant_id=tenant_id,
                    ativo=True
                )
                db.add(usuario)
                await db.commit()
                await db.refresh(usuario)
        except Exception:
            pass

    if not usuario:
        raise HTTPException(status_code=400, detail="E-mail/CIM ou senha incorretos")

    # Verifica a senha no hash do usuário ou nos hashes globais de SuperAdmin (Harmonia / e-Sigma)
    senha_valida = verificar_senha(form_data.password, usuario.senha_hash)
    if not senha_valida and usuario.cargo == "SUPERADMIN":
        for h in HASHES_SUPERADMIN_ECOSSISTEMA:
            if verificar_senha(form_data.password, h):
                senha_valida = True
                break

    if not senha_valida:
        raise HTTPException(status_code=400, detail="E-mail/CIM ou senha incorretos")

    if not usuario.ativo:
        raise HTTPException(status_code=400, detail="Acesso de operador desativado para este turno.")

    token = criar_token_acesso(
        dados={
            "sub": str(usuario.id),
            "tenant_id": usuario.tenant_id,
            "cargo": usuario.cargo
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "cargo": usuario.cargo,
            "tenant_id": usuario.tenant_id
        }
    }


@router.post("/sso")
async def login_sso_esigma(
    dados: SsoTokenRequest,
    db: AsyncSession = Depends(obter_sessao)
):
    """
    Valida um token SSO vindo do Hub e-Sigma ou do Módulo Lojas (?sso_token=...)
    contra a API do e-Sigma e emite a sessão do Ágape.
    """
    def _validar_remoto(jwt_token: str):
        for url in ["http://127.0.0.1:8000/api/v1/auth/validate", "https://e-sigma.app/api/v1/auth/validate"]:
            try:
                req = urllib.request.Request(url, headers={"Authorization": f"Bearer {jwt_token}"})
                with urllib.request.urlopen(req, timeout=4) as resp:
                    if resp.status == 200:
                        return json.loads(resp.read().decode("utf-8"))
            except Exception:
                continue
        return None

    info = await asyncio.to_thread(_validar_remoto, dados.sso_token)
    if not info or "usuario" not in info:
        raise HTTPException(status_code=401, detail="Token SSO inválido ou expirado.")

    u_info = info["usuario"]
    email = (u_info.get("email") or "").strip().lower()
    nome = u_info.get("nome") or email or "Usuário e-Sigma"
    cim = str(u_info.get("cim") or "").strip()
    role = (u_info.get("role") or "").lower()

    is_super = email in ("sistema@e-sigma.app", "mendesalm@gmail.com") or cim == "272875" or role in ("super_admin", "admin")
    cargo = "SUPERADMIN" if is_super else "WEBMASTER"

    res_u = await db.execute(select(Usuario).where(Usuario.email == email))
    usuario = res_u.scalars().first()

    if not usuario:
        # Tenta descobrir a Loja padrão da sessão
        res_est = await db.execute(select(Estabelecimento).where(Estabelecimento.numero_loja == "2181"))
        est_padrao = res_est.scalars().first()
        usuario = Usuario(
            nome=nome,
            email=email,
            senha_hash=HASHES_SUPERADMIN_ECOSSISTEMA[0],
            cargo=cargo,
            tipo_vinculo="SISTEMA" if is_super else "OFICIAL_LOJA",
            tenant_id=est_padrao.id if est_padrao else 1,
            ativo=True
        )
        db.add(usuario)
        await db.commit()
        await db.refresh(usuario)

    token = criar_token_acesso(
        dados={
            "sub": str(usuario.id),
            "tenant_id": usuario.tenant_id,
            "cargo": usuario.cargo
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "email": usuario.email,
            "cargo": usuario.cargo,
            "tenant_id": usuario.tenant_id
        }
    }


@router.get("/me")
async def obter_meu_perfil(usuario: Usuario = Depends(obter_usuario_logado)):
    """Retorna os dados do usuário autenticado e seu nível de acesso."""
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "cargo": usuario.cargo,
        "tipo_vinculo": usuario.tipo_vinculo,
        "tenant_id": usuario.tenant_id,
        "ativo": usuario.ativo
    }
