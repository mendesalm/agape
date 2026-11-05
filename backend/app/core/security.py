from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import jwt
from app.core.config import config
from app.core.exceptions import RegraNegocioException

def obter_hash_senha(senha: str) -> str:
    """
    Gera hash seguro bcrypt nativo (compatível com Python 3.14+).
    Trunca em 72 bytes conforme especificação oficial do algoritmo bcrypt.
    """
    pwd_bytes = senha.encode('utf-8')[:72]
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    """
    Verifica se a senha em texto confere com o hash bcrypt.
    Compatível com hashes gerados pelo e-Sigma e Harmonia.
    """
    if not senha_plana or not senha_hash:
        return False
    try:
        pwd_bytes = senha_plana.encode('utf-8')[:72]
        hash_bytes = senha_hash.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

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
