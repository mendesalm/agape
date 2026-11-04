import asyncio
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import config
from app.core.logger import logger

class EmailService:
    @staticmethod
    def _enviar_smtp_sync(destinatario: str, assunto: str, html_content: str, texto_content: str) -> bool:
        """Execução síncrona do envio SMTP para rodar em thread assíncrona."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = config.SMTP_FROM
        msg["To"] = destinatario

        msg.attach(MIMEText(texto_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        try:
            if not config.SMTP_HOST:
                # Se SMTP não estiver configurado, simula e loga no console
                logger.info(f"📧 [SIMULAÇÃO DE EMAIL] Para: {destinatario} | Assunto: {assunto}")
                return True

            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=10)
            if config.SMTP_TLS:
                server.starttls()
            if config.SMTP_USER and config.SMTP_PASSWORD:
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)

            server.sendmail(config.SMTP_FROM, [destinatario], msg.as_string())
            server.quit()
            logger.info(f"📧 [EMAIL ENVIADO COM SUCESSO] Para: {destinatario} | Assunto: {assunto}")
            return True
        except Exception as e:
            logger.error(f"❌ [ERRO AO ENVIAR EMAIL] Para: {destinatario} | Erro: {str(e)}")
            return False

    @classmethod
    async def enviar_email_boas_vindas_webmaster(
        cls, 
        destinatario: str, 
        nome: str, 
        estabelecimento_nome: str, 
        senha: str,
        login_url: str = "http://localhost:5173/login"
    ):
        """Dispara e-mail de boas-vindas com as credenciais de acesso para o novo Webmaster."""
        assunto = f"Bem-vindo ao BipFy! Acesso à sua instância '{estabelecimento_nome}'"

        texto_content = f"""
Olá, {nome}!

Sua instância do bar '{estabelecimento_nome}' foi provisionada com sucesso no BipFy SaaS.

Seus dados de acesso ao painel de administração:
- URL de Login: {login_url}
- Usuário (E-mail): {destinatario}
- Senha Provisória: {senha}

Por segurança, recomendamos que altere sua senha no primeiro acesso.

Atenciosamente,
Equipe BipFy
        """.strip()

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }}
            .card {{ background-color: #ffffff; max-width: 540px; margin: 0 auto; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
            .brand {{ color: #2563eb; font-size: 24px; font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }}
            .box-credenciais {{ background-color: #f1f5f9; border-radius: 12px; padding: 18px; margin: 24px 0; border: 1px solid #cbd5e1; }}
            .campo {{ margin-bottom: 8px; font-size: 14px; color: #475569; }}
            .valor {{ font-weight: 700; color: #0f172a; font-family: monospace; font-size: 15px; }}
            .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px; }}
            .footer {{ margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">🍷 BipFy SaaS</div>
            <h2 style="color: #0f172a; margin-top: 0;">Bem-vindo ao BipFy, {nome}!</h2>
            <p style="color: #334155; line-height: 1.5;">
              Sua instância para o estabelecimento <strong>{estabelecimento_nome}</strong> foi ativada com sucesso.
            </p>
            
            <div class="box-credenciais">
              <div class="campo">E-mail de Acesso: <br><span class="valor">{destinatario}</span></div>
              <div class="campo" style="margin-top: 12px;">Senha Inicial: <br><span class="valor">{senha}</span></div>
            </div>

            <div style="text-align: center;">
              <a href="{login_url}" class="btn">Acessar Meu Painel</a>
            </div>

            <div class="footer">
              Você recebeu este e-mail porque sua conta de administrador foi provisionada pelo gestor da plataforma BipFy.
            </div>
          </div>
        </body>
        </html>
        """.strip()

        # Roda o envio em thread separada para não bloquear o event loop assíncrono do FastAPI
        return await asyncio.to_thread(
            cls._enviar_smtp_sync, destinatario, assunto, html_content, texto_content
        )
