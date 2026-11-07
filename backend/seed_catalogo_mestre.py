import asyncio
import os
import sys
from pathlib import Path

# Adiciona o diretório do backend ao sys.path para imports funcionarem em qualquer diretório de execução
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from sqlalchemy.future import select
from app.core.database import SessionLocal, engine, Base
from app.models.catalogo_mestre import CatalogoMestreProduto
from app.core.catalogo_padrao import PRODUTOS_POPULARES
import app.models # Carrega todos os modelos

async def executar_semeadura():
    print("=" * 70)
    print("Iniciando semeadura do Catálogo Global Mestre de Produtos...")
    print(f"Total de itens no pacote popular: {len(PRODUTOS_POPULARES)}")
    print("=" * 70)

    # 1. Garante que a tabela do catálogo mestre exista
    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: CatalogoMestreProduto.__table__.create(sync_conn, checkfirst=True))

    # 2. Insere ou atualiza produtos
    adicionados = 0
    atualizados = 0

    async with SessionLocal() as db:
        for item in PRODUTOS_POPULARES:
            query = select(CatalogoMestreProduto).where(
                CatalogoMestreProduto.codigo_barras == item["codigo_barras"]
            )
            res = await db.execute(query)
            existente = res.scalars().first()

            if existente:
                existente.nome = item["nome"]
                existente.marca = item["marca"]
                existente.categoria = item["categoria"]
                existente.subcategoria = item["subcategoria"]
                existente.tipo = item["tipo"]
                existente.foto_url = item["foto_url"]
                existente.preco_custo_sugerido = item["preco_custo_sugerido"]
                existente.preco_venda_sugerido = item["preco_venda_sugerido"]
                existente.descricao = item["descricao"]
                existente.ativo = True
                atualizados += 1
            else:
                novo = CatalogoMestreProduto(
                    codigo_barras=item["codigo_barras"],
                    nome=item["nome"],
                    marca=item["marca"],
                    categoria=item["categoria"],
                    subcategoria=item["subcategoria"],
                    tipo=item["tipo"],
                    foto_url=item["foto_url"],
                    preco_custo_sugerido=item["preco_custo_sugerido"],
                    preco_venda_sugerido=item["preco_venda_sugerido"],
                    descricao=item["descricao"],
                    ativo=True
                )
                db.add(novo)
                adicionados += 1

        await db.commit()

    print("\n" + "=" * 70)
    print("Sucesso! Catálogo povoado:")
    print(f" -> {adicionados} novos produtos adicionados")
    print(f" -> {atualizados} produtos existentes sincronizados/atualizados")
    print(f"Total no catálogo padrão: {len(PRODUTOS_POPULARES)} produtos")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(executar_semeadura())
