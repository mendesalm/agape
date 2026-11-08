from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import obter_sessao
from app.schemas.produto_schema import (
    ProdutoCreate, 
    ProdutoUpdate, 
    ProdutoResponse,
    LoteEntradaCreate,
    TransferenciaEstoqueRequest,
    PerdaLoteRequest,
    AlertaEstoqueGeral
)
from app.services.produto_service import ProdutoService
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario

router = APIRouter(prefix="/produtos", tags=["Produtos e Estoque em 2 Níveis (SaaS)"])

@router.post("/sincronizar-catalogo")
async def sincronizar_catalogo_loja(
    tenant_id: Optional[int] = Query(None, description="ID do estabelecimento para sincronização"),
    auto_importar: bool = Query(True, description="Importar produtos do catálogo mestre ausentes na loja"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Sincroniza o estoque e catálogo da loja com o Catálogo Global Mestre:
    - Atualiza produtos existentes com fotos HD/WebP padronizadas e códigos EAN oficiais.
    - Importa novos produtos com lote inicial pronto para venda.
    """
    alvo_tenant = usuario.tenant_id
    if not alvo_tenant:
        if (usuario.cargo or '').upper() == 'SUPERADMIN':
            alvo_tenant = tenant_id or 1
        else:
            raise HTTPException(status_code=400, detail="Usuário sem loja vinculada.")

    servico = ProdutoService(db, alvo_tenant)
    return await servico.sincronizar_com_catalogo_mestre(auto_importar_novos=auto_importar)

@router.get("/alertas", response_model=AlertaEstoqueGeral)
async def obter_alertas_estoque(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Retorna o painel consolidado de alertas:
    - Necessidade de reposição na gôndola (estoque de venda baixo)
    - Necessidade de compra (armazém baixo)
    - Lotes próximos da validade (<= 30 dias) ou vencidos (FEFO / PVPS)
    """
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.obter_painel_alertas()

@router.get("/", response_model=List[ProdutoResponse])
async def listar(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.listar_produtos(skip, limit)

@router.get("/consultar-ean/{codigo:path}")
async def consultar_dados_ean(
    codigo: str,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Infere e auto-completa os dados de um produto a partir de seu Código de Barras (EAN-13)
    ou URL no padrão GS1 Digital Link.
    Retorna Nome, Marca, Categoria, Foto oficial, Lote e Validade quando disponíveis.
    """
    from app.services.consulta_ean_service import ConsultaEanService
    servico = ConsultaEanService(db)
    return await servico.consultar(codigo)

@router.get("/codigo/{codigo}", response_model=ProdutoResponse)
async def obter_por_codigo(
    codigo: str,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Busca produto pelo Código de Barras de fábrica (EAN-13), Tag QR Code do BipFy ou ID.
    Usado para bipagem imediata no caixa, totem ou celular.
    """
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.buscar_por_codigo(codigo)

@router.get("/{produto_id}", response_model=ProdutoResponse)
async def obter(
    produto_id: int, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.obter_produto(produto_id)

@router.post("/", response_model=ProdutoResponse, status_code=status.HTTP_201_CREATED)
async def criar(
    dados: ProdutoCreate, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.criar_produto(dados)

@router.put("/{produto_id}", response_model=ProdutoResponse)
async def atualizar(
    produto_id: int, 
    dados: ProdutoUpdate, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.atualizar_produto(produto_id, dados)

@router.post("/{produto_id}/lotes", response_model=ProdutoResponse, status_code=status.HTTP_201_CREATED)
async def adicionar_lote(
    produto_id: int,
    dados: LoteEntradaCreate,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Cadastra a entrada de um novo lote com prazo de validade e destino (Armazém ou Gôndola).
    """
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.registrar_entrada_lote(produto_id, dados)

@router.post("/{produto_id}/transferir-gondola", response_model=ProdutoResponse)
async def transferir_para_gondola(
    produto_id: int,
    dados: TransferenciaEstoqueRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Transfere itens do Armazém para a Gôndola.
    Se lote_id não for enviado, aplica o algoritmo FEFO automaticamente
    (prioriza os lotes com menores prazos de validade).
    """
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.transferir_para_gondola(produto_id, dados)

@router.post("/{produto_id}/transferir-armazem", response_model=ProdutoResponse)
async def transferir_para_armazem(
    produto_id: int,
    dados: TransferenciaEstoqueRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Transfere itens da Gôndola de volta para o Armazém.
    """
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.transferir_para_armazem(produto_id, dados)

@router.post("/{produto_id}/perdas", response_model=ProdutoResponse)
async def registrar_perda_estoque(
    produto_id: int, 
    dados: PerdaLoteRequest, 
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Registra uma perda/quebra/vencimento de produto no Armazém ou na Gôndola,
    calculando e deduzindo automaticamente o custo da perda e registrando despesa no Bar.
    """
    servico = ProdutoService(db, usuario.tenant_id)
    return await servico.registrar_perda(
        produto_id=produto_id,
        quantidade=dados.quantidade,
        motivo=dados.motivo or dados.justificativa or "Perda operacional",
        local=dados.local,
        lote_id=dados.lote_id,
        tipo_perda=dados.tipo_perda or "quebra",
        justificativa=dados.justificativa or dados.motivo or "Perda registrada",
        operador_id=usuario.id
    )
