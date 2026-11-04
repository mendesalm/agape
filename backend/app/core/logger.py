import sys
from loguru import logger
from app.core.config import config

# Remove os handlers padrão do loguru
logger.remove()

# Configura um formato amigável e em português para a saída no console
formato_log = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
)

logger.add(sys.stdout, format=formato_log, level="INFO", colorize=True)

# Adiciona um handler para salvar logs em arquivo, rotacionando a cada 10 MB
logger.add("logs/bipfy_api.log", rotation="10 MB", retention="7 days", format=formato_log, level="INFO")

def configurar_logs():
    """
    Função inicializadora para garantir que o sistema de logs está operando.
    Pode ser expandida no futuro para integrar com Sentry, Datadog, etc.
    """
    logger.info(f"Sistema de logs inicializado para o projeto: {config.NOME_PROJETO}")
