from fastapi import APIRouter, Header, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import Depends
from app.core.database import obter_sessao
from app.models.estabelecimento import Estabelecimento
from app.core.logger import logger

router = APIRouter(prefix="/webhooks", tags=["Webhooks e Pagamentos"])

# Simulando um segredo compartilhado com o gateway de pagamento para segurança
ASAAS_WEBHOOK_SECRET = "secret_sigma_2026_xpto"

@router.post("/asaas")
async def asaas_webhook(request: Request, db: AsyncSession = Depends(obter_sessao)):
    """
    Endpoint para receber eventos de pagamento do Gateway (ex: Asaas).
    Responsável por ligar e desligar o sistema para o bar de forma automatizada.
    """
    # 1. Validação de segurança (Verifica se foi o Banco quem chamou)
    token_recebido = request.headers.get("asaas-access-token")
    if token_recebido != ASAAS_WEBHOOK_SECRET:
        logger.warning("Tentativa de fraude no Webhook de pagamentos bloqueada.")
        raise HTTPException(status_code=401, detail="Token de webhook inválido.")

    # 2. Processa o Payload (Corpo do aviso)
    payload = await request.json()
    evento = payload.get("event")
    
    # O externalReference é o ID do nosso Estabelecimento que mandamos na geração do boleto
    tenant_id = payload.get("payment", {}).get("externalReference")
    
    if not tenant_id:
        return {"status": "ignorado", "motivo": "Sem externalReference"}

    resultado = await db.execute(select(Estabelecimento).where(Estabelecimento.id == int(tenant_id)))
    estabelecimento = resultado.scalars().first()
    if not estabelecimento:
        return {"status": "ignorado", "motivo": "Estabelecimento não encontrado"}

    # 3. Lógica Vital de Bloqueio/Desbloqueio (Herança Sigma 2.0)
    if evento == "PAYMENT_RECEIVED" or evento == "PAYMENT_CONFIRMED":
        estabelecimento.ativo = True
        await db.commit()
        logger.info(f"Pagamento recebido! Tenant ID {tenant_id} ATIVADO com sucesso.")
        return {"status": "sucesso", "acao": "ativado"}
        
    elif evento == "PAYMENT_OVERDUE" or evento == "PAYMENT_DELETED":
        estabelecimento.ativo = False
        await db.commit()
        logger.warning(f"Pagamento atrasado! Tenant ID {tenant_id} BLOQUEADO por inadimplência.")
        return {"status": "sucesso", "acao": "bloqueado"}

    return {"status": "recebido_sem_acao"}
