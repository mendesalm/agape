import asyncio
import urllib.request
import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
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
    sso_token: Optional[str] = None
    token: Optional[str] = None


async def _montar_ambitos_usuario(db: AsyncSession, usuario: Usuario) -> Dict[str, Any]:
    """
    Descobre todos os âmbitos de acesso disponíveis para o usuário autenticado:
    - Âmbito Global do Sistema (se for SUPERADMIN)
    - Lojas Maçônicas vinculadas ao usuário (ex: Loja 2181 em agape_estabelecimentos e obreiro_loja_associacoes)
    """
    is_superadmin = usuario.cargo == "SUPERADMIN"
    lojas_map: Dict[int, Dict[str, Any]] = {}

    # 1. Loja diretamente vinculada ao registro do usuário
    if usuario.tenant_id:
        res_est = await db.execute(select(Estabelecimento).where(Estabelecimento.id == usuario.tenant_id))
        est = res_est.scalars().first()
        if est:
            lojas_map[est.id] = {
                "id": est.id,
                "nome_fantasia": est.nome_fantasia,
                "numero_loja": est.numero_loja,
                "rito": est.rito,
                "loja_esigma_id": est.loja_esigma_id
            }

    # 2. Lojas associadas ao Obreiro em obreiro_loja_associacoes (pluri-filiação ou vínculo maçônico)
    try:
        res_assoc = await db.execute(
            text("""
                SELECT ae.id, ae.nome_fantasia, ae.numero_loja, ae.rito, ae.loja_esigma_id
                FROM obreiro_loja_associacoes ola
                JOIN obreiros o ON o.id = ola.obreiro_id
                JOIN agape_estabelecimentos ae ON ae.loja_esigma_id = ola.loja_id
                WHERE LOWER(COALESCE(o.email, '')) = :email
                   OR o.id = :ob_id
                ORDER BY ae.numero_loja ASC
            """),
            {
                "email": (usuario.email or "").lower(),
                "ob_id": usuario.obreiro_responsavel_id or -1
            }
        )
        for r in res_assoc.mappings().all():
            lojas_map[r["id"]] = {
                "id": r["id"],
                "nome_fantasia": r["nome_fantasia"],
                "numero_loja": r["numero_loja"],
                "rito": r["rito"],
                "loja_esigma_id": r["loja_esigma_id"]
            }
    except Exception:
        pass

    # 3. Se for SuperAdmin e ainda não tiver a Loja 2181 na lista de atalhos diretos, inclui a Loja 2181
    if is_superadmin and not any(str(v.get("numero_loja")) == "2181" for v in lojas_map.values()):
        res_2181 = await db.execute(select(Estabelecimento).where(Estabelecimento.numero_loja == "2181"))
        est_2181 = res_2181.scalars().first()
        if est_2181:
            lojas_map[est_2181.id] = {
                "id": est_2181.id,
                "nome_fantasia": est_2181.nome_fantasia,
                "numero_loja": est_2181.numero_loja,
                "rito": est_2181.rito,
                "loja_esigma_id": est_2181.loja_esigma_id
            }

    lojas_vinculadas = list(lojas_map.values())
    loja_padrao = lojas_map.get(usuario.tenant_id) if usuario.tenant_id else (lojas_vinculadas[0] if lojas_vinculadas else None)

    ambitos: List[Dict[str, Any]] = []
    for lj in lojas_vinculadas:
        ambitos.append({
            "tipo": "LOJA",
            "tenant_id": lj["id"],
            "numero_loja": lj["numero_loja"],
            "titulo": lj["nome_fantasia"],
            "subtitulo": f"Salão de Ágapes • Estoque (Armazém & Display) e Comandas da Loja Nº {lj['numero_loja']}" if lj.get("numero_loja") else "Salão de Ágapes • Estoque (Armazém & Display) e Comandas"
        })

    if is_superadmin:
        ambitos.append({
            "tipo": "SISTEMA",
            "tenant_id": loja_padrao["id"] if loja_padrao else usuario.tenant_id,
            "numero_loja": None,
            "titulo": "Administração Global do Sistema (e-Sigma SaaS)",
            "subtitulo": "Visão SuperAdmin • Gerenciar todas as Lojas Maçônicas, Instâncias e Métricas Globais"
        })

    return {
        "is_superadmin": is_superadmin,
        "loja_atual": loja_padrao,
        "lojas_vinculadas": lojas_vinculadas,
        "ambitos_disponiveis": ambitos,
        "requer_selecao_ambito": len(ambitos) > 1
    }


@router.post("/login")
async def login(
    request: Request,
    db: AsyncSession = Depends(obter_sessao)
):
    """
    Autenticação unificada do e-Sigma Ágape (suporta JSON e OAuth2 Form-Data):
    1. Aceita operadores do Ágape ('agape_usuarios', incluindo não maçons/familiares e SuperAdmins).
    2. Aceita login por CIM, CPF ou E-mail de Obreiros ('obreiros' no lojas_db) ou SuperAdmin do e-Sigma/Harmonia.
    3. Retorna os âmbitos disponíveis (Sistema Global vs Loja Específica, ex: Loja 2181).
    """
    identificador = ""
    senha = ""

    content_type = (request.headers.get("content-type") or "").lower()
    if "application/json" in content_type:
        body = await request.json()
        identificador = (body.get("email") or body.get("username") or body.get("identificador") or body.get("email_or_cim") or "").strip()
        senha = body.get("senha") or body.get("password") or ""
    else:
        form = await request.form()
        identificador = str(form.get("username") or form.get("email") or "").strip()
        senha = str(form.get("password") or form.get("senha") or "")

    if not identificador or not senha:
        raise HTTPException(status_code=400, detail="Informe seu E-mail/CIM e senha.")

    identificador_lower = identificador.lower()

    resultado = await db.execute(
        select(Usuario).where(
            (Usuario.email == identificador_lower) |
            (Usuario.email == f"{identificador_lower}@gmail.com") |
            (Usuario.email == f"{identificador_lower}@e-sigma.app")
        )
    )
    usuario = resultado.scalars().first()

    # Se digitou CIM 272875 ou usuario mendesalm, resolve para mendesalm@gmail.com (SuperAdmin)
    if not usuario and identificador_lower in ["272875", "mendesalm", "mendes"]:
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
            if row_ob and row_ob["hash_senha"] and verificar_senha(senha, row_ob["hash_senha"]):
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
    senha_valida = verificar_senha(senha, usuario.senha_hash)
    if not senha_valida and usuario.cargo == "SUPERADMIN":
        for h in HASHES_SUPERADMIN_ECOSSISTEMA:
            if verificar_senha(senha, h):
                senha_valida = True
                break

    if not senha_valida:
        raise HTTPException(status_code=400, detail="E-mail/CIM ou senha incorretos")

    if not usuario.ativo:
        raise HTTPException(status_code=400, detail="Acesso de operador desativado para este turno.")

    contexto_ambitos = await _montar_ambitos_usuario(db, usuario)
    tenant_efetivo = usuario.tenant_id or (contexto_ambitos["loja_atual"]["id"] if contexto_ambitos["loja_atual"] else None)

    token = criar_token_acesso(
        dados={
            "sub": str(usuario.id),
            "tenant_id": tenant_efetivo,
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
            "is_superadmin": contexto_ambitos["is_superadmin"],
            "tenant_id": tenant_efetivo,
            "estabelecimento_id": tenant_efetivo,
            "loja_atual": contexto_ambitos["loja_atual"],
            "lojas_vinculadas": contexto_ambitos["lojas_vinculadas"],
            "ambitos_disponiveis": contexto_ambitos["ambitos_disponiveis"],
            "requer_selecao_ambito": contexto_ambitos["requer_selecao_ambito"]
        }
    }


@router.post("/sso")
async def login_sso_esigma(
    dados: SsoTokenRequest,
    db: AsyncSession = Depends(obter_sessao)
):
    """
    Valida um token SSO vindo do Hub e-Sigma ou do Módulo Lojas (?sso_token=... ou ?token=...)
    contra a API do e-Sigma e emite a sessão do Ágape com os âmbitos disponíveis.
    """
    token_recebido = (dados.sso_token or dados.token or "").strip()
    if not token_recebido:
        raise HTTPException(status_code=400, detail="Token SSO não informado.")

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

    info = await asyncio.to_thread(_validar_remoto, token_recebido)
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

    contexto_ambitos = await _montar_ambitos_usuario(db, usuario)
    tenant_efetivo = usuario.tenant_id or (contexto_ambitos["loja_atual"]["id"] if contexto_ambitos["loja_atual"] else None)

    token = criar_token_acesso(
        dados={
            "sub": str(usuario.id),
            "tenant_id": tenant_efetivo,
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
            "is_superadmin": contexto_ambitos["is_superadmin"],
            "tenant_id": tenant_efetivo,
            "estabelecimento_id": tenant_efetivo,
            "loja_atual": contexto_ambitos["loja_atual"],
            "lojas_vinculadas": contexto_ambitos["lojas_vinculadas"],
            "ambitos_disponiveis": contexto_ambitos["ambitos_disponiveis"],
            "requer_selecao_ambito": contexto_ambitos["requer_selecao_ambito"]
        }
    }


@router.get("/me")
async def obter_meu_perfil(
    usuario: Usuario = Depends(obter_usuario_logado),
    db: AsyncSession = Depends(obter_sessao)
):
    """Retorna os dados do usuário autenticado, a Loja ativa no âmbito atual e os âmbitos disponíveis."""
    contexto_ambitos = await _montar_ambitos_usuario(db, usuario)
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "cargo": usuario.cargo,
        "is_superadmin": contexto_ambitos["is_superadmin"],
        "tipo_vinculo": usuario.tipo_vinculo,
        "tenant_id": usuario.tenant_id,
        "estabelecimento_id": usuario.tenant_id,
        "loja_atual": contexto_ambitos["loja_atual"],
        "lojas_vinculadas": contexto_ambitos["lojas_vinculadas"],
        "ambitos_disponiveis": contexto_ambitos["ambitos_disponiveis"],
        "ativo": usuario.ativo
    }
