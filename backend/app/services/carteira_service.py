from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from app.models.cliente import CarteiraCliente, TransacaoCarteira, TipoTransacaoCarteira

class CarteiraService:
    @staticmethod
    async def processar_transacao(
        db: AsyncSession, 
        carteira_id: int, 
        tipo: TipoTransacaoCarteira, 
        valor: float, 
        descricao: str = None, 
        referencia_externa: str = None
    ) -> CarteiraCliente:
        """
        Processa uma transação aplicando Event Sourcing e Row-Level Lock (FOR UPDATE)
        para evitar Gasto Duplo em ambientes de alta concorrência.
        """
        if valor <= 0:
            raise HTTPException(status_code=400, detail="O valor da transação deve ser maior que zero.")

        # 1. Pessimistic Lock: Tranca a linha da carteira no banco até o fim da transação!
        resultado = await db.execute(
            select(CarteiraCliente).where(CarteiraCliente.id == carteira_id).with_for_update()
        )
        carteira = resultado.scalars().first()

        if not carteira:
            raise HTTPException(status_code=404, detail="Carteira não encontrada.")

        # 2. Regra de Negócio: O sistema permite saldo negativo (Pós-Pago / Fiado).
        # Não bloqueamos a compra no Totem/Mobile se não houver saldo pré-pago.
        is_debito = tipo in [TipoTransacaoCarteira.DEBITO_PEDIDO, TipoTransacaoCarteira.ESTORNO]

        # 3. Cria a entrada no Ledger (Event Sourcing)
        nova_transacao = TransacaoCarteira(
            carteira_id=carteira_id,
            tipo=tipo,
            valor=valor,
            descricao=descricao,
            referencia_externa=referencia_externa
        )
        db.add(nova_transacao)

        # 4. Atualiza o saldo final espelhado (Materialized View simplificada)
        if is_debito:
            carteira.saldo -= valor
        else:
            carteira.saldo += valor

        # O commit será feito pela rota ou serviço chamador, garantindo atomicidade.
        return carteira
