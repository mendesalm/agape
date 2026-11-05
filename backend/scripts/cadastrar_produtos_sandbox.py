import asyncio
from app.core.database import SessionLocal
from app.models.produto import Produto, CategoriaProduto, SubcategoriaProduto
from app.models.estoque import LoteEstoque
from datetime import datetime, timedelta
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        novos = [
            {
                "nome": "Cerveja Heineken Lata 350ml",
                "codigo_barras": "7891991000826",
                "qr_code_tag": "HEIN-350",
                "preco_venda": 8.50,
                "preco_custo": 4.50,
                "marca": "Heineken",
                "categoria": CategoriaProduto.BEBIDAS,
                "subcategoria": SubcategoriaProduto.ALCOOLICAS,
                "tenant_id": 1
            },
            {
                "nome": "Coca-Cola Original Lata 350ml",
                "codigo_barras": "7894900010015",
                "qr_code_tag": "COCA-350",
                "preco_venda": 6.00,
                "preco_custo": 3.00,
                "marca": "Coca-Cola",
                "categoria": CategoriaProduto.BEBIDAS,
                "subcategoria": SubcategoriaProduto.NAO_ALCOOLICAS,
                "tenant_id": 1
            },
            {
                "nome": "Água Mineral Crystal 500ml",
                "codigo_barras": "7891000100100",
                "qr_code_tag": "AGUA-500",
                "preco_venda": 4.00,
                "preco_custo": 1.50,
                "marca": "Crystal",
                "categoria": CategoriaProduto.BEBIDAS,
                "subcategoria": SubcategoriaProduto.NAO_ALCOOLICAS,
                "tenant_id": 1
            }
        ]

        for dados in novos:
            res = await db.execute(
                select(Produto).where(
                    (Produto.codigo_barras == dados["codigo_barras"]) |
                    (Produto.qr_code_tag == dados["qr_code_tag"])
                )
            )
            prod = res.scalar_one_or_none()
            if not prod:
                prod = Produto(**dados)
                db.add(prod)
                await db.flush()
                # Adiciona lote inicial de estoque
                lote = LoteEstoque(
                    tenant_id=1,
                    produto_id=prod.id,
                    numero_lote=f"LOT-{prod.id}-2026",
                    data_validade=datetime.utcnow() + timedelta(days=180),
                    quantidade_armazem=100,
                    quantidade_gondola=30
                )
                db.add(lote)
            else:
                prod.nome = dados["nome"]
                prod.preco_venda = dados["preco_venda"]
                prod.codigo_barras = dados["codigo_barras"]
                prod.qr_code_tag = dados["qr_code_tag"]
        
        await db.commit()
        print("[SUCESSO] Produtos e lotes prontos para teste de bipe cadastrados!")

if __name__ == "__main__":
    asyncio.run(main())
