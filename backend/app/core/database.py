from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.core.config import config

# Configuração da engine assíncrona
engine = create_async_engine(
    config.DATABASE_URL,
    echo=False,  # Em desenvolvimento pode ser True para ver as queries SQL
    future=True
)

# Fábrica de sessões do banco de dados
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Classe base para a declaração dos modelos de banco de dados
Base = declarative_base()

async def obter_sessao() -> AsyncSession: # type: ignore
    """
    Injeta a dependência da sessão assíncrona nas rotas do FastAPI.
    Garante que a sessão seja fechada corretamente após a requisição.
    """
    async with SessionLocal() as sessao:
        try:
            yield sessao
        finally:
            await sessao.close()
