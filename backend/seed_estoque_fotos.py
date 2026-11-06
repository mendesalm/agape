import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Catálogo com fotos HD otimizadas para produtos de bar e salão de ágapes
PRODUTOS_SEED = [
    {
        "nome": "Cerveja Heineken Lata 350ml",
        "descricao": "Cerveja puro malte Premium Lager holandesa, lata 350ml gelada.",
        "foto_url": "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 4.80,
        "preco_venda": 9.00,
        "categoria": "BEBIDAS",
        "subcategoria": "ALCOOLICAS",
        "tipo": "cervejas",
        "marca": "Heineken",
        "codigo_barras": "7891991000826",
        "qr_code_tag": "AGAPE-BEB-001",
        "estoque_minimo_gondola": 12,
        "estoque_minimo_armazem": 48,
        "lotes": [
            {
                "numero_lote": "L-HEIN-24A",
                "validade_dias": 90,
                "qtd_gondola": 18,
                "qtd_armazem": 72,
                "custo": 4.80
            },
            {
                "numero_lote": "L-HEIN-24B",
                "validade_dias": 150,
                "qtd_gondola": 0,
                "qtd_armazem": 96,
                "custo": 5.10
            }
        ]
    },
    {
        "nome": "Cerveja Stella Artois 330ml",
        "descricao": "Cerveja puro malte belga estilo Bohemian Pilsner, long neck 330ml.",
        "foto_url": "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 5.20,
        "preco_venda": 10.00,
        "categoria": "BEBIDAS",
        "subcategoria": "ALCOOLICAS",
        "tipo": "cervejas",
        "marca": "Stella Artois",
        "codigo_barras": "7891991295321",
        "qr_code_tag": "AGAPE-BEB-002",
        "estoque_minimo_gondola": 10,
        "estoque_minimo_armazem": 36,
        "lotes": [
            {
                "numero_lote": "L-STEL-01",
                "validade_dias": 60,
                "qtd_gondola": 4, # Alerta de reposição no bar! (4 < 10)
                "qtd_armazem": 48,
                "custo": 5.20
            }
        ]
    },
    {
        "nome": "Cerveja Corona Extra 330ml",
        "descricao": "Cerveja tipo American Lager mexicana refrescante, long neck 330ml.",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 6.10,
        "preco_venda": 12.00,
        "categoria": "BEBIDAS",
        "subcategoria": "ALCOOLICAS",
        "tipo": "cervejas",
        "marca": "Corona",
        "codigo_barras": "7501064191307",
        "qr_code_tag": "AGAPE-BEB-003",
        "estoque_minimo_gondola": 8,
        "estoque_minimo_armazem": 24,
        "lotes": [
            {
                "numero_lote": "L-COR-09",
                "validade_dias": 120,
                "qtd_gondola": 12,
                "qtd_armazem": 36,
                "custo": 6.10
            }
        ]
    },
    {
        "nome": "Coca-Cola Original 350ml",
        "descricao": "Refrigerante de cola tradicional, lata 350ml gelada.",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 3.20,
        "preco_venda": 6.00,
        "categoria": "BEBIDAS",
        "subcategoria": "NAO_ALCOOLICAS",
        "tipo": "refrigerantes",
        "marca": "Coca-Cola",
        "codigo_barras": "7894900010015",
        "qr_code_tag": "AGAPE-BEB-004",
        "estoque_minimo_gondola": 12,
        "estoque_minimo_armazem": 48,
        "lotes": [
            {
                "numero_lote": "L-COCA-99",
                "validade_dias": 180,
                "qtd_gondola": 24,
                "qtd_armazem": 72,
                "custo": 3.20
            }
        ]
    },
    {
        "nome": "Coca-Cola Sem Açúcar 350ml",
        "descricao": "Refrigerante de cola zero calorias e sem açúcar, lata 350ml.",
        "foto_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 3.20,
        "preco_venda": 6.00,
        "categoria": "BEBIDAS",
        "subcategoria": "NAO_ALCOOLICAS",
        "tipo": "refrigerantes",
        "marca": "Coca-Cola Zero",
        "codigo_barras": "7894900700015",
        "qr_code_tag": "AGAPE-BEB-005",
        "estoque_minimo_gondola": 12,
        "estoque_minimo_armazem": 36,
        "lotes": [
            {
                "numero_lote": "L-CZER-01",
                "validade_dias": 140,
                "qtd_gondola": 15,
                "qtd_armazem": 48,
                "custo": 3.20
            }
        ]
    },
    {
        "nome": "Guaraná Antarctica Lata 350ml",
        "descricao": "Refrigerante brasileiro clássico feito com extrato natural de guaraná, lata 350ml.",
        "foto_url": "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 2.90,
        "preco_venda": 6.00,
        "categoria": "BEBIDAS",
        "subcategoria": "NAO_ALCOOLICAS",
        "tipo": "refrigerantes",
        "marca": "Antarctica",
        "codigo_barras": "7891991000857",
        "qr_code_tag": "AGAPE-BEB-006",
        "estoque_minimo_gondola": 10,
        "estoque_minimo_armazem": 36,
        "lotes": [
            {
                "numero_lote": "L-GUA-12",
                "validade_dias": 180,
                "qtd_gondola": 20,
                "qtd_armazem": 60,
                "custo": 2.90
            }
        ]
    },
    {
        "nome": "Água Mineral Crystal sem Gás 500ml",
        "descricao": "Água mineral pura e cristalina de fonte natural, garrafa 500ml.",
        "foto_url": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 1.50,
        "preco_venda": 4.00,
        "categoria": "BEBIDAS",
        "subcategoria": "NAO_ALCOOLICAS",
        "tipo": "aguas_minerais",
        "marca": "Crystal",
        "codigo_barras": "7894900530018",
        "qr_code_tag": "AGAPE-BEB-007",
        "estoque_minimo_gondola": 15,
        "estoque_minimo_armazem": 40,
        "lotes": [
            {
                "numero_lote": "L-AGU-44",
                "validade_dias": 300,
                "qtd_gondola": 30,
                "qtd_armazem": 80,
                "custo": 1.50
            }
        ]
    },
    {
        "nome": "Energético Red Bull Energy Drink 250ml",
        "descricao": "Bebida energética mundial com taurina, cafeína e vitaminas do complexo B.",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 7.50,
        "preco_venda": 14.00,
        "categoria": "BEBIDAS",
        "subcategoria": "NAO_ALCOOLICAS",
        "tipo": "energeticos",
        "marca": "Red Bull",
        "codigo_barras": "90162602",
        "qr_code_tag": "AGAPE-BEB-008",
        "estoque_minimo_gondola": 10,
        "estoque_minimo_armazem": 24,
        "lotes": [
            {
                "numero_lote": "L-RB-2026",
                "validade_dias": 240,
                "qtd_gondola": 2, # Alerta de baixo estoque no bar!
                "qtd_armazem": 12,
                "custo": 7.50
            }
        ]
    },
    {
        "nome": "Whisky Black Label 12 Anos (Dose 50ml)",
        "descricao": "Dose de Johnnie Walker Black Label 12 anos servida com gelo ou pura.",
        "foto_url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 9.00,
        "preco_venda": 22.00,
        "categoria": "BEBIDAS",
        "subcategoria": "ALCOOLICAS",
        "tipo": "destilados",
        "marca": "Johnnie Walker",
        "codigo_barras": "5000267024257",
        "qr_code_tag": "AGAPE-BEB-009",
        "estoque_minimo_gondola": 5,
        "estoque_minimo_armazem": 10,
        "lotes": [
            {
                "numero_lote": "L-JW-BL01",
                "validade_dias": 720,
                "qtd_gondola": 8,
                "qtd_armazem": 14,
                "custo": 9.00
            }
        ]
    },
    {
        "nome": "Castanha de Caju Torrada e Salgada 50g",
        "descricao": "Petisco nobre com castanhas de caju selecionadas, crocantes e tostadas.",
        "foto_url": "https://images.unsplash.com/photo-1509358271058-acd22cc93898?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 4.50,
        "preco_venda": 9.00,
        "categoria": "ALIMENTOS",
        "subcategoria": "SNACKS_PETISCOS",
        "tipo": "snacks",
        "marca": "Da Roça",
        "codigo_barras": "7896001001122",
        "qr_code_tag": "AGAPE-ALIM-001",
        "estoque_minimo_gondola": 10,
        "estoque_minimo_armazem": 30,
        "lotes": [
            {
                "numero_lote": "L-CAJU-03",
                "validade_dias": 90,
                "qtd_gondola": 15,
                "qtd_armazem": 45,
                "custo": 4.50
            }
        ]
    },
    {
        "nome": "Amendoim Japonês Crocante 100g",
        "descricao": "Amendoim com casca crocante temperada com molho shoyu especial.",
        "foto_url": "https://images.unsplash.com/photo-1569460275917-72354e6bd911?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 2.50,
        "preco_venda": 5.50,
        "categoria": "ALIMENTOS",
        "subcategoria": "SNACKS_PETISCOS",
        "tipo": "snacks",
        "marca": "Dori",
        "codigo_barras": "7896005800455",
        "qr_code_tag": "AGAPE-ALIM-002",
        "estoque_minimo_gondola": 8,
        "estoque_minimo_armazem": 20,
        "lotes": [
            {
                "numero_lote": "L-AMD-11",
                "validade_dias": 120,
                "qtd_gondola": 0, # Item ESGOTADO no bar para teste do filtro de reposição!
                "qtd_armazem": 10,
                "custo": 2.50
            }
        ]
    },
    {
        "nome": "Água Tônica Antarctica 350ml",
        "descricao": "Água tônica refrescante com extrato de quinino, perfeita pura ou com gin.",
        "foto_url": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
        "preco_custo": 3.10,
        "preco_venda": 6.50,
        "categoria": "BEBIDAS",
        "subcategoria": "NAO_ALCOOLICAS",
        "tipo": "refrigerantes",
        "marca": "Antarctica",
        "codigo_barras": "7891991001403",
        "qr_code_tag": "AGAPE-BEB-010",
        "estoque_minimo_gondola": 6,
        "estoque_minimo_armazem": 24,
        "lotes": [
            {
                "numero_lote": "L-TON-05",
                "validade_dias": 150,
                "qtd_gondola": 12,
                "qtd_armazem": 24,
                "custo": 3.10
            }
        ]
    }
]

async def popular_banco(nome_banco: str, prefixo: str, tenant_id: int):
    url = f"postgresql+asyncpg://barsys:BsysT23754RthfFg@69.62.89.211:5432/{nome_banco}"
    engine = create_async_engine(url)
    
    t_prod = f"{prefixo}produtos"
    t_lote = f"{prefixo}lotes_estoque"
    t_mov = f"{prefixo}movimentacoes_estoque"
    t_itens = f"{prefixo}itens_comanda"
    
    print(f"\n==================================================")
    print(f"Povoando Banco: {nome_banco} (Tabelas: {t_prod}, {t_lote})")
    print(f"Tenant ID: {tenant_id}")
    print(f"==================================================")
    
    async with engine.begin() as conn:
        print("Limpando dados antigos de teste do tenant...")
        if "agape_" in prefixo:
            await conn.execute(text(f"DELETE FROM {t_mov} WHERE tenant_id = :tid"), {"tid": tenant_id})
        else:
            await conn.execute(text(f"DELETE FROM {t_mov} WHERE produto_id IN (SELECT id FROM {t_prod} WHERE tenant_id = :tid)"), {"tid": tenant_id})
        await conn.execute(text(f"DELETE FROM {t_itens} WHERE produto_id IN (SELECT id FROM {t_prod} WHERE tenant_id = :tid)"), {"tid": tenant_id})
        await conn.execute(text(f"DELETE FROM {t_lote} WHERE tenant_id = :tid"), {"tid": tenant_id})
        await conn.execute(text(f"DELETE FROM {t_prod} WHERE tenant_id = :tid"), {"tid": tenant_id})
        
        agora = datetime.now(timezone.utc).replace(tzinfo=None)
        for p in PRODUTOS_SEED:
            res = await conn.execute(text(f"""
                INSERT INTO {t_prod} (
                    tenant_id, nome, descricao, foto_url, data_validade,
                    preco_custo, preco_venda, categoria, subcategoria,
                    tipo, marca, ativo, codigo_barras, qr_code_tag,
                    estoque_minimo_gondola, estoque_minimo_armazem
                ) VALUES (
                    :tid, :nome, :descricao, :foto_url, :validade,
                    :preco_custo, :preco_venda, :categoria, :subcategoria,
                    :tipo, :marca, true, :codigo_barras, :qr_code_tag,
                    :min_gondola, :min_armazem
                ) RETURNING id
            """), {
                "tid": tenant_id,
                "nome": p["nome"],
                "descricao": p["descricao"],
                "foto_url": p["foto_url"],
                "validade": agora + timedelta(days=p["lotes"][0]["validade_dias"]),
                "preco_custo": p["preco_custo"],
                "preco_venda": p["preco_venda"],
                "categoria": p["categoria"],
                "subcategoria": p["subcategoria"],
                "tipo": p["tipo"],
                "marca": p["marca"],
                "codigo_barras": p["codigo_barras"],
                "qr_code_tag": p["qr_code_tag"],
                "min_gondola": p["estoque_minimo_gondola"],
                "min_armazem": p["estoque_minimo_armazem"]
            })
            prod_id = res.scalar()
            
            # Inserir Lotes para o produto
            for lote in p["lotes"]:
                validade_lote = agora + timedelta(days=lote["validade_dias"])
                fabricacao = agora - timedelta(days=30)
                await conn.execute(text(f"""
                    INSERT INTO {t_lote} (
                        tenant_id, produto_id, numero_lote, data_validade,
                        data_fabricacao, quantidade_armazem, quantidade_gondola,
                        preco_custo_unitario, ativo, data_cadastro
                    ) VALUES (
                        :tid, :pid, :num_lote, :dt_val,
                        :dt_fab, :qtd_arm, :qtd_gon,
                        :custo, true, :dt_cad
                    )
                """), {
                    "tid": tenant_id,
                    "pid": prod_id,
                    "num_lote": lote["numero_lote"],
                    "dt_val": validade_lote,
                    "dt_fab": fabricacao,
                    "qtd_arm": lote["qtd_armazem"],
                    "qtd_gon": lote["qtd_gondola"],
                    "custo": lote["custo"],
                    "dt_cad": agora
                })
            
            print(f"  [OK] Cadastrado #{prod_id}: {p['nome']} -> R$ {p['preco_venda']:.2f}")
    
    await engine.dispose()
    print(f"Sucesso ao repovoar {nome_banco}!\n")

async def main():
    # 1. Popular lojas_db (usado pelo Agape - tabelas agape_*)
    await popular_banco("lojas_db", "agape_", 1)
    
    # 2. Popular barix (usado pelo Barix - tabelas sem prefixo)
    await popular_banco("barix", "", 1)

if __name__ == "__main__":
    asyncio.run(main())
