from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, desc
from typing import List, Optional

from app.core.database import obter_sessao
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.models.catalogo_mestre import CatalogoMestreProduto
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

PRODUTOS_SEMENTE = [
    {
        "codigo_barras": "7891991000845",
        "nome": "Cerveja Heineken Puro Malte 350ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.80,
        "preco_venda_sugerido": 9.00,
        "descricao": "Lager puro malte de coloração dourada e sabor marcante."
    },
    {
        "codigo_barras": "7891991010356",
        "nome": "Cerveja Heineken Long Neck 330ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.20,
        "preco_venda_sugerido": 10.00,
        "descricao": "Heineken Long Neck 330ml em garrafa verde de vidro."
    },
    {
        "codigo_barras": "7891991300853",
        "nome": "Cerveja Spaten Munich Helles 350ml",
        "marca": "Spaten",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.20,
        "preco_venda_sugerido": 8.00,
        "descricao": "Cerveja puro malte tradicional de Munique com amargor suave."
    },
    {
        "codigo_barras": "7891991015696",
        "nome": "Cerveja Amstel Puro Malte 350ml",
        "marca": "Amstel",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.60,
        "preco_venda_sugerido": 7.00,
        "descricao": "Cerveja puro malte de receita holandesa, leve e refrescante."
    },
    {
        "codigo_barras": "7891991001347",
        "nome": "Cerveja Brahma Duplo Malte 350ml",
        "marca": "Brahma",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.70,
        "preco_venda_sugerido": 7.00,
        "descricao": "Combinação surpreendente do malte Pilsner com o malte Munich."
    },
    {
        "codigo_barras": "7501064191659",
        "nome": "Cerveja Corona Extra 330ml",
        "marca": "Corona",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.50,
        "preco_venda_sugerido": 11.00,
        "descricao": "Cerveja clara mexicana, ideal para consumo com fatia de limão."
    },
    {
        "codigo_barras": "7894900010015",
        "nome": "Refrigerante Coca-Cola Original 350ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.00,
        "descricao": "O clássico refrigerante de cola em lata 350ml."
    },
    {
        "codigo_barras": "7894900700046",
        "nome": "Refrigerante Coca-Cola Sem Açúcar 350ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.00,
        "descricao": "Coca-Cola sem açúcar refrescante em lata 350ml."
    },
    {
        "codigo_barras": "7891991000814",
        "nome": "Refrigerante Guaraná Antarctica 350ml",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Refrigerante brasileiro clássico à base do fruto guaraná."
    },
    {
        "codigo_barras": "7891048038012",
        "nome": "Água Mineral Crystal Sem Gás 500ml",
        "marca": "Crystal",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "agua",
        "foto_url": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 1.50,
        "preco_venda_sugerido": 4.00,
        "descricao": "Água mineral natural sem gás garrafa 500ml."
    },
    {
        "codigo_barras": "7891048038029",
        "nome": "Água Mineral Crystal Com Gás 500ml",
        "marca": "Crystal",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "agua",
        "foto_url": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 1.70,
        "preco_venda_sugerido": 4.50,
        "descricao": "Água mineral natural gaseificada garrafa 500ml."
    },
    {
        "codigo_barras": "9002490100070",
        "nome": "Energético Red Bull Energy Drink 250ml",
        "marca": "Red Bull",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "energeticos",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.50,
        "preco_venda_sugerido": 15.00,
        "descricao": "Energético original Red Bull em lata de 250ml."
    }
]

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
    for item in PRODUTOS_SEMENTE:
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

    await db.commit()
    return {"status": "sucesso", "produtos_adicionados": adicionados, "total_catalogo_padrao": len(PRODUTOS_SEMENTE)}

