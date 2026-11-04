import asyncio
from app.core.database import engine, Base
import app.models

async def sync_db():
    async with engine.begin() as conn:
        print("Apagando tabelas antigas...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Criando tabelas no formato Multitenant...")
        await conn.run_sync(Base.metadata.create_all)
    print("Sucesso!")

if __name__ == "__main__":
    asyncio.run(sync_db())
