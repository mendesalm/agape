from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.repositories.produto_repository import ProdutoRepository
from app.schemas.produto_schema import (
    ProdutoCreate, 
    ProdutoUpdate, 
    LoteEntradaCreate, 
    TransferenciaEstoqueRequest,
    AlertaEstoqueGeral
)
from app.models.produto import Produto
from app.models.estoque import LoteEstoque
from app.models.movimentacao_estoque import TipoMovimentacao
from app.core.exceptions import NaoEncontradoException, RegraNegocioException

class ProdutoService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.repo = ProdutoRepository(db, tenant_id)
        self.db = db
        self.tenant_id = tenant_id

    def _processar_lote_metadados(self, lote: LoteEstoque) -> LoteEstoque:
        hoje = datetime.utcnow()
        delta = (lote.data_validade - hoje).days
        setattr(lote, "dias_para_vencer", delta)
        
        if delta < 0:
            status = "vencido"
        elif delta <= 30:
            status = "vencendo"
        else:
            status = "ok"
        setattr(lote, "status_validade", status)
        return lote

    async def _injetar_dados_estoque(self, produto: Produto) -> Produto:
        gondola, armazem = await self.repo.obter_totais_estoque(produto.id)
        
        setattr(produto, "quantidade_gondola", gondola)
        setattr(produto, "quantidade_armazem", armazem)
        setattr(produto, "quantidade_estoque", gondola + armazem)
        
        # Alertas de Estoque Mínimo e Reposição
        alerta_reposicao = (gondola <= produto.estoque_minimo_gondola) and (armazem > 0)
        alerta_compra = (armazem <= produto.estoque_minimo_armazem)
        
        setattr(produto, "alerta_reposicao_gondola", alerta_reposicao)
        setattr(produto, "alerta_compra_armazem", alerta_compra)
        
        # Processa cada lote do produto com cálculo de dias e status de validade
        if hasattr(produto, "lotes") and produto.lotes:
            for lote in produto.lotes:
                self._processar_lote_metadados(lote)
                
        return produto

    async def listar_produtos(self, skip: int = 0, limit: int = 100) -> List[Produto]:
        produtos = await self.repo.listar_todos(skip, limit)
        for p in produtos:
            await self._injetar_dados_estoque(p)
        return produtos

    async def obter_produto(self, produto_id: int) -> Produto:
        produto = await self.repo.buscar_por_id(produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")
        return await self._injetar_dados_estoque(produto)

    async def buscar_por_codigo(self, codigo: str) -> Produto:
        produto = await self.repo.buscar_por_codigo(codigo)
        if not produto:
            raise NaoEncontradoException(f"Produto com código '{codigo}' não encontrado.")
        return await self._injetar_dados_estoque(produto)

    async def criar_produto(self, dados: ProdutoCreate) -> Produto:
        if dados.preco_venda <= 0:
            raise RegraNegocioException("O preço de venda deve ser maior que zero.")
        
        produto = await self.repo.criar(dados)
        logger.info(f"Produto {produto.nome} criado no tenant {self.tenant_id}.")
        return await self.obter_produto(produto.id)

    async def atualizar_produto(self, produto_id: int, dados: ProdutoUpdate) -> Produto:
        produto = await self.repo.atualizar(produto_id, dados)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")
        return await self.obter_produto(produto.id)

    async def registrar_entrada_lote(self, produto_id: int, dados: LoteEntradaCreate) -> Produto:
        """
        Cadastra um novo lote ou adiciona saldo a um lote existente,
        alocando no Armazém ou diretamente na Gôndola.
        """
        produto = await self.repo.buscar_por_id(produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")

        lote = await self.repo.buscar_lote_por_numero(produto_id, dados.numero_lote)
        
        if lote:
            # Lote já existe: incrementa no local escolhido
            if dados.destino == "armazem":
                lote.quantidade_armazem += dados.quantidade
            else:
                lote.quantidade_gondola += dados.quantidade
        else:
            # Novo lote registrado com sua validade específica
            lote = LoteEstoque(
                tenant_id=self.tenant_id,
                produto_id=produto_id,
                numero_lote=dados.numero_lote,
                data_validade=dados.data_validade,
                data_fabricacao=dados.data_fabricacao,
                quantidade_armazem=dados.quantidade if dados.destino == "armazem" else 0,
                quantidade_gondola=dados.quantidade if dados.destino == "gondola" else 0,
                preco_custo_unitario=dados.preco_custo_unitario or produto.preco_custo
            )
            self.db.add(lote)
            await self.db.flush()

        # Registra a movimentação rastreável
        await self.repo.registrar_movimentacao(
            produto_id=produto_id,
            lote_id=lote.id,
            tipo=TipoMovimentacao.ENTRADA_COMPRA,
            quantidade=dados.quantidade,
            local_origem="externo",
            local_destino=dados.destino,
            motivo=f"Entrada de Lote {dados.numero_lote} ({dados.destino})"
        )
        await self.db.commit()
        logger.info(f"Entrada de {dados.quantidade} un do lote {dados.numero_lote} no produto {produto.nome}.")
        return await self.obter_produto(produto_id)

    async def transferir_para_gondola(self, produto_id: int, dados: TransferenciaEstoqueRequest) -> Produto:
        """
        Transfere produtos do Armazém para a Gôndola (Reposição interna).
        Aplica o algoritmo FEFO (First Expired, First Out) automaticamente quando
        um lote específico não é informado, garantindo que os lotes que vencem antes
        sejam colocados na área de venda com prioridade!
        """
        produto = await self.repo.buscar_por_id(produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")

        _, total_armazem = await self.repo.obter_totais_estoque(produto_id)
        if total_armazem < dados.quantidade:
            raise RegraNegocioException(
                f"Estoque insuficiente no Armazém. Solicitado: {dados.quantidade}, Disponível: {total_armazem}"
            )

        restante_para_transferir = dados.quantidade

        if dados.lote_id:
            # Transferência de lote específico
            lote = await self.repo.buscar_lote_por_id(dados.lote_id)
            if not lote or lote.produto_id != produto_id:
                raise NaoEncontradoException("Lote informado não pertence a este produto.")
            if lote.quantidade_armazem < dados.quantidade:
                raise RegraNegocioException(
                    f"Saldo insuficiente no Armazém para o lote {lote.numero_lote}. Disponível: {lote.quantidade_armazem}"
                )
            lote.quantidade_armazem -= dados.quantidade
            lote.quantidade_gondola += dados.quantidade
            
            await self.repo.registrar_movimentacao(
                produto_id=produto_id,
                lote_id=lote.id,
                tipo=TipoMovimentacao.TRANSFERENCIA_GONDOLA,
                quantidade=dados.quantidade,
                local_origem="armazem",
                local_destino="gondola",
                motivo=f"Transferência manual do Lote {lote.numero_lote}"
            )
        else:
            # FEFO Automático: pega os lotes do Armazém que vencem primeiro
            lotes_fefo = await self.repo.listar_lotes_fefo_armazem(produto_id)
            for lote in lotes_fefo:
                if restante_para_transferir <= 0:
                    break
                qtd_a_transferir = min(lote.quantidade_armazem, restante_para_transferir)
                lote.quantidade_armazem -= qtd_a_transferir
                lote.quantidade_gondola += qtd_a_transferir
                restante_para_transferir -= qtd_a_transferir

                await self.repo.registrar_movimentacao(
                    produto_id=produto_id,
                    lote_id=lote.id,
                    tipo=TipoMovimentacao.TRANSFERENCIA_GONDOLA,
                    quantidade=qtd_a_transferir,
                    local_origem="armazem",
                    local_destino="gondola",
                    motivo=f"Reposição FEFO automática (Lote {lote.numero_lote})"
                )

        await self.db.commit()
        logger.info(f"{dados.quantidade} un transferidas para Gôndola do produto {produto.nome}.")
        return await self.obter_produto(produto_id)

    async def transferir_para_armazem(self, produto_id: int, dados: TransferenciaEstoqueRequest) -> Produto:
        """
        Retorna itens da Gôndola de volta para o Armazém.
        """
        produto = await self.repo.buscar_por_id(produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")

        total_gondola, _ = await self.repo.obter_totais_estoque(produto_id)
        if total_gondola < dados.quantidade:
            raise RegraNegocioException(
                f"Estoque insuficiente na Gôndola. Solicitado: {dados.quantidade}, Disponível: {total_gondola}"
            )

        restante = dados.quantidade
        lotes_fefo = await self.repo.listar_lotes_fefo_gondola(produto_id)
        
        for lote in lotes_fefo:
            if restante <= 0:
                break
            qtd = min(lote.quantidade_gondola, restante)
            lote.quantidade_gondola -= qtd
            lote.quantidade_armazem += qtd
            restante -= qtd

            await self.repo.registrar_movimentacao(
                produto_id=produto_id,
                lote_id=lote.id,
                tipo=TipoMovimentacao.TRANSFERENCIA_ARMAZEM,
                quantidade=qtd,
                local_origem="gondola",
                local_destino="armazem",
                motivo=f"Retorno para armazém (Lote {lote.numero_lote})"
            )

        await self.db.commit()
        return await self.obter_produto(produto_id)

    async def consumir_gondola_fefo(self, produto_id: int, quantidade: int, motivo: str = "Venda") -> List[dict]:
        """
        Baixa itens diretamente da Gôndola utilizando o algoritmo FEFO
        (First Expired, First Out - os lotes mais próximos do vencimento saem primeiro).
        Usado em Vendas (Self-Checkout e Comandas).
        """
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade consumida deve ser maior que zero.")

        produto = await self.repo.buscar_por_id(produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")

        total_gondola, total_armazem = await self.repo.obter_totais_estoque(produto_id)
        
        if total_gondola < quantidade:
            msg = f"Estoque insuficiente na Gôndola para {produto.nome}. Disponível na geladeira: {total_gondola}."
            if total_armazem > 0:
                msg += f" (Existem {total_armazem} unidades no Armazém aguardando reposição)."
            raise RegraNegocioException(msg)

        lotes_fefo = await self.repo.listar_lotes_fefo_gondola(produto_id)
        restante = quantidade
        lotes_consumidos = []

        for lote in lotes_fefo:
            if restante <= 0:
                break
            qtd_abater = min(lote.quantidade_gondola, restante)
            lote.quantidade_gondola -= qtd_abater
            restante -= qtd_abater

            # Movimentação com quantidade negativa para refletir saída de estoque
            await self.repo.registrar_movimentacao(
                produto_id=produto_id,
                lote_id=lote.id,
                tipo=TipoMovimentacao.SAIDA_VENDA,
                quantidade=-qtd_abater,
                local_origem="gondola",
                local_destino="externo",
                motivo=f"{motivo} (Lote: {lote.numero_lote})"
            )

            lotes_consumidos.append({
                "lote_id": lote.id,
                "numero_lote": lote.numero_lote,
                "validade": lote.data_validade.isoformat(),
                "quantidade_consumida": qtd_abater
            })

        await self.db.commit()
        return lotes_consumidos

    async def registrar_perda(self, produto_id: int, quantidade: int, motivo: str, local: str = "gondola", lote_id: Optional[int] = None):
        """
        Registra perda/quebra/vencimento de produto, abatendo do lote específico ou pelo FEFO.
        """
        if quantidade <= 0:
            raise RegraNegocioException("A quantidade da perda deve ser positiva.")

        produto = await self.repo.buscar_por_id(produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {produto_id})")

        if lote_id:
            lote = await self.repo.buscar_lote_por_id(lote_id)
            if not lote or lote.produto_id != produto_id:
                raise NaoEncontradoException("Lote não encontrado.")
            
            saldo_local = lote.quantidade_gondola if local == "gondola" else lote.quantidade_armazem
            if saldo_local < quantidade:
                raise RegraNegocioException(f"Saldo insuficiente no lote para a perda informada ({saldo_local} disponíveis).")

            if local == "gondola":
                lote.quantidade_gondola -= quantidade
            else:
                lote.quantidade_armazem -= quantidade

            await self.repo.registrar_movimentacao(
                produto_id=produto_id,
                lote_id=lote.id,
                tipo=TipoMovimentacao.PERDA_QUEBRA,
                quantidade=-quantidade,
                local_origem=local,
                local_destino="externo",
                motivo=motivo
            )
        else:
            # Baixa no local indicado utilizando FEFO
            lotes = await (self.repo.listar_lotes_fefo_gondola(produto_id) if local == "gondola" else self.repo.listar_lotes_fefo_armazem(produto_id))
            restante = quantidade
            total_disponivel = sum(l.quantidade_gondola if local == "gondola" else l.quantidade_armazem for l in lotes)
            
            if total_disponivel < quantidade:
                raise RegraNegocioException(f"Saldo insuficiente em {local} para a perda informada.")

            for l in lotes:
                if restante <= 0:
                    break
                saldo_l = l.quantidade_gondola if local == "gondola" else l.quantidade_armazem
                qtd_baixa = min(saldo_l, restante)
                if local == "gondola":
                    l.quantidade_gondola -= qtd_baixa
                else:
                    l.quantidade_armazem -= qtd_baixa
                restante -= qtd_baixa

                await self.repo.registrar_movimentacao(
                    produto_id=produto_id,
                    lote_id=l.id,
                    tipo=TipoMovimentacao.PERDA_QUEBRA,
                    quantidade=-qtd_baixa,
                    local_origem=local,
                    local_destino="externo",
                    motivo=motivo
                )

        await self.db.commit()
        logger.warning(f"Perda de {quantidade} registrada para produto {produto_id} em {local}. Motivo: {motivo}")
        return await self.obter_produto(produto_id)

    async def obter_painel_alertas(self) -> AlertaEstoqueGeral:
        """
        Retorna o painel consolidado de alertas de suprimento e validade para o Bar:
        1. Reposições pendentes (gôndola baixa mas armazém tem saldo)
        2. Compras necessárias (armazém atingiu o nível mínimo)
        3. Lotes vencendo em até 30 dias
        4. Lotes já vencidos
        """
        produtos = await self.listar_produtos(limit=1000)
        
        reposicoes = [p for p in produtos if p.alerta_reposicao_gondola]
        compras = [p for p in produtos if p.alerta_compra_armazem]
        
        lotes_vencendo = []
        lotes_vencidos = []
        
        for p in produtos:
            for l in p.lotes:
                saldo_total = l.quantidade_gondola + l.quantidade_armazem
                if saldo_total > 0:
                    if l.status_validade == "vencido":
                        lotes_vencidos.append(l)
                    elif l.status_validade == "vencendo":
                        lotes_vencendo.append(l)

        return AlertaEstoqueGeral(
            reposicoes_pendentes=reposicoes,
            compras_necessarias=compras,
            lotes_vencendo=lotes_vencendo,
            lotes_vencidos=lotes_vencidos
        )
