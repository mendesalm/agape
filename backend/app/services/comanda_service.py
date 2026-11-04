from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.comanda_repository import ComandaRepository
from app.repositories.produto_repository import ProdutoRepository
from app.schemas.comanda_schema import ComandaCreate, ItemComandaCreate
from app.models.comanda import Comanda, StatusComanda
from app.models.movimentacao_estoque import TipoMovimentacao
from app.core.exceptions import NaoEncontradoException, RegraNegocioException
from loguru import logger

class ComandaService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.repo_comanda = ComandaRepository(db, tenant_id)
        self.repo_produto = ProdutoRepository(db, tenant_id)
        self.tenant_id = tenant_id

    def _enriquecer_comanda(self, comanda: Comanda) -> Comanda:
        setattr(comanda, "total", sum(item.quantidade * item.valor_unitario for item in comanda.itens))
        for item in comanda.itens:
            if hasattr(item, "produto") and item.produto:
                setattr(item, "produto_nome", item.produto.nome)
            if hasattr(item, "status") and item.status:
                setattr(item, "status", item.status.value if hasattr(item.status, "value") else str(item.status))
        return comanda

    async def listar_comandas(self, status: Optional[StatusComanda] = None, skip: int = 0, limit: int = 100):
        comandas = await self.repo_comanda.listar_todas(status, skip, limit)
        for c in comandas:
            self._enriquecer_comanda(c)
        return comandas

    async def obter_comanda(self, comanda_id: int):
        comanda = await self.repo_comanda.buscar_por_id(comanda_id)
        if not comanda:
            raise NaoEncontradoException(f"Comanda (ID: {comanda_id})")
        return self._enriquecer_comanda(comanda)

    async def buscar_ou_abrir_por_cartao(self, identificador_cartao: str, nome_cliente: Optional[str] = None):
        """
        Localiza comanda aberta pelo Cartão/QR Code do cliente, ou abre uma nova
        caso ele não possua uma comanda ativa no momento.
        """
        comanda = await self.repo_comanda.buscar_por_cartao(identificador_cartao)
        if not comanda:
            # Abre nova comanda vinculada ao cartão
            dados = ComandaCreate(
                identificador_cartao=identificador_cartao,
                nome_cliente=nome_cliente or f"Cliente {identificador_cartao}"
            )
            comanda = await self.repo_comanda.criar(dados)
            logger.info(f"Nova comanda #{comanda.id} criada para o cartão/QR {identificador_cartao}.")

        return self._enriquecer_comanda(comanda)

    async def abrir_comanda(self, dados: ComandaCreate):
        if dados.identificador_cartao:
            comanda_existente = await self.repo_comanda.buscar_por_cartao(dados.identificador_cartao)
            if comanda_existente:
                raise RegraNegocioException(f"Já existe uma comanda aberta para o cartão {dados.identificador_cartao}.")
        
        comanda = await self.repo_comanda.criar(dados)
        setattr(comanda, "total", 0.0)
        logger.info(f"Comanda {comanda.id} aberta. Tenant: {self.tenant_id}")
        return comanda

    async def adicionar_item(self, comanda_id: int, dados: ItemComandaCreate):
        comanda = await self.obter_comanda(comanda_id)
        
        if comanda.status != StatusComanda.ABERTA:
            raise RegraNegocioException(f"Não é possível adicionar itens. A comanda está {comanda.status.value}.")

        produto = await self.repo_produto.buscar_por_id(dados.produto_id)
        if not produto:
            raise NaoEncontradoException(f"Produto (ID: {dados.produto_id})")
            
        if not produto.ativo:
            raise RegraNegocioException("Não é possível vender um produto inativo.")

        # Consome da Gôndola aplicando FEFO (Prioriza lotes com menor validade)
        from app.services.produto_service import ProdutoService
        produto_service = ProdutoService(self.repo_comanda.db, self.tenant_id)
        await produto_service.consumir_gondola_fefo(
            produto_id=produto.id,
            quantidade=dados.quantidade,
            motivo=f"Venda na comanda #{comanda_id}"
        )

        # Registra o item travando o preço de venda atual
        await self.repo_comanda.adicionar_item(
            comanda_id=comanda_id,
            produto_id=produto.id,
            quantidade=dados.quantidade,
            valor_unitario=produto.preco_venda 
        )

        logger.info(f"{dados.quantidade}x {produto.nome} (Saída Venda) adicionado à comanda {comanda_id}.")
        return await self.obter_comanda(comanda_id)

    async def fechar_comanda(self, comanda_id: int):
        from app.models.transacao_financeira import TransacaoFinanceira, TipoTransacao
        
        comanda = await self.obter_comanda(comanda_id)
        if comanda.status != StatusComanda.ABERTA:
            raise RegraNegocioException("Esta comanda não está aberta.")
            
        comanda = await self.repo_comanda.atualizar_status(comanda, StatusComanda.FECHADA)
        
        # Gera o registro financeiro (Receita) com o total da comanda
        transacao = TransacaoFinanceira(
            tenant_id=self.tenant_id,
            tipo=TipoTransacao.RECEITA,
            valor=comanda.total,
            descricao=f"Fechamento da Comanda #{comanda.id}",
            origem_id=comanda.id
        )
        self.repo_comanda.db.add(transacao)
        await self.repo_comanda.db.commit()
        
        logger.info(f"Comanda {comanda.id} (Tenant {self.tenant_id}) fechada com sucesso. Receita registrada.")
        return comanda
