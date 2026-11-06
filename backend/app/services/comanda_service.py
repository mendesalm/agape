from typing import Optional, List
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from loguru import logger

from app.repositories.comanda_repository import ComandaRepository
from app.repositories.produto_repository import ProdutoRepository
from app.schemas.comanda_schema import (
    ComandaCreate, 
    ItemComandaCreate, 
    FecharComandaRequest, 
    ComprovanteTermicoResponse
)
from app.models.comanda import Comanda, ItemComanda, StatusComanda
from app.models.produto import Produto
from app.models.cliente import Cliente, CartaoFisico, VinculoCartaoCliente, CarteiraCliente, TipoTransacaoCarteira
from app.models.estabelecimento import Estabelecimento
from app.models.usuario import Usuario
from app.models.movimentacao_estoque import MovimentacaoEstoque, TipoMovimentacao
from app.models.transacao_financeira import TransacaoFinanceira, TipoTransacao
from app.services.carteira_service import CarteiraService
from app.core.exceptions import NaoEncontradoException, RegraNegocioException

class ComandaService:
    def __init__(self, db: AsyncSession, tenant_id: int):
        self.repo_comanda = ComandaRepository(db, tenant_id)
        self.repo_produto = ProdutoRepository(db, tenant_id)
        self.db = db
        self.tenant_id = tenant_id

    def _enriquecer_comanda(self, comanda: Comanda) -> Comanda:
        total = sum(item.quantidade * item.valor_unitario for item in comanda.itens)
        setattr(comanda, "total", float(total))
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

    async def obter_comanda(self, comanda_id: int) -> Comanda:
        comanda = await self.repo_comanda.buscar_por_id(comanda_id)
        if not comanda:
            raise NaoEncontradoException(f"Comanda (ID: {comanda_id})")
        return self._enriquecer_comanda(comanda)

    async def buscar_ou_abrir_por_cartao(self, identificador_cartao: str, nome_cliente: Optional[str] = None):
        """
        Localiza comanda aberta pelo Cartão/QR Code do cliente, ou abre uma nova
        caso ele não possua uma comanda ativa no momento.
        Vincula automaticamente o Cliente caso o cartão pertença a um irmão/visitante.
        """
        identificador_limpo = identificador_cartao.strip()
        comanda = await self.repo_comanda.buscar_por_cartao(identificador_limpo)

        # Se não existe comanda aberta, verifica vínculo de cliente
        cliente_id_vinculado: Optional[int] = None
        nome_encontrado = nome_cliente

        # 1. Checa se o cartão é um Cartão Físico Coringa com vínculo ativo
        res_vinc = await self.db.execute(
            select(VinculoCartaoCliente)
            .options(selectinload(VinculoCartaoCliente.cliente), selectinload(VinculoCartaoCliente.cartao))
            .join(CartaoFisico, VinculoCartaoCliente.cartao_id == CartaoFisico.id)
            .where(
                CartaoFisico.codigo_identificador == identificador_limpo,
                VinculoCartaoCliente.ativo == True
            )
        )
        vinculo = res_vinc.scalars().first()
        if vinculo and vinculo.cliente:
            cliente_id_vinculado = vinculo.cliente.id
            nome_encontrado = vinculo.cliente.nome

        # 2. Se não achou por coringa, checa se o identificador é CPF, CIM ou Nome do cliente
        if not cliente_id_vinculado:
            # Trava de segurança: impede que código de barras de produto abra comanda fantasma de cliente
            res_prod_check = await self.db.execute(
                select(Produto).where(
                    (Produto.codigo_barras == identificador_limpo) |
                    (Produto.qr_code_tag == identificador_limpo)
                )
            )
            prod_encontrado = res_prod_check.scalars().first()
            if prod_encontrado:
                raise RegraNegocioException(
                    f"O código escaneado pertence ao produto '{prod_encontrado.nome}'. "
                    f"Aponte a câmera para o QR Code do CLIENTE (ou digite CPF/CIM)."
                )

            # Suporte a QR Code oficial da Credencial Digital Ágape (Ex: AGAPE:CLI:14 ou AGAPE:CLI:14:123456)
            cli_id_extraido = None
            if identificador_limpo.startswith("AGAPE:CLI:"):
                partes = identificador_limpo.split(":")
                if len(partes) >= 3 and partes[2].isdigit():
                    cli_id_extraido = int(partes[2])

            cpf_digitos = identificador_limpo.replace('.', '').replace('-', '').replace('/', '').strip()
            
            condicoes_cliente = [
                Cliente.cpf == identificador_limpo,
                Cliente.cpf == cpf_digitos,
                Cliente.cim == identificador_limpo,
                Cliente.cpf == f"CIM:{identificador_limpo}",
                Cliente.nome.ilike(f"%{identificador_limpo}%")
            ]
            if cli_id_extraido:
                condicoes_cliente.append(Cliente.id == cli_id_extraido)

            res_cli = await self.db.execute(
                select(Cliente).where(or_(*condicoes_cliente))
            )
            cli = res_cli.scalars().first()

            # 2.1 Busca por Documentos Atrelados no Array JSONB (CNH, CNI, e-GOB, Militares, OAB)
            if not cli:
                try:
                    res_doc = await self.db.execute(
                        select(Cliente).where(
                            Cliente.identificadores_qr.contains([{"codigo": identificador_limpo}])
                        )
                    )
                    cli_doc = res_doc.scalars().first()
                    if cli_doc:
                        cli = cli_doc
                except Exception as ex:
                    logger.debug(f"Busca por documento JSONB: {ex}")

            if cli:
                cliente_id_vinculado = cli.id
                nome_encontrado = cli.nome
            else:
                # 3. Tenta localizar na tabela 'obreiros' do lojas_db e sincronizar on-the-fly
                try:
                    from sqlalchemy import text
                    res_ob = await self.db.execute(
                        text("""
                            SELECT id, nome_completo, cpf, cim, email 
                            FROM obreiros 
                            WHERE REPLACE(REPLACE(COALESCE(cpf, ''), '.', ''), '-', '') = :cpf_limpo
                               OR TRIM(COALESCE(cim, '')) = :raw
                               OR LOWER(COALESCE(nome_completo, '')) LIKE :nome_like
                            LIMIT 1
                        """),
                        {
                            "cpf_limpo": cpf_digitos,
                            "raw": identificador_limpo,
                            "nome_like": f"%{identificador_limpo.lower()}%"
                        }
                    )
                    row_ob = res_ob.mappings().first()
                    if row_ob:
                        novo_cli = Cliente(
                            nome=row_ob["nome_completo"],
                            cpf=row_ob["cpf"] or f"CIM:{row_ob['cim']}",
                            cim=row_ob["cim"],
                            email=row_ob["email"],
                            obreiro_esigma_id=row_ob["id"],
                            tipo_consumidor="IRMAO_QUADRO"
                        )
                        self.db.add(novo_cli)
                        await self.db.commit()
                        await self.db.refresh(novo_cli)
                        cliente_id_vinculado = novo_cli.id
                        nome_encontrado = novo_cli.nome
                except Exception as e_ob:
                    logger.warning(f"Erro ao buscar obreiro no lojas_db: {e_ob}")

        if not comanda:
            dados = ComandaCreate(
                identificador_cartao=identificador_limpo,
                nome_cliente=nome_encontrado or f"Cliente {identificador_limpo}",
                cliente_id=cliente_id_vinculado
            )
            comanda = await self.repo_comanda.criar(dados, cliente_id=cliente_id_vinculado)
            logger.info(f"Nova comanda #{comanda.id} aberta para cartão/QR {identificador_limpo} (Cliente #{cliente_id_vinculado}).")
        else:
            # Se a comanda já existia mas não tinha cliente_id vinculado, aproveita para vincular
            if cliente_id_vinculado and not comanda.cliente_id:
                comanda.cliente_id = cliente_id_vinculado
                if nome_encontrado and (not comanda.nome_cliente or "Cliente AGAPE" in comanda.nome_cliente):
                    comanda.nome_cliente = nome_encontrado
                await self.db.commit()

        return await self.obter_comanda(comanda.id)

    async def abrir_comanda(self, dados: ComandaCreate):
        if dados.identificador_cartao:
            comanda_existente = await self.repo_comanda.buscar_por_cartao(dados.identificador_cartao)
            if comanda_existente:
                raise RegraNegocioException(f"Já existe uma comanda aberta para o cartão {dados.identificador_cartao}.")
        
        comanda = await self.repo_comanda.criar(dados, cliente_id=dados.cliente_id)
        setattr(comanda, "total", 0.0)
        logger.info(f"Comanda {comanda.id} aberta no bar (Tenant: {self.tenant_id}).")
        return comanda

    async def adicionar_item(self, comanda_id: int, dados: ItemComandaCreate, operador_id: Optional[int] = None):
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

        # Registra o item na comanda com o preço congelado no ato da venda
        novo_item = ItemComanda(
            comanda_id=comanda_id,
            produto_id=produto.id,
            operador_id=operador_id,
            quantidade=dados.quantidade,
            valor_unitario=produto.preco_venda
        )
        self.db.add(novo_item)
        await self.db.commit()

        logger.info(f"{dados.quantidade}x {produto.nome} adicionado à comanda #{comanda_id} (Operador #{operador_id}).")
        return await self.obter_comanda(comanda_id)

    async def remover_item(self, comanda_id: int, item_id: int, operador_id: Optional[int] = None):
        """
        Remove um item adicionado por engano a uma comanda aberta, estornando
        o estoque para a gôndola e recalculando o total da comanda.
        """
        comanda = await self.obter_comanda(comanda_id)
        if comanda.status != StatusComanda.ABERTA:
            raise RegraNegocioException(f"Não é possível remover itens. A comanda está {comanda.status.value}.")

        res_item = await self.db.execute(
            select(ItemComanda).where(
                ItemComanda.id == item_id,
                ItemComanda.comanda_id == comanda_id
            )
        )
        item = res_item.scalar_one_or_none()
        if not item:
            raise NaoEncontradoException(f"Item #{item_id} na comanda #{comanda_id}")

        # Estorna o estoque para a gôndola do primeiro lote ativo
        from app.models.estoque import LoteEstoque
        res_lote = await self.db.execute(
            select(LoteEstoque).where(
                LoteEstoque.produto_id == item.produto_id,
                LoteEstoque.ativo == True
            ).order_by(LoteEstoque.data_validade.asc())
        )
        lote = res_lote.scalars().first()
        if lote:
            lote.quantidade_gondola += item.quantidade
            self.db.add(lote)

        # Remove o item
        await self.db.delete(item)
        await self.db.commit()

        logger.info(f"Item #{item_id} estornado da comanda #{comanda_id} (Operador #{operador_id}).")
        return await self.obter_comanda(comanda_id)

    async def fechar_comanda(
        self, 
        comanda_id: int, 
        dados: Optional[FecharComandaRequest] = None,
        usuario: Optional[Usuario] = None
    ):
        """
        Encerra a comanda, processa o pagamento com as formas de pagamento autorizadas,
        valida o teto de fiado (máx R$ 100 devedor), debita carteira e registra a receita
        no caixa ISOLADO do bar.
        """
        comanda = await self.obter_comanda(comanda_id)
        if comanda.status != StatusComanda.ABERTA:
            raise RegraNegocioException("Esta comanda não está aberta.")

        total_venda = float(comanda.total)
        forma_pagamento = dados.forma_pagamento.lower() if dados else "pix"
        operador_id = usuario.id if usuario else None

        # Vincula cliente caso informado no payload
        if dados and dados.cliente_id and not comanda.cliente_id:
            comanda.cliente_id = dados.cliente_id

        # Se for pagamento via Saldo / Fiado na Conta do Bar
        if forma_pagamento in ["saldo_bar_fiado", "fiado", "saldo_bar"]:
            if not comanda.cliente_id:
                raise HTTPException(
                    status_code=422,
                    detail="Para pagamento no Saldo/Fiado da conta do bar, é obrigatório selecionar/identificar o cliente obreiro."
                )

            # Localiza ou inicializa a carteira do irmão no bar
            carteira = await CarteiraService.obter_ou_criar_carteira(self.db, comanda.cliente_id, self.tenant_id)
            
            # Validação do Limite de Fiado (máximo R$ 100,00 devedor)
            limite = getattr(carteira, "limite_fiado", None) or CarteiraService.LIMITE_FIADO_PADRAO
            novo_saldo = carteira.saldo - total_venda
            if novo_saldo < -limite:
                saldo_devedor = abs(novo_saldo)
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Venda a fiado bloqueada: limite devedor máximo (R$ {limite:.2f}) seria ultrapassado. "
                        f"Saldo atual: R$ {carteira.saldo:.2f}, Compra: R$ {total_venda:.2f}, Saldo após compra: -R$ {saldo_devedor:.2f}. "
                        f"O irmão deve recarregar a conta do bar ou pagar por Pix/Dinheiro/Cartão."
                    )
                )

            # Processa o débito na carteira via Event Sourcing
            await CarteiraService.processar_transacao(
                db=self.db,
                carteira_id=carteira.id,
                tipo=TipoTransacaoCarteira.DEBITO_PEDIDO,
                valor=total_venda,
                descricao=f"Consumação Comanda #{comanda.id}",
                referencia_externa=f"COMANDA-{comanda.id}"
            )

        # Atualiza dados da comanda fechada
        comanda.status = StatusComanda.FECHADA
        comanda.data_fechamento = datetime.utcnow()
        comanda.operador_id = operador_id
        comanda.forma_pagamento = forma_pagamento
        comanda.valor_total = total_venda
        comanda.troco = float(dados.troco or 0.0) if dados else 0.0
        comanda.observacao = dados.observacao if dados else None

        # Registra a receita no caixa ISOLADO do Bar
        transacao_bar = TransacaoFinanceira(
            tenant_id=self.tenant_id,
            tipo=TipoTransacao.RECEITA,
            valor=total_venda,
            descricao=f"Fechamento Comanda #{comanda.id} ({forma_pagamento.upper()})",
            origem_id=comanda.id,
            data_transacao=datetime.utcnow()
        )
        self.db.add(transacao_bar)

        # Atualiza / audita as movimentações de estoque associadas
        from sqlalchemy import update
        await self.db.execute(
            update(MovimentacaoEstoque)
            .where(MovimentacaoEstoque.motivo.like(f"%comanda #{comanda.id}%"))
            .values(
                tenant_id=self.tenant_id,
                operador_id=operador_id,
                cliente_id=comanda.cliente_id,
                comanda_id=comanda.id,
                forma_pagamento=forma_pagamento,
                valor_total=total_venda
            )
        )

        await self.db.commit()
        logger.info(f"Comanda #{comanda.id} fechada com sucesso via {forma_pagamento}. Valor: R$ {total_venda:.2f}.")
        return await self.obter_comanda(comanda.id)

    async def gerar_comprovante_termico(self, comanda_id: int) -> ComprovanteTermicoResponse:
        """
        Gera os dados e a formatação textual padrão para impressão em bobina térmica (58mm/80mm).
        """
        comanda = await self.obter_comanda(comanda_id)
        
        # Dados do estabelecimento
        res_est = await self.db.execute(select(Estabelecimento).where(Estabelecimento.id == self.tenant_id))
        est = res_est.scalars().first()
        nome_bar = getattr(est, "nome_fantasia", None) or getattr(est, "nome", "ÁGAPE - SALÃO DE FESTAS & BAR")
        loja_numero = getattr(est, "numero_loja", None) if est else None

        # Operador
        nome_op = "Atendente Balcão"
        if comanda.operador_id:
            res_op = await self.db.execute(select(Usuario).where(Usuario.id == comanda.operador_id))
            op = res_op.scalars().first()
            if op:
                nome_op = op.nome

        # Cliente e Saldo do Bar
        nome_cli = comanda.nome_cliente or "Cliente Avulso"
        doc_cli = ""
        tipo_cli = "Consumidor"
        saldo_ant = None
        saldo_pos = None

        if comanda.cliente_id:
            res_cli = await self.db.execute(
                select(Cliente).options(selectinload(Cliente.carteiras)).where(Cliente.id == comanda.cliente_id)
            )
            cli = res_cli.scalars().first()
            if cli:
                nome_cli = cli.nome
                doc_cli = cli.cim or cli.cpf
                tipo_cli = cli.tipo_consumidor or "Obreiro"
                # Carteira do Bar
                for cart in cli.carteiras:
                    if cart.tenant_id == self.tenant_id:
                        saldo_pos = cart.saldo
                        saldo_ant = (cart.saldo + comanda.total) if comanda.forma_pagamento in ["saldo_bar_fiado", "fiado"] else cart.saldo
                        break

        # Montagem do Layout Térmico ESC/POS (Linhas de 32 a 42 caracteres)
        data_formatada = (comanda.data_fechamento or comanda.data_abertura).strftime("%d/%m/%Y %H:%M:%S")
        linhas = []
        linhas.append("=" * 38)
        linhas.append(nome_bar[:38].center(38))
        if loja_numero:
            linhas.append(f"Loja Nº {loja_numero}".center(38))
        linhas.append("SISTEMA DE CONSUMO ÁGAPE (BAR)".center(38))
        linhas.append("-" * 38)
        linhas.append(f"COMPROVANTE Nº: {comanda.id:05d}")
        linhas.append(f"DATA/HORA:     {data_formatada}")
        linhas.append(f"OPERADOR:      {nome_op[:23]}")
        linhas.append(f"CLIENTE:       {nome_cli[:23]}")
        if doc_cli:
            linhas.append(f"DOC/CIM:       {doc_cli}")
        linhas.append("-" * 38)
        linhas.append("QTD  ITEM                VL.UN   TOTAL")
        linhas.append("-" * 38)

        itens_dict = []
        for it in comanda.itens:
            nome_p = getattr(it, "produto_nome", f"Item #{it.produto_id}")[:16]
            subtotal = it.quantidade * it.valor_unitario
            linha_item = f"{it.quantidade:<3}  {nome_p:<17} {it.valor_unitario:>6.2f} {subtotal:>7.2f}"
            linhas.append(linha_item)
            itens_dict.append({
                "produto_nome": nome_p,
                "quantidade": it.quantidade,
                "valor_unitario": it.valor_unitario,
                "subtotal": subtotal
            })

        linhas.append("-" * 38)
        linhas.append(f"TOTAL:                        R$ {comanda.total:>7.2f}")
        fp_nome = (comanda.forma_pagamento or "PIX").upper().replace("_", " ")
        linhas.append(f"FORMA DE PAGAMENTO:           {fp_nome:>8}")
        
        if saldo_pos is not None:
            linhas.append("-" * 38)
            linhas.append("CONTA DO BAR (ISOLADA DA LOJA):")
            if saldo_ant is not None:
                linhas.append(f"Saldo Anterior:               R$ {saldo_ant:>7.2f}")
            status_saldo = "Positivo" if saldo_pos >= 0 else "Devedor (Fiado)"
            linhas.append(f"Saldo Atual ({status_saldo}): R$ {saldo_pos:>7.2f}")
            linhas.append("(Limite devedor autorizado: R$ 100,00)")

        linhas.append("=" * 38)
        linhas.append("Obrigado pela Fraternidade!".center(38))
        linhas.append("=" * 38)
        linhas.append("\n\n\n") # Espaço para guilhotina da impressora térmica

        texto_escpos = "\n".join(linhas)

        return ComprovanteTermicoResponse(
            comanda_id=comanda.id,
            data_hora=comanda.data_fechamento or comanda.data_abertura,
            estabelecimento_nome=nome_bar,
            loja_numero=str(loja_numero) if loja_numero else None,
            operador_nome=nome_op,
            cliente_nome=nome_cli,
            cliente_documento=doc_cli,
            tipo_consumidor=tipo_cli,
            itens=itens_dict,
            total=comanda.total,
            forma_pagamento=fp_nome,
            saldo_anterior=saldo_ant,
            saldo_atual=saldo_pos,
            limite_fiado=100.0,
            texto_escpos=texto_escpos
        )

    async def gerar_extrato_periodo_termico(
        self,
        cliente_id: int,
        data_inicio: datetime,
        data_fim: datetime
    ) -> dict:
        """
        Gera o extrato de consumação de um determinado período para impressão térmica ou A4.
        """
        res_cli = await self.db.execute(
            select(Cliente).options(selectinload(Cliente.carteiras)).where(Cliente.id == cliente_id)
        )
        cliente = res_cli.scalars().first()
        if not cliente:
            raise NaoEncontradoException(f"Cliente (ID: {cliente_id})")

        # Busca comandas do cliente no período
        res_com = await self.db.execute(
            select(Comanda)
            .options(selectinload(Comanda.itens).selectinload(ItemComanda.produto))
            .where(
                Comanda.cliente_id == cliente_id,
                Comanda.tenant_id == self.tenant_id,
                Comanda.data_abertura >= data_inicio,
                Comanda.data_abertura <= data_fim
            )
            .order_by(Comanda.data_abertura.asc())
        )
        comandas = res_com.scalars().all()
        for c in comandas:
            self._enriquecer_comanda(c)

        total_periodo = sum(c.total for c in comandas)

        # Saldo atual da conta do bar
        saldo_bar = 0.0
        for cart in cliente.carteiras:
            if cart.tenant_id == self.tenant_id:
                saldo_bar = cart.saldo
                break

        # Gera texto para bobina
        linhas = []
        linhas.append("=" * 38)
        linhas.append("EXTRATO DE CONSUMAÇÃO - BAR".center(38))
        linhas.append(f"Período: {data_inicio.strftime('%d/%m/%y')} a {data_fim.strftime('%d/%m/%y')}")
        linhas.append(f"Cliente: {cliente.nome[:25]}")
        if cliente.cim:
            linhas.append(f"CIM:     {cliente.cim}")
        linhas.append("-" * 38)
        for c in comandas:
            data_c = (c.data_fechamento or c.data_abertura).strftime("%d/%m %H:%M")
            linhas.append(f"Comanda #{c.id:04d} - {data_c} - R$ {c.total:.2f}")
            for it in c.itens:
                linhas.append(f"  {it.quantidade}x {getattr(it, 'produto_nome', 'Item')[:18]} R$ {it.valor_unitario * it.quantidade:.2f}")
        linhas.append("-" * 38)
        linhas.append(f"TOTAL CONSUMIDO NO PERÍODO: R$ {total_periodo:.2f}")
        linhas.append(f"SALDO ATUAL NO BAR:          R$ {saldo_bar:.2f}")
        linhas.append("=" * 38)
        linhas.append("\n\n\n")

        return {
            "cliente_id": cliente.id,
            "cliente_nome": cliente.nome,
            "cliente_documento": cliente.cim or cliente.cpf,
            "data_inicio": data_inicio.isoformat(),
            "data_fim": data_fim.isoformat(),
            "total_periodo": total_periodo,
            "saldo_atual_bar": saldo_bar,
            "limite_fiado": 100.0,
            "comandas": [
                {
                    "id": c.id,
                    "data": (c.data_fechamento or c.data_abertura).isoformat(),
                    "total": c.total,
                    "forma_pagamento": c.forma_pagamento,
                    "itens": [
                        {
                            "produto": getattr(it, "produto_nome", "Item"),
                            "quantidade": it.quantidade,
                            "valor_unitario": it.valor_unitario,
                            "subtotal": it.quantidade * it.valor_unitario
                        } for it in c.itens
                    ]
                } for c in comandas
            ],
            "texto_escpos": "\n".join(linhas)
        }
