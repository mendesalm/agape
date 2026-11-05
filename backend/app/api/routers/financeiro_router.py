from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.core.database import obter_sessao
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.models.transacao_financeira import TransacaoFinanceira, TipoTransacao
from app.models.movimentacao_estoque import MovimentacaoEstoque, TipoMovimentacao
from app.models.produto import Produto
from app.models.comanda import Comanda, StatusComanda

router = APIRouter(prefix="/financeiro", tags=["Dashboard Financeiro (SaaS)"])

@router.get("/resumo")
async def obter_resumo_financeiro(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    tenant_id = usuario.tenant_id
    
    # 1. Total de Receitas
    query_receita = select(func.sum(TransacaoFinanceira.valor)).where(
        TransacaoFinanceira.tenant_id == tenant_id,
        TransacaoFinanceira.tipo == TipoTransacao.RECEITA
    )
    result_receita = await db.execute(query_receita)
    faturamento = result_receita.scalar() or 0.0

    # 2. Total de Despesas (Gerais)
    query_despesa = select(func.sum(TransacaoFinanceira.valor)).where(
        TransacaoFinanceira.tenant_id == tenant_id,
        TransacaoFinanceira.tipo == TipoTransacao.DESPESA
    )
    result_despesa = await db.execute(query_despesa)
    despesas_gerais = result_despesa.scalar() or 0.0

    # 3. Prejuízo de Quebras/Perdas (Quantidade Perdida * Preço de Custo)
    # MovimentacaoEstoque salva a quantidade como negativa quando é perda
    query_quebras = select(
        func.sum(MovimentacaoEstoque.quantidade * Produto.preco_custo)
    ).join(Produto, Produto.id == MovimentacaoEstoque.produto_id).where(
        Produto.tenant_id == tenant_id,
        MovimentacaoEstoque.tipo == TipoMovimentacao.PERDA_QUEBRA
    )
    result_quebras = await db.execute(query_quebras)
    # Como a quantidade é negativa, multiplicamos por -1 para ter o valor de prejuízo positivo
    prejuizo_quebras = (result_quebras.scalar() or 0.0) * -1

    # 4. Total de Comandas Fechadas
    query_comandas = select(func.count(Comanda.id)).where(
        Comanda.tenant_id == tenant_id,
        Comanda.status == StatusComanda.FECHADA
    )
    result_comandas = await db.execute(query_comandas)
    total_comandas = result_comandas.scalar() or 0

    return {
        "faturamento": float(faturamento),
        "despesas": float(despesas_gerais),
        "prejuizo_quebras": float(prejuizo_quebras),
        "lucro_bruto": float(faturamento - despesas_gerais - prejuizo_quebras),
        "total_comandas_fechadas": total_comandas,
        "ticket_medio": float(faturamento / total_comandas) if total_comandas > 0 else 0.0
    }

@router.get("/auditoria")
async def relatorio_auditoria_transacoes(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Lista a linha do tempo (Ledger) de todas as transações (PIX e Compras) 
    do Estabelecimento para auditoria antifraude/câmera.
    """
    from app.models.cliente import TransacaoCarteira, CarteiraCliente
    from sqlalchemy.orm import selectinload

    # Busca as transações das carteiras vinculadas a este Tenant (Bar) com carregamento ansioso
    resultado = await db.execute(
        select(TransacaoCarteira)
        .options(
            selectinload(TransacaoCarteira.carteira).selectinload(CarteiraCliente.cliente)
        )
        .join(CarteiraCliente, TransacaoCarteira.carteira_id == CarteiraCliente.id)
        .where(CarteiraCliente.tenant_id == usuario.tenant_id)
        .order_by(TransacaoCarteira.data_transacao.desc())
        .limit(100) # Últimas 100 ações para performance
    )
    
    transacoes = resultado.scalars().all()
    
    lista_auditoria = []
    for t in transacoes:
        lista_auditoria.append({
            "id": t.id,
            "data": t.data_transacao.isoformat(),
            "cliente_nome": t.carteira.cliente.nome,
            "cliente_cpf": t.carteira.cliente.cpf,
            "tipo": t.tipo.value,
            "valor": t.valor,
            "descricao": t.descricao
        })
        
    return lista_auditoria

@router.get("/transacoes")
async def listar_transacoes(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    query = select(TransacaoFinanceira).where(TransacaoFinanceira.tenant_id == usuario.tenant_id).order_by(TransacaoFinanceira.data_transacao.desc())
    resultado = await db.execute(query)
    return resultado.scalars().all()

@router.get("/auditoria-estoque")
async def relatorio_auditoria_estoque(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Relatório auditável completo de movimentações de estoque (Entradas, Saídas e Perdas),
    associando operador, cliente, forma de pagamento, se houve perda e valores em R$.
    """
    from app.services.produto_service import ProdutoService
    servico = ProdutoService(db, usuario.tenant_id)
    movs = await servico.listar_movimentacoes_auditoria(limit=300)
    
    itens = []
    for m in movs:
        itens.append({
            "id": m.id,
            "data_hora": m.data_movimentacao.isoformat(),
            "tipo": m.tipo.value if hasattr(m.tipo, "value") else str(m.tipo),
            "produto_id": m.produto_id,
            "produto_nome": m.produto.nome if m.produto else f"Produto #{m.produto_id}",
            "quantidade": m.quantidade,
            "local_origem": m.local_origem,
            "local_destino": m.local_destino,
            "motivo": m.motivo,
            "operador_nome": m.operador.nome if m.operador else "Sistema / Totem",
            "cliente_nome": m.cliente.nome if m.cliente else (f"Comanda #{m.comanda_id}" if m.comanda_id else "-"),
            "cliente_documento": (m.cliente.cim or m.cliente.cpf) if m.cliente else None,
            "forma_pagamento": m.forma_pagamento,
            "tipo_perda": m.tipo_perda,
            "justificativa_perda": m.justificativa_perda,
            "preco_custo_unitario": m.preco_custo_unitario or (m.produto.preco_custo if m.produto else 0.0),
            "preco_venda_unitario": m.preco_venda_unitario or (m.produto.preco_venda if m.produto else 0.0),
            "custo_total_perda": m.custo_total_perda or 0.0,
            "valor_total": m.valor_total or 0.0
        })
    return itens
