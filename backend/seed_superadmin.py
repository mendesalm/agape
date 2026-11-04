import asyncio
from sqlalchemy import text
from sqlalchemy.future import select
from app.core.database import engine, SessionLocal, Base
import app.models  # Garante que todos os modelos agape_* sejam registrados
from app.models.usuario import Usuario
from app.models.estabelecimento import Estabelecimento, ModoOperacao
from app.core.security import obter_hash_senha

HASH_SISTEMA_ESIGMA = "$2b$12$fjkzsU/viQH8kOEQh1wDXu1KuapJwiwGuzcO.HUlScnOIcmB9N4uS"
HASH_MENDESALM_ESIGMA = "$2b$12$w/e9Yag81fTe6vlN7Fh.zezcW2oUi5ROxE1vxQPLHmHyo8wfz02ry"
HASH_LOJA2181_HARMONIA = "$2b$12$CGvcrnkfSXhnY5U8SnjUTuVSnpP/Bd7yH4XIdx/qjnnYgbppwB7JK"

async def seed():
    # 1. Cria todas as tabelas agape_* no banco lojas_db se ainda não existirem
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("Tabelas 'agape_*' sincronizadas com sucesso no banco de dados lojas_db!")

    async with SessionLocal() as db:
        # 2. Sincroniza as Lojas existentes da tabela 'lojas' do lojas_db
        res_lojas = await db.execute(text("SELECT id, nome_loja, numero_loja, rito, cnpj, ativo FROM lojas ORDER BY id ASC"))
        lojas = res_lojas.mappings().all()
        print(f"Total de Lojas encontradas em 'lojas_db': {len(lojas)}")
        loja_2181_tenant_id = None
        for r in lojas:
            est = (await db.execute(select(Estabelecimento).where(Estabelecimento.loja_esigma_id == r["id"]))).scalars().first()
            if not est:
                nome = f"{r['nome_loja']} Nº {r['numero_loja']}" if r["numero_loja"] else r["nome_loja"]
                est = Estabelecimento(
                    loja_esigma_id=r["id"],
                    nome_fantasia=nome,
                    numero_loja=str(r["numero_loja"]) if r["numero_loja"] else None,
                    rito=r["rito"],
                    cnpj=r["cnpj"],
                    ativo=bool(r["ativo"]) if r["ativo"] is not None else True,
                    modo_operacao=ModoOperacao.HIBRIDO
                )
                db.add(est)
                await db.flush()
            if str(r["numero_loja"]) == "2181":
                loja_2181_tenant_id = est.id
        await db.commit()

        # 3. Sincroniza SuperAdmins do e-Sigma / Harmonia com os hashes oficiais
        superadmins = [
            ("SuperAdmin Sigma", "sistema@e-sigma.app", HASH_SISTEMA_ESIGMA, "SUPERADMIN", None),
            ("SuperAdmin Mendes (CIM 272875)", "mendesalm@gmail.com", HASH_MENDESALM_ESIGMA, "SUPERADMIN", loja_2181_tenant_id),
            ("SuperAdmin Ágape", "admin@e-sigma.app", HASH_SISTEMA_ESIGMA, "SUPERADMIN", None),
        ]
        if loja_2181_tenant_id:
            superadmins.extend([
                ("Estação Ágape - ARLS 2181", "loja2181@agape.e-sigma.app", HASH_LOJA2181_HARMONIA, "WEBMASTER", loja_2181_tenant_id),
                ("Estação Harmonia/Ágape - ARLS 2181", "loja2181@harmonia.e-sigma.app", HASH_LOJA2181_HARMONIA, "WEBMASTER", loja_2181_tenant_id),
            ])

        for nome, email, s_hash, cargo, t_id in superadmins:
            res_u = await db.execute(select(Usuario).where(Usuario.email == email))
            u = res_u.scalars().first()
            if not u:
                db.add(Usuario(
                    nome=nome,
                    email=email,
                    senha_hash=s_hash,
                    cargo=cargo,
                    tipo_vinculo="SISTEMA" if cargo == "SUPERADMIN" else "OFICIAL_LOJA",
                    tenant_id=t_id,
                    ativo=True
                ))
                print(f" -> Usuário '{email}' ({cargo}) criado com hash oficial do e-Sigma!")
            else:
                u.senha_hash = s_hash
                u.cargo = cargo
                if t_id and not u.tenant_id:
                    u.tenant_id = t_id
                print(f" -> Usuário '{email}' ({cargo}) atualizado com hash oficial do e-Sigma!")

        await db.commit()

if __name__ == "__main__":
    asyncio.run(seed())
