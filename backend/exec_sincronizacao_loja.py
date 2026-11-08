import asyncio
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.database import SessionLocal, engine
from app.services.produto_service import ProdutoService

async def main():
    print("=" * 70)
    print("EXECUTANDO SINCRONIZAÇÃO COMPLETA DA LOJA 2181 COM O CATÁLOGO MESTRE")
    print("=" * 70)

    async with SessionLocal() as db:
        # Loja 2181 é tenant_id = 1
        service = ProdutoService(db, tenant_id=1)
        res = await service.sincronizar_com_catalogo_mestre(auto_importar_novos=True)
        
        print("\n" + "=" * 70)
        print("RESULTADO DA SINCRONIZAÇÃO:")
        print(f" -> Produtos atualizados com fotos HD/WebP e EANs: {res['atualizados_count']}")
        print(f" -> Novos produtos mestres importados com lotes: {res['importados_count']}")
        print(f" -> Total de produtos na Loja 2181: {res['total_loja']}")
        print("=" * 70)
        
        print("\nDETALHES DOS ATUALIZADOS:")
        for a in res['atualizados']:
            print(f"  [ATUALIZADO] ID {a['id']}: {a['nome']} -> Foto: {a['foto_url']} | EAN: {a['codigo_barras']}")

        print("\nPRIMEIROS 10 IMPORTADOS:")
        for imp in res['importados'][:10]:
            print(f"  [IMPORTADO] ID {imp['id']}: {imp['nome']} -> Foto: {imp['foto_url']} | EAN: {imp['codigo_barras']}")

if __name__ == "__main__":
    asyncio.run(main())
