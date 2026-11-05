import asyncio
from app.core.database import SessionLocal
from app.models.estabelecimento import Estabelecimento
from app.models.cliente import Cliente
from app.models.produto import Produto
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        # 1. Estabelecimento
        res_estab = await db.execute(select(Estabelecimento).limit(1))
        estab = res_estab.scalar_one_or_none()
        if not estab:
            estab = Estabelecimento(nome_fantasia="Salão de Ágapes - Loja Central", numero_loja="101")
            db.add(estab)
            await db.commit()
            await db.refresh(estab)
        print(f"[SANDBOX] Estabelecimento: ID {estab.id} - {estab.nome_fantasia} (Loja Nº {estab.numero_loja})")

        # 2. Produtos
        res_prod = await db.execute(select(Produto).limit(10))
        produtos = res_prod.scalars().all()
        if not produtos:
            p1 = Produto(
                estabelecimento_id=estab.id,
                nome="Cerveja Heineken 350ml",
                preco_venda=8.50,
                preco_custo=4.50,
                quantidade_estoque=100,
                quantidade_gondola=50,
                codigo_barras="7891991000826",
                qr_code_tag="PROD-HEIN-350",
                marca="Heineken",
                categoria="Bebidas"
            )
            p2 = Produto(
                estabelecimento_id=estab.id,
                nome="Água Mineral sem Gás 500ml",
                preco_venda=4.00,
                preco_custo=1.50,
                quantidade_estoque=80,
                quantidade_gondola=40,
                codigo_barras="7891000100100",
                qr_code_tag="PROD-AGUA-500",
                marca="Crystal",
                categoria="Bebidas"
            )
            db.add_all([p1, p2])
            await db.commit()
            res_prod = await db.execute(select(Produto).limit(10))
            produtos = res_prod.scalars().all()

        print("\n[SANDBOX PRODUTOS DISPONÍVEIS PARA TESTE]:")
        for p in produtos:
            print(f"- Nome: {p.nome} | R$ {p.preco_venda:.2f} | Código de Barras: {p.codigo_barras} | QR Tag: {p.qr_code_tag}")

        # 3. Clientes
        res_cli = await db.execute(select(Cliente).limit(5))
        clientes = res_cli.scalars().all()
        if not clientes:
            cli = Cliente(
                nome="Ir.'. José da Silva (Sandbox)",
                cpf="12345678900",
                cim="123456",
                email="jose.silva@esigma.app"
            )
            db.add(cli)
            await db.commit()
            await db.refresh(cli)
            clientes = [cli]

        print("\n[SANDBOX CLIENTES DISPONÍVEIS PARA TESTE]:")
        for c in clientes:
            print(f"- Nome: {c.nome} | CPF: {c.cpf} | CIM: {c.cim}")

if __name__ == "__main__":
    asyncio.run(main())
