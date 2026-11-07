from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Configuracoes(BaseSettings):
    NOME_PROJETO: str = "BipFy Sistema de Gerenciamento de Comércios"
    VERSAO: str = "1.0.0"
    DESCRICAO: str = "API para gestão de comandas, estoque e pagamentos."
    
    # Segurança
    SECRET_KEY: str = "sua_chave_secreta_super_segura_aqui_em_producao_use_variavel_ambiente"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 horas
    
    # Configurações do Banco de Dados
    # O padrão usa asyncpg para comunicação assíncrona
    DATABASE_URL: str = "postgresql+asyncpg://bipfy_user:bipfy_password@localhost:5432/bipfy_dev"

    # Configurações de E-mail (SMTP)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: str = "BipFy SaaS <noreply@bipfy.com>"
    SMTP_TLS: bool = True

    # Integração MetaGOB (Grande Oriente do Brasil - e-GOB Card)
    METAGOB_API_URL: str = "https://api.metagob.gob.org.br"
    METAGOB_TOKEN_URL: str = "https://api.metagob.gob.org.br/oauth/token"
    METAGOB_CLIENT_ID: Optional[str] = None
    METAGOB_CLIENT_SECRET: Optional[str] = None
    METAGOB_SANDBOX_MODE: bool = True

    model_config = SettingsConfigDict(env_file=["backend/.env", ".env"], case_sensitive=True, extra="ignore")

config = Configuracoes()
