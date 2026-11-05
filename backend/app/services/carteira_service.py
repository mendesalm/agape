from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from datetime import datetime
from typing import Optional, List
from app.models.cliente import CarteiraCliente, TransacaoCarteira, TipoTransacaoCarteira, Cliente
from app.models.transacao_financeira import TransacaoFinanceira, TipoTransacao
from loguru import logger

class CarteiraService:
    LIMITE_FIADO_PADRAO = 100.0 # R$ 100,00 de limite devedor máximo

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
        Processa uma transação aplicando Event Sourcing e Row-Level Lock (FOR UPDATE).
        Trava de Segurança: impede compras a fiado se o saldo devedor ultrapassar R$ 100,00.
        """
        if valor <= 0:
            raise HTTPException(status_code=400, detail="O valor da transação deve ser maior que zero.")

        # 1. Pessimistic Lock: Tranca a linha da carteira no banco até o fim da transação
        resultado = await db.execute(
            select(CarteiraCliente).where(CarteiraCliente.id == carteira_id).with_for_update()
        )
        carteira = resultado.scalars().first()

        if not carteira:
            raise HTTPException(status_code=404, detail="Carteira não encontrada.")

        limite = getattr(carteira, "limite_fiado", None) or CarteiraService.LIMITE_FIADO_PADRAO
        is_debito = tipo in [TipoTransacaoCarteira.DEBITO_PEDIDO, TipoTransacaoCarteira.ESTORNO]

        # 2. Regra Estrita: Saldo devedor não pode ultrapassar o limite (R$ 100,00)
        if is_debito:
            novo_saldo = carteira.saldo - valor
            if novo_saldo < -limite:
                saldo_devedor_potencial = abs(novo_saldo)
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Compra fiada bloqueada: limite de saldo devedor (R$ {limite:.2f}) seria ultrapassado. "
                        f"Saldo atual: R$ {carteira.saldo:.2f}, Compra: R$ {valor:.2f}, Débito resultante: R$ {saldo_devedor_potencial:.2f}. "
                        f"O irmão deve efetuar recarga ou quitar o saldo do bar via Pix/Boleto para continuar consumindo."
                    )
                )

        # 3. Cria a entrada no Ledger (Event Sourcing)
        nova_transacao = TransacaoCarteira(
            carteira_id=carteira_id,
            tipo=tipo,
            valor=valor,
            descricao=descricao,
            referencia_externa=referencia_externa,
            data_transacao=datetime.utcnow()
        )
        db.add(nova_transacao)

        # 4. Atualiza o saldo final espelhado
        if is_debito:
            carteira.saldo -= valor
        else:
            carteira.saldo += valor
        
        carteira.data_atualizacao = datetime.utcnow()
        return carteira

    @staticmethod
    async def obter_ou_criar_carteira(db: AsyncSession, cliente_id: int, tenant_id: int) -> CarteiraCliente:
        """Resgata a carteira do cliente no bar da Loja ou cria uma se não existir."""
        resultado = await db.execute(
            select(CarteiraCliente).where(
                CarteiraCliente.cliente_id == cliente_id,
                CarteiraCliente.tenant_id == tenant_id
            )
        )
        carteira = resultado.scalars().first()
        if not carteira:
            carteira = CarteiraCliente(
                cliente_id=cliente_id,
                tenant_id=tenant_id,
                saldo=0.0,
                limite_fiado=CarteiraService.LIMITE_FIADO_PADRAO
            )
            db.add(carteira)
            await db.commit()
            await db.refresh(carteira)
        return carteira

    @staticmethod
    async def adicionar_creditos_bar(
        db: AsyncSession,
        cliente_id: int,
        tenant_id: int,
        valor: float,
        forma_pagamento: str,
        operador_nome: Optional[str] = None,
        observacao: Optional[str] = None
    ) -> CarteiraCliente:
        """
        Adiciona créditos pré-pagos ou quitação de débito na conta do bar (Ágape) do irmão.
        Gera a receita no caixa isolado do Bar.
        """
        carteira = await CarteiraService.obter_ou_criar_carteira(db, cliente_id, tenant_id)
        
        tipo_map = {
            "pix": TipoTransacaoCarteira.CREDITO_PIX,
            "dinheiro": TipoTransacaoCarteira.RECARGA_DINHEIRO,
            "cartao": TipoTransacaoCarteira.RECARGA_CARTAO,
            "boleto": TipoTransacaoCarteira.RECARGA_BOLETO,
        }
        tipo_transacao = tipo_map.get(forma_pagamento.lower(), TipoTransacaoCarteira.CREDITO_BALCAO)

        descricao = f"Recarga de Créditos no Bar ({forma_pagamento.upper()})"
        if observacao:
            descricao += f" - {observacao}"
        if operador_nome:
            descricao += f" (Op: {operador_nome})"

        carteira_atualizada = await CarteiraService.processar_transacao(
            db=db,
            carteira_id=carteira.id,
            tipo=tipo_transacao,
            valor=valor,
            descricao=descricao
        )

        # Registra a entrada no fluxo de caixa isolado do Bar
        receita_bar = TransacaoFinanceira(
            tenant_id=tenant_id,
            tipo=TipoTransacao.RECEITA,
            valor=valor,
            descricao=f"Recarga de Saldo Bar - Cliente #{cliente_id} ({forma_pagamento.upper()})",
            origem_id=carteira.id,
            data_transacao=datetime.utcnow()
        )
        db.add(receita_bar)
        await db.commit()
        await db.refresh(carteira_atualizada)
        logger.info(f"Crédito de R$ {valor:.2f} via {forma_pagamento} adicionado para cliente #{cliente_id} no bar.")
        return carteira_atualizada
