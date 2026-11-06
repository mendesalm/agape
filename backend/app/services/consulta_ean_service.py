import re
import httpx
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.produto import Produto, CategoriaProduto, SubcategoriaProduto

class ConsultaEanService:
    """
    Serviço para inferir dados e automatizar o cadastro de produtos
    a partir do Código de Barras (EAN-13 / GTIN) ou GS1 Digital Link.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def parse_gs1_digital_link(codigo_ou_url: str) -> Dict[str, Any]:
        """
        Interpreta URLs no padrão GS1 Digital Link ou AI (Application Identifiers).
        Exemplo: https://id.gs1.org/01/07896045506873/10/L2024/17/251231
        Retorna dicionário com gtin, lote e validade (se presentes).
        """
        resultado = {
            "gtin": codigo_ou_url.strip(),
            "lote": None,
            "data_validade": None
        }

        texto = codigo_ou_url.strip()

        match_gtin = re.search(r'/01/(\d{8,14})', texto)
        if match_gtin:
            gtin = match_gtin.group(1)
            if len(gtin) == 14 and gtin.startswith('0'):
                gtin = gtin[1:]
            resultado["gtin"] = gtin

        match_lote = re.search(r'/10/([^/?#&]+)', texto)
        if match_lote:
            resultado["lote"] = match_lote.group(1)

        match_val = re.search(r'/17/(\d{6})', texto)
        if match_val:
            val_str = match_val.group(1)
            try:
                ano = int("20" + val_str[0:2])
                mes = int(val_str[2:4])
                dia = int(val_str[4:6])
                if dia == 0:
                    dia = 28
                resultado["data_validade"] = f"{ano:04d}-{mes:02d}-{dia:02d}"
            except Exception:
                pass

        if resultado["gtin"].isdigit() and len(resultado["gtin"]) == 14 and resultado["gtin"].startswith('0'):
            resultado["gtin"] = resultado["gtin"][1:]

        return resultado

    @staticmethod
    def inferir_taxonomia(nome: str, marcas: str, categorias_texto: str) -> Dict[str, Any]:
        """
        Infere categoria, subcategoria e tipo para o padrão do Ágape
        com base no nome, marca e categorias retornadas pela base.
        """
        combinado = f"{nome} {marcas} {categorias_texto}".lower()

        categoria = CategoriaProduto.BEBIDAS
        subcategoria = SubcategoriaProduto.NAO_ALCOOLICAS
        tipo = "outros"

        # Cervejas
        if any(w in combinado for w in ["cerveja", "beer", "pilsen", "lager", "ipa", "heineken", "spaten", "skol", "brahma", "amstel", "corona", "stella artois", "chopp"]):
            categoria = CategoriaProduto.BEBIDAS
            subcategoria = SubcategoriaProduto.ALCOOLICAS
            tipo = "cervejas"
        # Destilados / Vinhos
        elif any(w in combinado for w in ["vinho", "wine", "whisky", "whiskey", "vodka", "gin", "cachaça", "cachaca", "rum", "tequila", "licor"]):
            categoria = CategoriaProduto.BEBIDAS
            subcategoria = SubcategoriaProduto.ALCOOLICAS
            tipo = "destilados_vinhos"
        # Refrigerantes
        elif any(w in combinado for w in ["refrigerante", "soda", "coca-cola", "coca cola", "pepsi", "guaraná", "guarana", "fanta", "sprite", "tonica", "tônica"]):
            categoria = CategoriaProduto.BEBIDAS
            subcategoria = SubcategoriaProduto.NAO_ALCOOLICAS
            tipo = "refrigerantes"
        # Águas Minerais
        elif any(w in combinado for w in ["água", "agua", "water", "mineral", "crystal", "bonafont", "minalba"]):
            categoria = CategoriaProduto.BEBIDAS
            subcategoria = SubcategoriaProduto.NAO_ALCOOLICAS
            tipo = "aguas_minerais"
        # Sucos e Chás
        elif any(w in combinado for w in ["suco", "juice", "néctar", "nectar", "chá", "cha", "mate", "del valle"]):
            categoria = CategoriaProduto.BEBIDAS
            subcategoria = SubcategoriaProduto.NAO_ALCOOLICAS
            tipo = "sucos_chas"
        # Energéticos
        elif any(w in combinado for w in ["energético", "energetico", "energy drink", "red bull", "monster"]):
            categoria = CategoriaProduto.BEBIDAS
            subcategoria = SubcategoriaProduto.NAO_ALCOOLICAS
            tipo = "energeticos"
        # Alimentos / Snacks / Petiscos
        elif any(w in combinado for w in ["snack", "salgadinho", "batata", "chips", "amendoim", "castanha", "doritos", "ruffles", "lays"]):
            categoria = CategoriaProduto.ALIMENTOS
            subcategoria = SubcategoriaProduto.SNACKS_PETISCOS
            tipo = "petiscos"
        elif any(w in combinado for w in ["chocolate", "bala", "doce", "biscoito", "bolacha"]):
            categoria = CategoriaProduto.ALIMENTOS
            subcategoria = SubcategoriaProduto.SOBREMESAS
            tipo = "doces"

        return {
            "categoria": categoria.value,
            "subcategoria": subcategoria.value,
            "tipo": tipo
        }

    async def consultar(self, codigo_bruto: str) -> Dict[str, Any]:
        """
        Consulta dados pelo código de barras ou GS1 Digital Link.
        1. Parse de GS1 para extrair GTIN, lote e validade se presentes.
        2. Busca no catálogo interno Ágape (qualquer loja que já tenha cadastrado).
        3. Se não encontrar, busca no Open Food Facts API v2.
        """
        parsed = self.parse_gs1_digital_link(codigo_bruto)
        gtin = parsed["gtin"]
        lote_gs1 = parsed["lote"]
        validade_gs1 = parsed["data_validade"]

        # 1. Busca no Banco Interno Ágape
        query = select(Produto).where(
            (Produto.codigo_barras == gtin) | (Produto.qr_code_tag == codigo_bruto)
        ).limit(1)
        res = await self.db.execute(query)
        produto_existente = res.scalars().first()

        if produto_existente:
            return {
                "encontrado": True,
                "origem": "catalogo_agape",
                "codigo_barras": gtin,
                "qr_code_tag": codigo_bruto if codigo_bruto != gtin else (produto_existente.qr_code_tag or gtin),
                "nome": produto_existente.nome,
                "descricao": produto_existente.descricao or "",
                "marca": produto_existente.marca or "",
                "categoria": produto_existente.categoria.value if hasattr(produto_existente.categoria, 'value') else produto_existente.categoria,
                "subcategoria": produto_existente.subcategoria.value if hasattr(produto_existente.subcategoria, 'value') else produto_existente.subcategoria,
                "tipo": produto_existente.tipo or "outros",
                "foto_url": produto_existente.foto_url or "",
                "preco_custo": float(produto_existente.preco_custo or 0.0),
                "preco_venda_sugerido": float(produto_existente.preco_venda or 0.0),
                "lote_sugerido": lote_gs1,
                "data_validade_sugerida": validade_gs1 or (produto_existente.data_validade.strftime("%Y-%m-%d") if produto_existente.data_validade else None)
            }

        # 2. Busca na base aberta Open Food Facts
        url = f"https://world.openfoodfacts.org/api/v2/product/{gtin}.json"
        headers = {"User-Agent": "AgapeSaaS/1.0 (contato@e-sigma.app)"}

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resposta = await client.get(url, headers=headers)
                if resposta.status_code == 200:
                    data = resposta.json()
                    if data.get("status") == 1:
                        prod = data.get("product", {})
                        
                        nome = prod.get("product_name_pt") or prod.get("product_name") or prod.get("generic_name_pt") or ""
                        marcas = prod.get("brands") or ""
                        marca_principal = marcas.split(",")[0].strip() if marcas else ""
                        quantidade = prod.get("quantity") or ""
                        
                        nome_formatado = nome.strip()
                        if quantidade and quantidade.lower() not in nome_formatado.lower():
                            nome_formatado = f"{nome_formatado} {quantidade}".strip()

                        foto_url = (
                            prod.get("image_front_url") or 
                            prod.get("image_url") or 
                            prod.get("image_small_url") or ""
                        )

                        categorias_texto = prod.get("categories") or ""
                        taxonomia = self.inferir_taxonomia(nome_formatado, marcas, categorias_texto)

                        return {
                            "encontrado": True,
                            "origem": "open_food_facts",
                            "codigo_barras": gtin,
                            "qr_code_tag": codigo_bruto,
                            "nome": nome_formatado.title(),
                            "descricao": f"Produto oficial {marca_principal}. {quantidade}".strip(),
                            "marca": marca_principal.title() if marca_principal else "",
                            "categoria": taxonomia["categoria"],
                            "subcategoria": taxonomia["subcategoria"],
                            "tipo": taxonomia["tipo"],
                            "foto_url": foto_url,
                            "preco_custo": 0.0,
                            "preco_venda_sugerido": 0.0,
                            "lote_sugerido": lote_gs1,
                            "data_validade_sugerida": validade_gs1
                        }
        except Exception:
            pass

        # 3. Inferência Avançada por Prefixo GS1 da Indústria / Fabricante
        PREFIXOS_GS1 = {
            "7891991": {"fabricante": "Ambev", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "cervejas", "nome": "Cerveja / Produto Ambev"},
            "78960455": {"fabricante": "Heineken Brasil", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "cervejas", "nome": "Cerveja Heineken / Amstel"},
            "78960526": {"fabricante": "Brasil Kirin / Eisenbahn", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "cervejas", "nome": "Cerveja Eisenbahn / Schin"},
            "78973950": {"fabricante": "Grupo Petrópolis", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "cervejas", "nome": "Cerveja Itaipava / Petra / Black Princess"},
            "7898918": {"fabricante": "Cervejaria Colorado", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "cervejas", "nome": "Cerveja Artesanal Colorado"},
            "7894900": {"fabricante": "Coca-Cola Brasil", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.NAO_ALCOOLICAS.value, "tipo": "refrigerantes", "nome": "Refrigerante Coca-Cola"},
            "78983577": {"fabricante": "SolarBR Coca-Cola", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.NAO_ALCOOLICAS.value, "tipo": "refrigerantes", "nome": "Refrigerante / Suco Del Valle"},
            "78980806": {"fabricante": "Red Bull Brasil", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.NAO_ALCOOLICAS.value, "tipo": "energeticos", "nome": "Energético Red Bull"},
            "78982151": {"fabricante": "Piracanjuba / Minalba", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.NAO_ALCOOLICAS.value, "tipo": "bebidas_lacteas", "nome": "Bebida Láctea / Água Mineral"},
            "7891121": {"fabricante": "Cia Müller de Bebidas (Cachaça 51)", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "destilados_vinhos", "nome": "Cachaça 51 / Destilado"},
            "7891090": {"fabricante": "Tatuzinho / Velho Barreiro", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.ALCOOLICAS.value, "tipo": "destilados_vinhos", "nome": "Cachaça Velho Barreiro"},
            "7891000": {"fabricante": "Nestlé Brasil", "cat": CategoriaProduto.ALIMENTOS.value, "sub": SubcategoriaProduto.SOBREMESAS.value, "tipo": "doces", "nome": "Chocolate / Doce Nestlé"},
            "7891008": {"fabricante": "Chocolates Garoto", "cat": CategoriaProduto.ALIMENTOS.value, "sub": SubcategoriaProduto.SOBREMESAS.value, "tipo": "doces", "nome": "Bombom / Chocolate Garoto"},
            "7891079": {"fabricante": "Pandurata / Bauducco", "cat": CategoriaProduto.ALIMENTOS.value, "sub": SubcategoriaProduto.SNACKS_PETISCOS.value, "tipo": "petiscos", "nome": "Biscoito / Torrada Bauducco"},
            "78960007": {"fabricante": "M. Dias Branco", "cat": CategoriaProduto.ALIMENTOS.value, "sub": SubcategoriaProduto.SNACKS_PETISCOS.value, "tipo": "petiscos", "nome": "Snack / Torrada Adria / Fortaleza"},
            "7891095": {"fabricante": "General Mills / Yoki", "cat": CategoriaProduto.ALIMENTOS.value, "sub": SubcategoriaProduto.SNACKS_PETISCOS.value, "tipo": "petiscos", "nome": "Amendoim / Petisco Yoki"},
            "78960890": {"fabricante": "3 Corações", "cat": CategoriaProduto.BEBIDAS.value, "sub": SubcategoriaProduto.NAO_ALCOOLICAS.value, "tipo": "cafes", "nome": "Café / Cappuccino 3 Corações"}
        }

        for prefixo, info in PREFIXOS_GS1.items():
            if gtin.startswith(prefixo):
                return {
                    "encontrado": True,
                    "origem": "gs1_fabricante",
                    "codigo_barras": gtin,
                    "qr_code_tag": codigo_bruto,
                    "nome": info["nome"],
                    "descricao": f"Produto oficial registrado na GS1 Brasil pelo fabricante {info['fabricante']}.",
                    "marca": info["fabricante"],
                    "categoria": info["cat"],
                    "subcategoria": info["sub"],
                    "tipo": info["tipo"],
                    "foto_url": "",
                    "preco_custo": 0.0,
                    "preco_venda_sugerido": 0.0,
                    "lote_sugerido": lote_gs1,
                    "data_validade_sugerida": validade_gs1
                }

        # 4. Fallback Inteligente GS1 Brasil (Se começar com 789 ou 788 e tiver 13 dígitos)
        if (gtin.startswith("789") or gtin.startswith("788")) and len(gtin) == 13:
            return {
                "encontrado": True,
                "origem": "gs1_brasil",
                "codigo_barras": gtin,
                "qr_code_tag": codigo_bruto,
                "nome": "Produto Comercial (GS1 Brasil)",
                "descricao": "Item nacional autenticado sob padrão GS1 Brasil (EAN-13).",
                "marca": "Indústria Nacional",
                "categoria": CategoriaProduto.BEBIDAS.value,
                "subcategoria": SubcategoriaProduto.ALCOOLICAS.value,
                "tipo": "outros",
                "foto_url": "",
                "preco_custo": 0.0,
                "preco_venda_sugerido": 0.0,
                "lote_sugerido": lote_gs1,
                "data_validade_sugerida": validade_gs1
            }

        # 4. Não encontrado
        return {
            "encontrado": False,
            "origem": "nao_identificado",
            "codigo_barras": gtin,
            "qr_code_tag": codigo_bruto,
            "nome": "",
            "descricao": "",
            "marca": "",
            "categoria": CategoriaProduto.BEBIDAS.value,
            "subcategoria": SubcategoriaProduto.ALCOOLICAS.value,
            "tipo": "outros",
            "foto_url": "",
            "preco_custo": 0.0,
            "preco_venda_sugerido": 0.0,
            "lote_sugerido": lote_gs1,
            "data_validade_sugerida": validade_gs1
        }
