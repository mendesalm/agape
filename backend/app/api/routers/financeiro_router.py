from fastapi import APIRouter, Depends, Query
from typing import Optional
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

    # 5. Receitas por Forma de Pagamento
    query_fp = select(
        Comanda.forma_pagamento,
        func.sum(Comanda.valor_total)
    ).where(
        Comanda.tenant_id == tenant_id,
        Comanda.status == StatusComanda.FECHADA
    ).group_by(Comanda.forma_pagamento)
    res_fp = await db.execute(query_fp)
    formas_pgto = {}
    for fp, total in res_fp.all():
        if fp:
            formas_pgto[fp.lower()] = float(total or 0.0)

    # 6. Saldos Devedores / Inadimplência do Bar
    from app.models.cliente import CarteiraCliente, Cliente
    query_devedores = select(
        Cliente.nome,
        Cliente.cim,
        Cliente.telefone,
        CarteiraCliente.saldo
    ).join(
        Cliente, Cliente.id == CarteiraCliente.cliente_id
    ).where(
        CarteiraCliente.tenant_id == tenant_id,
        CarteiraCliente.saldo < 0
    ).order_by(CarteiraCliente.saldo.asc())
    res_dev = await db.execute(query_devedores)
    lista_devedores = []
    inadimplencia_total = 0.0
    for nome, cim, tel, saldo in res_dev.all():
        debito = abs(float(saldo))
        inadimplencia_total += debito
        lista_devedores.append({
            "nome": nome,
            "cim": cim,
            "telefone": tel,
            "saldo_devedor": debito
        })

    return {
        "faturamento": float(faturamento),
        "despesas": float(despesas_gerais),
        "prejuizo_quebras": float(prejuizo_quebras),
        "lucro_bruto": float(faturamento - despesas_gerais - prejuizo_quebras),
        "total_comandas_fechadas": total_comandas,
        "ticket_medio": float(faturamento / total_comandas) if total_comandas > 0 else 0.0,
        "receitas_por_forma_pagamento": {
            "pix": formas_pgto.get("pix", 0.0),
            "cartao_debito": formas_pgto.get("cartao_debito", 0.0),
            "cartao_credito": formas_pgto.get("cartao_credito", 0.0),
            "dinheiro": formas_pgto.get("dinheiro", 0.0),
            "saldo_bar_fiado": formas_pgto.get("saldo_bar_fiado", 0.0)
        },
        "inadimplencia_total": float(inadimplencia_total),
        "devedores": lista_devedores
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

@router.get("/fechamento-sessao")
async def obter_fechamento_sessao(
    data_inicio: Optional[str] = Query(None, description="Data inicial YYYY-MM-DD"),
    data_fim: Optional[str] = Query(None, description="Data final YYYY-MM-DD"),
    nome_sessao: str = Query("Sessão Ordinária", description="Nome da Sessão / Evento de Ágape"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Consolida o Fechamento por Sessão / Evento de Ágape para Tesouraria/Hospitalaria:
    comandas fechadas, receita, CMV real dos lotes consumidos, perdas/avarias e lucro líquido.
    """
    from datetime import datetime, timedelta
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    from app.models.comanda import Comanda, ItemComanda, StatusComanda
    from app.models.produto import Produto
    from app.models.movimentacao_estoque import MovimentacaoEstoque, TipoMovimentacao

    hoje = datetime.utcnow().date()
    d_ini = datetime.strptime(data_inicio, "%Y-%m-%d").date() if data_inicio else hoje
    d_fim = datetime.strptime(data_fim, "%Y-%m-%d").date() if data_fim else d_ini

    dt_ini = datetime.combine(d_ini, datetime.min.time())
    dt_fim = datetime.combine(d_fim, datetime.max.time())

    res_comandas = await db.execute(
        select(Comanda)
        .options(selectinload(Comanda.itens).selectinload(ItemComanda.produto))
        .where(
            Comanda.tenant_id == usuario.tenant_id,
            Comanda.status == StatusComanda.FECHADA,
            Comanda.data_fechamento >= dt_ini,
            Comanda.data_fechamento <= dt_fim
        )
    )
    comandas = res_comandas.scalars().all()

    receita_total = 0.0
    qtd_itens = 0
    por_forma: dict = {}
    cmv_fallback = 0.0

    for c in comandas:
        val = float(c.valor_total or 0.0)
        if val <= 0 and c.itens:
            val = sum(i.quantidade * i.valor_unitario for i in c.itens)
        receita_total += val
        fp = (c.forma_pagamento or "outros").lower()
        por_forma[fp] = round(por_forma.get(fp, 0.0) + val, 2)
        for it in (c.itens or []):
            qtd_itens += int(it.quantidade or 0)
            custo_u = float(it.produto.preco_custo or 0.0) if it.produto else 0.0
            cmv_fallback += int(it.quantidade or 0) * custo_u

    # Busca movimentações reais dos lotes no período (SAIDA_VENDA e PERDA_QUEBRA)
    res_movs = await db.execute(
        select(MovimentacaoEstoque)
        .join(Produto, MovimentacaoEstoque.produto_id == Produto.id)
        .options(selectinload(MovimentacaoEstoque.lote), selectinload(MovimentacaoEstoque.produto))
        .where(
            Produto.tenant_id == usuario.tenant_id,
            MovimentacaoEstoque.data_movimentacao >= dt_ini,
            MovimentacaoEstoque.data_movimentacao <= dt_fim,
            MovimentacaoEstoque.tipo.in_([TipoMovimentacao.SAIDA_VENDA, TipoMovimentacao.PERDA_QUEBRA])
        )
    )
    movs = res_movs.scalars().all()

    cmv_lotes = 0.0
    perdas_valor = 0.0
    perdas_qtd = 0
    for m in movs:
        custo_unit = (
            float(m.lote.preco_custo_unitario)
            if (m.lote and m.lote.preco_custo_unitario is not None)
            else float(m.produto.preco_custo or 0.0) if m.produto else 0.0
        )
        qtd_abs = abs(int(m.quantidade or 0))
        if m.tipo == TipoMovimentacao.SAIDA_VENDA:
            cmv_lotes += qtd_abs * custo_unit
        elif m.tipo == TipoMovimentacao.PERDA_QUEBRA:
            perdas_qtd += qtd_abs
            perdas_valor += qtd_abs * custo_unit

    cmv_real = round(cmv_lotes if cmv_lotes > 0 else cmv_fallback, 2)
    perdas_valor = round(perdas_valor, 2)
    receita_total = round(receita_total, 2)
    lucro_liquido = round(receita_total - cmv_real - perdas_valor, 2)
    qtd_comandas = len(comandas)
    ticket_medio = round(receita_total / qtd_comandas, 2) if qtd_comandas > 0 else 0.0

    linhas_fp = "\n".join(f"• {k.upper()}: R$ {v:.2f}" for k, v in por_forma.items()) or "• Sem movimentação"
    texto_tesouraria = (
        f"FECHAMENTO DE SESSÃO — E-SIGMA ∴ ÁGAPE\n"
        f"Sessão: {nome_sessao}\n"
        f"Período: {d_ini.strftime('%d/%m/%Y')} a {d_fim.strftime('%d/%m/%Y')}\n\n"
        f"Comandas Fechadas: {qtd_comandas} ({qtd_itens} itens)\n"
        f"Ticket Médio: R$ {ticket_medio:.2f}\n\n"
        f"Receita Bruta: R$ {receita_total:.2f}\n"
        f"CMV Real (Lotes): - R$ {cmv_real:.2f}\n"
        f"Perdas / Avarias ({perdas_qtd} un): - R$ {perdas_valor:.2f}\n"
        f"LUCRO LÍQUIDO DA SESSÃO: R$ {lucro_liquido:.2f}\n\n"
        f"Por Forma de Pagamento:\n{linhas_fp}"
    )

    return {
        "nome_sessao": nome_sessao,
        "data_inicio": d_ini.isoformat(),
        "data_fim": d_fim.isoformat(),
        "qtd_comandas": qtd_comandas,
        "qtd_itens": qtd_itens,
        "ticket_medio": ticket_medio,
        "receita_total": receita_total,
        "cmv_real": cmv_real,
        "perdas_qtd": perdas_qtd,
        "perdas_valor": perdas_valor,
        "lucro_liquido": lucro_liquido,
        "por_forma_pagamento": por_forma,
        "texto_tesouraria": texto_tesouraria,
    }

@router.get("/lista-compras")
async def gerar_lista_compras_economo(
    dias_historico: int = Query(30, ge=7, le=180, description="Janela de dias para média de consumo"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Lista de Compras Inteligente para o Ecônomo:
    cruza estoque atual (gôndola + armazém), estoque mínimo configurado e
    média de consumo das últimas sessões para sugerir a reposição ideal.
    """
    import math
    from datetime import datetime, timedelta
    from sqlalchemy.future import select
    from sqlalchemy.orm import selectinload
    from app.models.produto import Produto
    from app.models.comanda import Comanda, ItemComanda, StatusComanda

    dt_corte = datetime.utcnow() - timedelta(days=dias_historico)

    res_prods = await db.execute(
        select(Produto)
        .options(selectinload(Produto.lotes))
        .where(Produto.tenant_id == usuario.tenant_id, Produto.ativo == True)
        .order_by(Produto.nome.asc())
    )
    produtos = res_prods.scalars().all()

    res_com = await db.execute(
        select(Comanda)
        .options(selectinload(Comanda.itens))
        .where(
            Comanda.tenant_id == usuario.tenant_id,
            Comanda.status != StatusComanda.CANCELADA,
            Comanda.data_abertura >= dt_corte
        )
    )
    comandas = res_com.scalars().all()

    dias_sessoes = {c.data_abertura.date() for c in comandas if c.data_abertura}
    num_sessoes = max(len(dias_sessoes), 1)

    vendido_por_produto: dict = {}
    for c in comandas:
        for it in (c.itens or []):
            vendido_por_produto[it.produto_id] = vendido_por_produto.get(it.produto_id, 0) + int(it.quantidade or 0)

    itens_compra = []
    custo_estimado_total = 0.0

    for p in produtos:
        lotes_ativos = [l for l in (p.lotes or []) if l.ativo]
        qtd_gondola = sum(int(l.quantidade_gondola or 0) for l in lotes_ativos)
        qtd_armazem = sum(int(l.quantidade_armazem or 0) for l in lotes_ativos)
        estoque_atual = qtd_gondola + qtd_armazem
        estoque_minimo = int(p.estoque_minimo_gondola or 0) + int(p.estoque_minimo_armazem or 0)

        vendido_periodo = vendido_por_produto.get(p.id, 0)
        consumo_medio_sessao = round(vendido_periodo / num_sessoes, 1)

        alvo_estoque = max(estoque_minimo * 2, math.ceil(consumo_medio_sessao * 2))
        sugestao_compra = max(0, alvo_estoque - estoque_atual)

        if sugestao_compra <= 0 and estoque_atual > estoque_minimo:
            continue

        custo_unit = float(p.preco_custo or 0.0)
        custo_est = round(sugestao_compra * custo_unit, 2)
        custo_estimado_total += custo_est

        prioridade = "critico" if estoque_atual <= estoque_minimo else "repor"
        itens_compra.append({
            "produto_id": p.id,
            "nome": p.nome,
            "marca": p.marca,
            "estoque_atual": estoque_atual,
            "estoque_minimo": estoque_minimo,
            "consumo_medio_sessao": consumo_medio_sessao,
            "sugestao_compra": sugestao_compra,
            "preco_custo": custo_unit,
            "custo_estimado": custo_est,
            "prioridade": prioridade,
        })

    itens_compra.sort(key=lambda x: (0 if x["prioridade"] == "critico" else 1, -x["sugestao_compra"]))

    linhas_wpp = "\n".join(
        f"• {i['nome']}: comprar {i['sugestao_compra']} un (atual: {i['estoque_atual']}, média/sessão: {i['consumo_medio_sessao']})"
        for i in itens_compra
    ) or "• Estoque abastecido para as próximas sessões!"

    texto_whatsapp = (
        f"LISTA DE COMPRAS (ECÔNOMO) — E-SIGMA ∴ ÁGAPE\n"
        f"Base: últimas {num_sessoes} sessões ({dias_historico} dias)\n\n"
        f"{linhas_wpp}\n\n"
        f"Custo Estimado Total: R$ {custo_estimado_total:.2f}"
    )

    return {
        "num_sessoes_analisadas": num_sessoes,
        "dias_historico": dias_historico,
        "total_itens_repor": len(itens_compra),
        "custo_estimado_total": round(custo_estimado_total, 2),
        "itens": itens_compra,
        "texto_whatsapp": texto_whatsapp,
    }
