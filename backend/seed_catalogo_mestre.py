import asyncio
from sqlalchemy.future import select
from app.core.database import SessionLocal, engine, Base
from app.models.catalogo_mestre import CatalogoMestreProduto
import app.models

PRODUTOS_SEMENTE = [
    {
        "codigo_barras": "7891991000845",
        "nome": "Cerveja Heineken Puro Malte 350ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.80,
        "preco_venda_sugerido": 9.00,
        "descricao": "Lager puro malte de coloração dourada e sabor marcante."
    },
    {
        "codigo_barras": "7891991010356",
        "nome": "Cerveja Heineken Long Neck 330ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.20,
        "preco_venda_sugerido": 10.00,
        "descricao": "Heineken Long Neck 330ml em garrafa verde de vidro."
    },
    {
        "codigo_barras": "7891991300853",
        "nome": "Cerveja Spaten Munich Helles 350ml",
        "marca": "Spaten",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.20,
        "preco_venda_sugerido": 8.00,
        "descricao": "Cerveja puro malte tradicional de Munique com amargor suave."
    },
    {
        "codigo_barras": "7891991015696",
        "nome": "Cerveja Amstel Puro Malte 350ml",
        "marca": "Amstel",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.60,
        "preco_venda_sugerido": 7.00,
        "descricao": "Cerveja puro malte de receita holandesa, leve e refrescante."
    },
    {
        "codigo_barras": "7891991001347",
        "nome": "Cerveja Brahma Duplo Malte 350ml",
        "marca": "Brahma",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.70,
        "preco_venda_sugerido": 7.00,
        "descricao": "Combinação surpreendente do malte Pilsner com o malte Munich."
    },
    {
        "codigo_barras": "7501064191659",
        "nome": "Cerveja Corona Extra 330ml",
        "marca": "Corona",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.50,
        "preco_venda_sugerido": 11.00,
        "descricao": "Cerveja clara mexicana, ideal para consumo com fatia de limão."
    },
    {
        "codigo_barras": "7894900010015",
        "nome": "Refrigerante Coca-Cola Original 350ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.00,
        "descricao": "O clássico refrigerante de cola em lata 350ml."
    },
    {
        "codigo_barras": "7894900700046",
        "nome": "Refrigerante Coca-Cola Sem Açúcar 350ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.00,
        "descricao": "Sabor autêntico de Coca-Cola com zero calorias."
    },
    {
        "codigo_barras": "7891991000814",
        "nome": "Refrigerante Guaraná Antarctica 350ml",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Guaraná natural da Amazônia em lata 350ml."
    },
    {
        "codigo_barras": "7898080640015",
        "nome": "Água Mineral Sem Gás 500ml",
        "marca": "Crystal",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "aguas_minerais",
        "foto_url": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 1.50,
        "preco_venda_sugerido": 4.00,
        "descricao": "Água mineral natural sem gás, pura e cristalina."
    },
    {
        "codigo_barras": "7898080640022",
        "nome": "Água Mineral Com Gás 500ml",
        "marca": "Crystal",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "aguas_minerais",
        "foto_url": "https://images.unsplash.com/photo-1559839914-17aae19cec71?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 1.60,
        "preco_venda_sugerido": 4.50,
        "descricao": "Água mineral natural levemente gaseificada."
    },
    {
        "codigo_barras": "90162909",
        "nome": "Energético Red Bull Energy Drink 250ml",
        "marca": "Red Bull",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "energeticos",
        "foto_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.50,
        "preco_venda_sugerido": 14.00,
        "descricao": "Bebida energética funcional que dá asas quando você precisa."
    }
]

async def seed_catalogo():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as db:
        for p in PRODUTOS_SEMENTE:
            res = await db.execute(
                select(CatalogoMestreProduto).where(CatalogoMestreProduto.codigo_barras == p["codigo_barras"])
            )
            existente = res.scalars().first()
            if not existente:
                novo = CatalogoMestreProduto(**p)
                db.add(novo)
                print(f"[+] Produto adicionado ao Catálogo Mestre: {p['nome']} (EAN: {p['codigo_barras']})")
            else:
                print(f"[i] Produto já existe: {p['nome']}")
        await db.commit()
    print("✓ Catálogo Mestre semeado com sucesso!")

if __name__ == "__main__":
    asyncio.run(seed_catalogo())
