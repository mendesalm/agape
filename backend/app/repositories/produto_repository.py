from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_
from typing import List, Optional, Set
from datetime import datetime, timedelta
import re

from app.models.produto import Produto
from app.models.estoque import LoteEstoque
from app.models.movimentacao_estoque import MovimentacaoEstoque, TipoMovimentacao
from app.schemas.produto_schema import ProdutoCreate, ProdutoUpdate

class ProdutoRepository:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.db = db
        self.tenant_id = tenant_id

    async def listar_todos(self, skip: int = 0, limit: int = 100) -> List[Produto]:
        query = (
            select(Produto)
            .options(selectinload(Produto.lotes))
            .where(Produto.tenant_id == self.tenant_id)
            .offset(skip)
            .limit(limit)
        )
        resultado = await self.db.execute(query)
        return resultado.scalars().all() # type: ignore

    async def buscar_por_id(self, produto_id: int) -> Optional[Produto]:
        query = (
            select(Produto)
            .options(selectinload(Produto.lotes))
            .where(Produto.id == produto_id, Produto.tenant_id == self.tenant_id)
        )
        resultado = await self.db.execute(query)
        return resultado.scalars().first()

    async def buscar_por_codigo(self, codigo: str) -> Optional[Produto]:
        """
        Busca o produto por:
        1. QR Code de fábrica impresso na lata/embalagem (exato ou URL GS1 Digital Link)
        2. Código de Barras de fábrica (EAN-13, EAN-8, GTIN)
        3. Identificador de Tag BipFy
        4. ID numérico direto
        """
        codigo_limpo = codigo.strip()
        candidatos: Set[str] = {codigo_limpo}

        # Extração inteligente de padrões de QR Code de fábrica (GS1 Digital Link):
        # Ex: https://id.ambev.com.br/01/07891991000845 ou https://brand.com/01/7891991000845/10/LOTE
        match_gs1 = re.search(r"/01/(\d{13,14})", codigo_limpo)
        if match_gs1:
            gtin = match_gs1.group(1)
            candidatos.add(gtin)
            # Se for GTIN-14 com zero à esquerda (comum em EAN-13), adiciona versão de 13 dígitos
            if len(gtin) == 14 and gtin.startswith("0"):
                candidatos.add(gtin[1:])

        # Parâmetros de URL com ean, gtin ou sku
        match_param = re.search(r"[?&](?:ean|gtin|sku|code)=(\w+)", codigo_limpo, re.IGNORECASE)
        if match_param:
            candidatos.add(match_param.group(1))

        # 1. Busca por qualquer um dos candidatos em codigo_barras ou qr_code_tag
        query = (
            select(Produto)
            .options(selectinload(Produto.lotes))
            .where(
                Produto.tenant_id == self.tenant_id,
                or_(
                    Produto.codigo_barras.in_(candidatos),
                    Produto.qr_code_tag.in_(candidatos)
                )
            )
        )
        resultado = await self.db.execute(query)
        produto = resultado.scalars().first()
        if produto:
            return produto

        # 2. Se for numérico ou formato ID simples
        if codigo_limpo.isdigit():
            return await self.buscar_por_id(int(codigo_limpo))
            
        return None

    async def buscar_lote_por_id(self, lote_id: int) -> Optional[LoteEstoque]:
        query = select(LoteEstoque).where(
            LoteEstoque.id == lote_id,
            LoteEstoque.tenant_id == self.tenant_id
        )
        resultado = await self.db.execute(query)
        return resultado.scalars().first()

    async def buscar_lote_por_numero(self, produto_id: int, numero_lote: str) -> Optional[LoteEstoque]:
        query = select(LoteEstoque).where(
            LoteEstoque.produto_id == produto_id,
            LoteEstoque.tenant_id == self.tenant_id,
            LoteEstoque.numero_lote == numero_lote
        )
        resultado = await self.db.execute(query)
        return resultado.scalars().first()

    async def listar_lotes_fefo_gondola(self, produto_id: int) -> List[LoteEstoque]:
        """
        Retorna os lotes com saldo na Gôndola ordenados por FEFO (First Expired, First Out).
        """
        query = (
            select(LoteEstoque)
            .where(
                LoteEstoque.produto_id == produto_id,
                LoteEstoque.tenant_id == self.tenant_id,
                LoteEstoque.quantidade_gondola > 0,
                LoteEstoque.ativo == True
            )
            .order_by(LoteEstoque.data_validade.asc())
        )
        resultado = await self.db.execute(query)
        return resultado.scalars().all() # type: ignore

    async def listar_lotes_fefo_armazem(self, produto_id: int) -> List[LoteEstoque]:
        """
        Retorna os lotes com saldo no Armazém ordenados por FEFO para reposição de gôndola.
        """
        query = (
            select(LoteEstoque)
            .where(
                LoteEstoque.produto_id == produto_id,
                LoteEstoque.tenant_id == self.tenant_id,
                LoteEstoque.quantidade_armazem > 0,
                LoteEstoque.ativo == True
            )
            .order_by(LoteEstoque.data_validade.asc())
        )
        resultado = await self.db.execute(query)
        return resultado.scalars().all() # type: ignore

    async def obter_totais_estoque(self, produto_id: int):
        """Retorna a soma de gôndola e armazém somando os lotes ativos."""
        query = select(
            func.coalesce(func.sum(LoteEstoque.quantidade_gondola), 0),
            func.coalesce(func.sum(LoteEstoque.quantidade_armazem), 0)
        ).where(
            LoteEstoque.produto_id == produto_id,
            LoteEstoque.tenant_id == self.tenant_id,
            LoteEstoque.ativo == True
        )
        resultado = await self.db.execute(query)
        gondola, armazem = resultado.first() or (0, 0)
        return int(gondola), int(armazem)

    async def criar(self, dados: ProdutoCreate) -> Produto:
        novo_produto = Produto(
            tenant_id=self.tenant_id,
            nome=dados.nome,
            descricao=dados.descricao,
            foto_url=dados.foto_url,
            codigo_barras=dados.codigo_barras,
            data_validade=dados.data_validade,
            preco_custo=dados.preco_custo,
            preco_venda=dados.preco_venda,
            categoria=dados.categoria,
            subcategoria=dados.subcategoria,
            tipo=dados.tipo,
            marca=dados.marca,
            ativo=dados.ativo,
            estoque_minimo_gondola=dados.estoque_minimo_gondola,
            estoque_minimo_armazem=dados.estoque_minimo_armazem
        )
        self.db.add(novo_produto)
        await self.db.flush() # Gera o ID do produto

        # Gera o identificador único para o QR Code da etiqueta BipFy
        novo_produto.qr_code_tag = dados.qr_code_tag or f"BIPFY-T{self.tenant_id}-P{novo_produto.id}"
        
        # Criação de Lote Inicial se houver quantidade informada
        qtd_arm = dados.estoque_inicial_armazem
        qtd_gon = dados.estoque_inicial_gondola
        
        if qtd_arm > 0 or qtd_gon > 0:
            validade = dados.data_validade or (datetime.utcnow() + timedelta(days=180))
            lote_inicial = LoteEstoque(
                tenant_id=self.tenant_id,
                produto_id=novo_produto.id,
                numero_lote=dados.numero_lote_inicial or "LOTE-INICIAL",
                data_validade=validade,
                quantidade_armazem=qtd_arm,
                quantidade_gondola=qtd_gon,
                preco_custo_unitario=dados.preco_custo
            )
            self.db.add(lote_inicial)
            await self.db.flush()
            
            if qtd_arm > 0:
                self.db.add(MovimentacaoEstoque(
                    produto_id=novo_produto.id,
                    lote_id=lote_inicial.id,
                    tipo=TipoMovimentacao.ENTRADA_COMPRA,
                    quantidade=qtd_arm,
                    local_origem="externo",
                    local_destino="armazem",
                    motivo="Estoque Inicial (Armazém)"
                ))
            if qtd_gon > 0:
                self.db.add(MovimentacaoEstoque(
                    produto_id=novo_produto.id,
                    lote_id=lote_inicial.id,
                    tipo=TipoMovimentacao.ENTRADA_COMPRA,
                    quantidade=qtd_gon,
                    local_origem="externo",
                    local_destino="gondola",
                    motivo="Estoque Inicial (Gôndola)"
                ))
            
        await self.db.commit()
        await self.db.refresh(novo_produto)
        return novo_produto

    async def atualizar(self, produto_id: int, dados: ProdutoUpdate) -> Optional[Produto]:
        produto = await self.buscar_por_id(produto_id)
        if not produto:
            return None
        
        atualizacao = dados.model_dump(exclude_unset=True)
        for campo, valor in atualizacao.items():
            setattr(produto, campo, valor)
            
        await self.db.commit()
        await self.db.refresh(produto)
        return produto

    async def registrar_movimentacao(
        self,
        produto_id: int,
        quantidade: int,
        tipo: TipoMovimentacao,
        lote_id: Optional[int] = None,
        local_origem: Optional[str] = None,
        local_destino: Optional[str] = None,
        motivo: Optional[str] = None,
        operador_id: Optional[int] = None,
        cliente_id: Optional[int] = None,
        comanda_id: Optional[int] = None,
        forma_pagamento: Optional[str] = None,
        tipo_perda: Optional[str] = None,
        justificativa_perda: Optional[str] = None,
        preco_custo_unitario: float = 0.0,
        preco_venda_unitario: float = 0.0,
        custo_total_perda: float = 0.0,
        valor_total: float = 0.0
    ) -> MovimentacaoEstoque:
        nova_movimentacao = MovimentacaoEstoque(
            tenant_id=self.tenant_id,
            produto_id=produto_id,
            lote_id=lote_id,
            tipo=tipo,
            quantidade=quantidade,
            local_origem=local_origem,
            local_destino=local_destino,
            motivo=motivo,
            operador_id=operador_id,
            cliente_id=cliente_id,
            comanda_id=comanda_id,
            forma_pagamento=forma_pagamento,
            tipo_perda=tipo_perda,
            justificativa_perda=justificativa_perda,
            preco_custo_unitario=preco_custo_unitario,
            preco_venda_unitario=preco_venda_unitario,
            custo_total_perda=custo_total_perda,
            valor_total=valor_total,
            data_movimentacao=datetime.utcnow()
        )
        self.db.add(nova_movimentacao)
        await self.db.commit()
        return nova_movimentacao

    async def listar_movimentacoes_auditoria(
        self,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None,
        tipo: Optional[str] = None,
        cliente_id: Optional[int] = None,
        forma_pagamento: Optional[str] = None,
        apenas_perdas: bool = False,
        limit: int = 200
    ) -> List[MovimentacaoEstoque]:
        query = (
            select(MovimentacaoEstoque)
            .options(
                selectinload(MovimentacaoEstoque.produto),
                selectinload(MovimentacaoEstoque.cliente),
                selectinload(MovimentacaoEstoque.operador)
            )
            .where(
                or_(
                    MovimentacaoEstoque.tenant_id == self.tenant_id,
                    MovimentacaoEstoque.tenant_id.is_(None)
                )
            )
        )

        if data_inicio:
            query = query.where(MovimentacaoEstoque.data_movimentacao >= data_inicio)
        if data_fim:
            query = query.where(MovimentacaoEstoque.data_movimentacao <= data_fim)
        if tipo:
            query = query.where(MovimentacaoEstoque.tipo == tipo)
        if cliente_id:
            query = query.where(MovimentacaoEstoque.cliente_id == cliente_id)
        if forma_pagamento:
            query = query.where(MovimentacaoEstoque.forma_pagamento == forma_pagamento)
        if apenas_perdas:
            query = query.where(MovimentacaoEstoque.tipo == TipoMovimentacao.PERDA_QUEBRA)

        query = query.order_by(MovimentacaoEstoque.data_movimentacao.desc()).limit(limit)
        resultado = await self.db.execute(query)
        return resultado.scalars().all() # type: ignore
