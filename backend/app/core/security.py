from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
import jwt
from app.core.config import config
from app.core.exceptions import RegraNegocioException

# Configuração do bcrypt para hash de senhas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def obter_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_plana, senha_hash)

def criar_token_acesso(dados: dict, expira_em_delta: Optional[timedelta] = None) -> str:
    dados_para_codificar = dados.copy()
    if expira_em_delta:
        expira_em = datetime.utcnow() + expira_em_delta
    else:
        expira_em = datetime.utcnow() + timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        
    dados_para_codificar.update({"exp": expira_em})
    
    try:
        token_codificado = jwt.encode(dados_para_codificar, config.SECRET_KEY, algorithm=config.ALGORITHM)
        return token_codificado
    except Exception as e:
        raise RegraNegocioException(f"Erro ao gerar o token de acesso: {str(e)}")

def decodificar_token_acesso(token: str) -> dict:
    try:
        payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise RegraNegocioException("Token de acesso expirado. Por favor, faça login novamente.")
    except jwt.InvalidTokenError:
        raise RegraNegocioException("Token de acesso inválido.")
