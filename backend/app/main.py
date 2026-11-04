from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.core.config import config
from app.core.logger import configurar_logs, logger
from app.core.database import engine, Base
import app.models # Garante que os modelos sejam carregados
from app.core.exceptions import (
    BipFyException, 
    tratar_excecao_customizada, 
    tratar_excecao_global
)
from app.api.routers.produto_router import router as produto_router
from app.api.routers.comanda_router import router as comanda_router
from app.api.routers.auth_router import router as auth_router
from app.api.routers.tenant_router import router as tenant_router
from app.api.routers.usuario_router import router as usuario_router
from app.api.routers.financeiro_router import router as financeiro_router
from app.api.routers.upload_router import router as upload_router
from app.api.routers.webhook_router import router as webhook_router
from app.api.routers.kds_router import router as kds_router
from app.api.routers.checkout_router import router as checkout_router
from app.api.routers.cartao_router import router as cartao_router
from app.api.routers.esigma_router import router as esigma_router

from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executado ao iniciar a aplicação
    configurar_logs()
    
    # Criando as tabelas no banco de dados automaticamente para o ambiente de desenvolvimento
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Tabelas do banco de dados sincronizadas.")

    logger.info("API do BipFy iniciada com sucesso.")
    yield
    # Executado ao encerrar a aplicação
    logger.info("API do BipFy sendo desligada.")

app = FastAPI(
    title=config.NOME_PROJETO,
    description=config.DESCRICAO,
    version=config.VERSAO,
    lifespan=lifespan
)

# Configuração de CORS (Permitir que o Frontend Local, Mobile LAN e Produção conectem na API)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8081", # Expo Web / Mobile
        "http://69.62.89.211",
        "https://69.62.89.211",
    ],
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro dos middlewares de tratamento de erros
app.add_exception_handler(BipFyException, tratar_excecao_customizada) # type: ignore
app.add_exception_handler(Exception, tratar_excecao_global)

# Registro das Rotas (Routers)
app.include_router(auth_router)
app.include_router(tenant_router)
app.include_router(usuario_router)
app.include_router(produto_router)
app.include_router(comanda_router)
app.include_router(financeiro_router)
app.include_router(upload_router)
app.include_router(webhook_router)
app.include_router(kds_router)
app.include_router(checkout_router)
app.include_router(cartao_router)
app.include_router(esigma_router)

@app.get("/", tags=["Healthcheck"])
async def root():
    """
    Rota básica para verificação de disponibilidade (Healthcheck).
    """
    logger.info("Requisição recebida na rota raiz.")
    return {"mensagem": "Bem-vindo à API do e-Sigma Ágape (agape.e-sigma.app)"}
