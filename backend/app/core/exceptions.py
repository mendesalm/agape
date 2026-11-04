from fastapi import Request
from fastapi.responses import JSONResponse
from loguru import logger

class BipFyException(Exception):
    """Classe base para as exceções customizadas do sistema."""
    def __init__(self, mensagem: str, status_code: int = 400):
        self.mensagem = mensagem
        self.status_code = status_code

# Alias de compatibilidade
BarixException = BipFyException

class NaoEncontradoException(BipFyException):
    def __init__(self, recurso: str):
        super().__init__(f"{recurso} não encontrado.", status_code=404)

class RegraNegocioException(BipFyException):
    def __init__(self, mensagem: str):
        super().__init__(mensagem, status_code=400)

async def tratar_excecao_customizada(request: Request, exc: BipFyException):
    """Middleware que formata exceções de domínio do sistema."""
    logger.warning(f"Erro de negócio: {exc.mensagem} | Rota: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"erro": True, "mensagem": exc.mensagem}
    )

async def tratar_excecao_global(request: Request, exc: Exception):
    """Middleware que captura qualquer erro não tratado para evitar exposição de código."""
    logger.error(f"Erro interno não tratado: {str(exc)} | Rota: {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"erro": True, "mensagem": "Ocorreu um erro interno no servidor. Nossa equipe técnica já foi notificada."}
    )
