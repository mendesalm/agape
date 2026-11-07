from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, desc
from typing import List, Optional

from app.core.database import obter_sessao
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.models.catalogo_mestre import CatalogoMestreProduto
from app.services.storage_service import StorageService
from app.schemas.catalogo_mestre_schema import (
    CatalogoMestreCreate,
    CatalogoMestreUpdate,
    CatalogoMestreResponse
)

router = APIRouter(prefix="/catalogo-mestre", tags=["Catálogo Global / Mestre de Produtos"])

def verificar_permissao_admin(usuario: Usuario):
    cargo = (usuario.cargo or '').upper()
    if cargo not in ['SUPERADMIN', 'WEBMASTER', 'ADMIN', 'GERENTE']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito ao SuperAdmin ou Administrador da Plataforma."
        )

@router.get("/", response_model=List[CatalogoMestreResponse])
async def listar_produtos_mestre(
    busca: Optional[str] = Query(None, description="Busca por nome, código ou marca"),
    categoria: Optional[str] = Query(None, description="Filtro de categoria (bebidas/alimentos)"),
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.ativo == True)

    if categoria:
        query = query.where(CatalogoMestreProduto.categoria == categoria.lower())

    if busca:
        termo = f"%{busca.strip()}%"
        query = query.where(
            or_(
                CatalogoMestreProduto.nome.ilike(termo),
                CatalogoMestreProduto.codigo_barras.ilike(termo),
                CatalogoMestreProduto.marca.ilike(termo)
            )
        )

    query = query.order_by(desc(CatalogoMestreProduto.id)).offset(skip).limit(limit)
    resultado = await db.execute(query)
    return resultado.scalars().all()

@router.get("/ean/{codigo}", response_model=CatalogoMestreResponse)
async def obter_por_ean(
    codigo: str,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    query = select(CatalogoMestreProduto).where(
        CatalogoMestreProduto.codigo_barras == codigo.strip(),
        CatalogoMestreProduto.ativo == True
    )
    resultado = await db.execute(query)
    produto = resultado.scalars().first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado no catálogo mestre.")
    return produto

@router.get("/{produto_id}", response_model=CatalogoMestreResponse)
async def obter_produto_mestre(
    produto_id: int,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.id == produto_id)
    resultado = await db.execute(query)
    produto = resultado.scalars().first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado no catálogo mestre.")
    return produto

@router.post("/", response_model=CatalogoMestreResponse, status_code=status.HTTP_201_CREATED)
async def criar_produto_mestre(
    dados: CatalogoMestreCreate,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    verificar_permissao_admin(usuario)

    # Verifica se o EAN já existe
    query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.codigo_barras == dados.codigo_barras.strip())
    res = await db.execute(query)
    if res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um produto com o código de barras '{dados.codigo_barras}' no catálogo mestre."
        )

    novo = CatalogoMestreProduto(
        codigo_barras=dados.codigo_barras.strip(),
        nome=dados.nome.strip(),
        marca=dados.marca.strip() if dados.marca else None,
        categoria=dados.categoria.lower().strip(),
        subcategoria=dados.subcategoria.lower().strip(),
        tipo=dados.tipo.lower().strip() if dados.tipo else None,
        preco_custo_sugerido=dados.preco_custo_sugerido,
        preco_venda_sugerido=dados.preco_venda_sugerido,
        foto_url=dados.foto_url.strip() if dados.foto_url else None,
        descricao=dados.descricao.strip() if dados.descricao else None,
        ativo=dados.ativo
    )

    db.add(novo)
    await db.commit()
    await db.refresh(novo)
    return novo

@router.put("/{produto_id}", response_model=CatalogoMestreResponse)
async def atualizar_produto_mestre(
    produto_id: int,
    dados: CatalogoMestreUpdate,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    verificar_permissao_admin(usuario)

    query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.id == produto_id)
    res = await db.execute(query)
    produto = res.scalars().first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        if campo in ['categoria', 'subcategoria', 'tipo'] and isinstance(valor, str):
            setattr(produto, campo, valor.lower().strip())
        else:
            setattr(produto, campo, valor)

    await db.commit()
    await db.refresh(produto)
    return produto

@router.post("/{produto_id}/foto", response_model=CatalogoMestreResponse)
async def atribuir_foto_produto_mestre(
    produto_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Recebe uma imagem (WebP, JPG, PNG, etc.), converte e otimiza para WebP
    e atribui diretamente ao produto mestre especificado.
    """
    verificar_permissao_admin(usuario)

    query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.id == produto_id)
    res = await db.execute(query)
    produto = res.scalars().first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    url_foto = await StorageService.salvar_foto_catalogo_mestre(file)
    produto.foto_url = url_foto
    await db.commit()
    await db.refresh(produto)
    return produto

@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_produto_mestre(
    produto_id: int,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    verificar_permissao_admin(usuario)

    query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.id == produto_id)
    res = await db.execute(query)
    produto = res.scalars().first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")

    # Soft-delete ou exclusão lógica
    produto.ativo = False
    await db.commit()
    return None

from app.core.catalogo_padrao import PRODUTOS_POPULARES

@router.post("/seed-inicial")
async def semear_catalogo_padrao(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Popula produtos padrão de alta frequência caso ainda não existam no catálogo mestre.
    """
    verificar_permissao_admin(usuario)

    adicionados = 0
    atualizados = 0
    for item in PRODUTOS_POPULARES:
        query = select(CatalogoMestreProduto).where(CatalogoMestreProduto.codigo_barras == item["codigo_barras"])
        res = await db.execute(query)
        existente = res.scalars().first()

        if not existente:
            novo = CatalogoMestreProduto(
                codigo_barras=item["codigo_barras"],
                nome=item["nome"],
                marca=item["marca"],
                categoria=item["categoria"],
                subcategoria=item["subcategoria"],
                tipo=item["tipo"],
                preco_custo_sugerido=item["preco_custo_sugerido"],
                preco_venda_sugerido=item["preco_venda_sugerido"],
                foto_url=item["foto_url"],
                descricao=item["descricao"],
                ativo=True
            )
            db.add(novo)
            adicionados += 1
        else:
            existente.nome = item["nome"]
            existente.marca = item["marca"]
            existente.categoria = item["categoria"]
            existente.subcategoria = item["subcategoria"]
            existente.tipo = item["tipo"]
            existente.foto_url = item["foto_url"]
            existente.preco_custo_sugerido = item["preco_custo_sugerido"]
            existente.preco_venda_sugerido = item["preco_venda_sugerido"]
            existente.descricao = item["descricao"]
            existente.ativo = True
            atualizados += 1

    await db.commit()
    return {
        "status": "sucesso", 
        "produtos_adicionados": adicionados,
        "produtos_atualizados": atualizados,
        "total_catalogo_padrao": len(PRODUTOS_POPULARES)
    }


