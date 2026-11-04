from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Configuracoes(BaseSettings):
    NOME_PROJETO: str = "e-Sigma Ágape — Gestão de Consumo e Confraternização"
    VERSAO: str = "1.0.0"
    DESCRICAO: str = "Módulo integrado ao e-Sigma (lojas_db) para Salão de Ágapes, Estoque e Comandas."
    
    # Segurança
    SECRET_KEY: str = "sua_chave_secreta_super_segura_aqui_em_producao_use_variavel_ambiente"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 horas
    
    # Banco de Dados oficial do e-Sigma (lojas_db)
    DATABASE_URL: str = "postgresql+asyncpg://barsys:BsysT23754RthfFg@69.62.89.211:5432/lojas_db"

    # Configurações de E-mail (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "e-Sigma Ágape <noreply@e-sigma.app>"
    SMTP_TLS: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

config = Configuracoes()
