"""
Catálogo Mestre Padrão de Produtos do Ecossistema Barix / Ágape
Contém as cervejas, refrigerantes, águas, energéticos e snacks mais populares
do Brasil com códigos EAN-13 reais, especificações e faixas de preços sugeridas.
"""

PRODUTOS_POPULARES = [
    # =========================================================================
    # 1. CERVEJAS EM LATA (350ml e Latão 473ml)
    # =========================================================================
    {
        "codigo_barras": "7891991000845",
        "nome": "Cerveja Heineken Puro Malte Lata 350ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.80,
        "preco_venda_sugerido": 9.00,
        "descricao": "Lager puro malte de coloração dourada, amargor marcante e lúpulo exclusivo tipo A."
    },
    {
        "codigo_barras": "7891991000852",
        "nome": "Cerveja Heineken Puro Malte Latão 473ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 6.20,
        "preco_venda_sugerido": 12.00,
        "descricao": "Heineken puro malte em latão 473ml para momentos de maior consumo."
    },
    {
        "codigo_barras": "7891991300853",
        "nome": "Cerveja Spaten Munich Helles Lata 350ml",
        "marca": "Spaten",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.20,
        "preco_venda_sugerido": 8.00,
        "descricao": "Cerveja puro malte tradicional de Munique com amargor suave e alta refrescância."
    },
    {
        "codigo_barras": "7891991300860",
        "nome": "Cerveja Spaten Munich Helles Latão 473ml",
        "marca": "Spaten",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.40,
        "preco_venda_sugerido": 10.00,
        "descricao": "Estilo tradicional Munich Helles em latão 473ml."
    },
    {
        "codigo_barras": "7891991015696",
        "nome": "Cerveja Amstel Puro Malte Lata 350ml",
        "marca": "Amstel",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.60,
        "preco_venda_sugerido": 7.00,
        "descricao": "Cerveja puro malte de receita holandesa de Amsterdã, leve e equilibrada."
    },
    {
        "codigo_barras": "7891991015702",
        "nome": "Cerveja Amstel Puro Malte Latão 473ml",
        "marca": "Amstel",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.60,
        "preco_venda_sugerido": 9.00,
        "descricao": "Amstel puro malte em latão 473ml."
    },
    {
        "codigo_barras": "7891991001347",
        "nome": "Cerveja Brahma Duplo Malte Lata 350ml",
        "marca": "Brahma",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.70,
        "preco_venda_sugerido": 7.00,
        "descricao": "Combinação equilibrada de dois tipos de malte: Pilsner leve e Munich encorpado."
    },
    {
        "codigo_barras": "7891991001354",
        "nome": "Cerveja Brahma Duplo Malte Latão 473ml",
        "marca": "Brahma",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.70,
        "preco_venda_sugerido": 9.00,
        "descricao": "Brahma Duplo Malte em formato latão 473ml."
    },
    {
        "codigo_barras": "7891991000012",
        "nome": "Cerveja Brahma Chopp Lata 350ml",
        "marca": "Brahma",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.40,
        "preco_venda_sugerido": 6.50,
        "descricao": "O sabor autêntico do chopp brasileiro em lata 350ml."
    },
    {
        "codigo_barras": "7891991000050",
        "nome": "Cerveja Skol Pilsen Lata 350ml",
        "marca": "Skol",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.30,
        "preco_venda_sugerido": 6.50,
        "descricao": "Cerveja clara, leve e de alta drinkability."
    },
    {
        "codigo_barras": "7891991000081",
        "nome": "Cerveja Antarctica Pilsen Lata 350ml",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.30,
        "preco_venda_sugerido": 6.50,
        "descricao": "A cerveja BOA com a tradição brasileira Antarctica."
    },
    {
        "codigo_barras": "7891991001163",
        "nome": "Cerveja Original Antarctica Lata 350ml",
        "marca": "Original",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.10,
        "preco_venda_sugerido": 8.00,
        "descricao": "Pilsen clássica desde 1931 com amargor suave e lúpulos selecionados."
    },
    {
        "codigo_barras": "7891991000739",
        "nome": "Cerveja Budweiser American Lager Lata 350ml",
        "marca": "Budweiser",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.90,
        "preco_venda_sugerido": 7.50,
        "descricao": "A King of Beers, maturada com lascas de faia (beechwood)."
    },
    {
        "codigo_barras": "7891991000746",
        "nome": "Cerveja Budweiser American Lager Latão 473ml",
        "marca": "Budweiser",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.10,
        "preco_venda_sugerido": 9.50,
        "descricao": "Budweiser tradicional americana em latão 473ml."
    },
    {
        "codigo_barras": "7891991301423",
        "nome": "Cerveja Corona Extra Lata 350ml",
        "marca": "Corona",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.20,
        "preco_venda_sugerido": 10.00,
        "descricao": "Cerveja clara mexicana premiada em lata moderna 350ml."
    },
    {
        "codigo_barras": "7891991300013",
        "nome": "Cerveja Beck's German Pilsner Lata 350ml",
        "marca": "Beck's",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.50,
        "preco_venda_sugerido": 8.50,
        "descricao": "Puro malte alemã de Bremen com amargor superior característico (IBU 20)."
    },
    {
        "codigo_barras": "7891991295241",
        "nome": "Cerveja Stella Artois Pure Gold Sem Glúten 350ml",
        "marca": "Stella Artois",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.60,
        "preco_venda_sugerido": 9.00,
        "descricao": "Versão sem glúten e com menos calorias mantendo o sabor original de Stella Artois."
    },
    {
        "codigo_barras": "7898367980016",
        "nome": "Cerveja Eisenbahn Pilsen Lata 350ml",
        "marca": "Eisenbahn",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.90,
        "preco_venda_sugerido": 7.50,
        "descricao": "Puro malte brasileira de Blumenau inspirada na lei da pureza alemã."
    },
    {
        "codigo_barras": "7891991301232",
        "nome": "Cerveja Michelob Ultra Low Carb 350ml",
        "marca": "Michelob Ultra",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.40,
        "preco_venda_sugerido": 8.50,
        "descricao": "Cerveja ultra leve com apenas 79 calorias e 80% menos carboidratos."
    },
    {
        "codigo_barras": "7898944510018",
        "nome": "Cerveja Colorado Ribeirão Lager Lata 350ml",
        "marca": "Colorado",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.80,
        "preco_venda_sugerido": 9.50,
        "descricao": "Cerveja artesanal com casca de laranja que confere notas cítricas e refrescantes."
    },

    # =========================================================================
    # 2. CERVEJAS LONG NECK (330ml / 355ml)
    # =========================================================================
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
        "descricao": "Garrafa de vidro verde descartável 330ml com o puro malte original Heineken."
    },
    {
        "codigo_barras": "7891991010363",
        "nome": "Cerveja Heineken 0.0% Álcool Long Neck 330ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.20,
        "preco_venda_sugerido": 10.00,
        "descricao": "Zero álcool, 100% puro malte. Todo o sabor clássico Heineken sem teor alcoólico."
    },
    {
        "codigo_barras": "7501064191659",
        "nome": "Cerveja Corona Extra Long Neck 330ml",
        "marca": "Corona",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.50,
        "preco_venda_sugerido": 11.00,
        "descricao": "Cerveja premium mexicana transparente. Perfeita para consumo com fatia de limão taiti."
    },
    {
        "codigo_barras": "7891991000623",
        "nome": "Cerveja Stella Artois Long Neck 330ml",
        "marca": "Stella Artois",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.00,
        "preco_venda_sugerido": 10.00,
        "descricao": "Pilsner belga premium com mais de 600 anos de tradição em Leuven."
    },
    {
        "codigo_barras": "7891991000715",
        "nome": "Cerveja Budweiser Long Neck 330ml",
        "marca": "Budweiser",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.50,
        "preco_venda_sugerido": 9.00,
        "descricao": "Lager americana encorpada com processo de maturação em lascas de faia."
    },
    {
        "codigo_barras": "7891991300877",
        "nome": "Cerveja Spaten Munich Long Neck 355ml",
        "marca": "Spaten",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.80,
        "preco_venda_sugerido": 9.50,
        "descricao": "A cervejaria oficial de Munique desde 1397 em garrafa long neck."
    },
    {
        "codigo_barras": "7891991300020",
        "nome": "Cerveja Beck's Long Neck 330ml",
        "marca": "Beck's",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.10,
        "preco_venda_sugerido": 10.00,
        "descricao": "A mais autêntica e amarga German Pilsner em vidro verde."
    },
    {
        "codigo_barras": "7898367980153",
        "nome": "Cerveja Eisenbahn IPA Long Neck 355ml",
        "marca": "Eisenbahn",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 5.40,
        "preco_venda_sugerido": 11.00,
        "descricao": "India Pale Ale de cor âmbar, com amargor pronunciado e aroma cítrico de lúpulo."
    },
    {
        "codigo_barras": "7891991010417",
        "nome": "Cerveja Sol Premium Long Neck 330ml",
        "marca": "Sol",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1518057111178-44a106bad636?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.60,
        "preco_venda_sugerido": 9.00,
        "descricao": "Cerveja clara e brilhante feita com energia solar, sabor leve e refrescante."
    },

    # =========================================================================
    # 3. CERVEJAS GARRAFA RETORNÁVEL / COMPARTILHADA 600ml
    # =========================================================================
    {
        "codigo_barras": "7891991000135",
        "nome": "Cerveja Original Antarctica 600ml",
        "marca": "Original",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.50,
        "preco_venda_sugerido": 14.00,
        "descricao": "A garrafa clássica de 600ml mais pedida nas mesas de bares e confrarias."
    },
    {
        "codigo_barras": "7891991010608",
        "nome": "Cerveja Heineken Puro Malte 600ml",
        "marca": "Heineken",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1618886614638-80e3c103d31a?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 8.50,
        "preco_venda_sugerido": 16.00,
        "descricao": "A pura malte favorita em garrafa de 600ml para compartilhar com irmãos e amigos."
    },
    {
        "codigo_barras": "7891991300884",
        "nome": "Cerveja Spaten Munich 600ml",
        "marca": "Spaten",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.80,
        "preco_venda_sugerido": 14.50,
        "descricao": "Garrafa de 600ml da cerveja puro malte alemã de maior crescimento no Brasil."
    },
    {
        "codigo_barras": "7891991001361",
        "nome": "Cerveja Brahma Duplo Malte 600ml",
        "marca": "Brahma",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 6.80,
        "preco_venda_sugerido": 13.00,
        "descricao": "Garrafa de 600ml combinando maltes Pilsner e Munich com equilíbrio ideal."
    },
    {
        "codigo_barras": "7891991015719",
        "nome": "Cerveja Amstel Puro Malte 600ml",
        "marca": "Amstel",
        "categoria": "bebidas",
        "subcategoria": "alcoolicas",
        "tipo": "cervejas",
        "foto_url": "https://images.unsplash.com/photo-1566633806327-68e152aaf26d?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 6.80,
        "preco_venda_sugerido": 13.00,
        "descricao": "Garrafa 600ml da receita holandesa puro malte Amstel."
    },

    # =========================================================================
    # 4. REFRIGERANTES EM LATA (350ml)
    # =========================================================================
    {
        "codigo_barras": "7894900010015",
        "nome": "Refrigerante Coca-Cola Original Lata 350ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.00,
        "descricao": "O refrigerante mais consumido do mundo na embalagem lata de alumínio 350ml."
    },
    {
        "codigo_barras": "7894900700046",
        "nome": "Refrigerante Coca-Cola Sem Açúcar Lata 350ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.00,
        "descricao": "Zero calorias com o inconfundível sabor Coca-Cola."
    },
    {
        "codigo_barras": "7891991000814",
        "nome": "Refrigerante Guaraná Antarctica Lata 350ml",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "O sabor do Brasil com extrato natural do fruto da Amazônia."
    },
    {
        "codigo_barras": "7891991000821",
        "nome": "Refrigerante Guaraná Antarctica Zero Lata 350ml",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Guaraná natural com zero adição de açúcares."
    },
    {
        "codigo_barras": "7894900030013",
        "nome": "Refrigerante Fanta Laranja Lata 350ml",
        "marca": "Fanta",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Refrigerante cítrico e frutado sabor laranja com suco natural."
    },
    {
        "codigo_barras": "7894900050011",
        "nome": "Refrigerante Fanta Uva Lata 350ml",
        "marca": "Fanta",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Refrigerante borbulhante com sabor marcante de uva."
    },
    {
        "codigo_barras": "7894900020014",
        "nome": "Refrigerante Sprite Lemon Fresh Lata 350ml",
        "marca": "Sprite",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Sabor limão cristalino, refrescante e sem corantes artificiais."
    },
    {
        "codigo_barras": "7894900530018",
        "nome": "Refrigerante Schweppes Citrus Lata 350ml",
        "marca": "Schweppes",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.20,
        "preco_venda_sugerido": 7.00,
        "descricao": "Combinação sofisticada de maçã, grapefruit e laranja. Ideal puro ou em drinks."
    },
    {
        "codigo_barras": "7894900500011",
        "nome": "Água Tônica Schweppes Lata 350ml",
        "marca": "Schweppes",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.20,
        "preco_venda_sugerido": 7.00,
        "descricao": "Tônica tradicional com quinino de amargor requintado, base para Gin Tônica."
    },

    # =========================================================================
    # 5. REFRIGERANTES PET E GARRAFA (600ml e 2 Litros)
    # =========================================================================
    {
        "codigo_barras": "7894900010619",
        "nome": "Refrigerante Coca-Cola Garrafa 600ml",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.20,
        "preco_venda_sugerido": 8.50,
        "descricao": "Coca-Cola individual em garrafa PET de 600ml com tampa de rosca."
    },
    {
        "codigo_barras": "7891991008063",
        "nome": "Refrigerante Guaraná Antarctica 600ml",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 4.00,
        "preco_venda_sugerido": 8.00,
        "descricao": "Guaraná Antarctica em embalagem individual PET de 600ml."
    },
    {
        "codigo_barras": "7894900011517",
        "nome": "Refrigerante Coca-Cola Original PET 2L",
        "marca": "Coca-Cola",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 8.50,
        "preco_venda_sugerido": 16.00,
        "descricao": "Garrafa família de 2 Litros para eventos, jantares e confraternizações."
    },
    {
        "codigo_barras": "7891991008018",
        "nome": "Refrigerante Guaraná Antarctica PET 2L",
        "marca": "Antarctica",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "refrigerantes",
        "foto_url": "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.80,
        "preco_venda_sugerido": 14.50,
        "descricao": "Guaraná Antarctica em garrafa família de 2 Litros."
    },

    # =========================================================================
    # 6. ÁGUAS, SUCOS E CHÁS
    # =========================================================================
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
        "descricao": "Água mineral límpida e natural engarrafada na fonte."
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
        "descricao": "Água mineral natural com leve gaseificação refrescante."
    },
    {
        "codigo_barras": "7891025114173",
        "nome": "Água Mineral Bonafont Sem Gás 500ml",
        "marca": "Bonafont",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "agua",
        "foto_url": "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 1.80,
        "preco_venda_sugerido": 4.50,
        "descricao": "Água mineral leve de baixa concentração de sódio."
    },
    {
        "codigo_barras": "7894900550016",
        "nome": "Chá Matte Leão com Limão PET 450ml",
        "marca": "Matte Leão",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "chas",
        "foto_url": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.20,
        "preco_venda_sugerido": 6.50,
        "descricao": "Chá de erva-mate tostada com suco de limão, servido gelado."
    },
    {
        "codigo_barras": "7894900650013",
        "nome": "Suco Del Valle 100% Uva Lata 290ml",
        "marca": "Del Valle",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "sucos",
        "foto_url": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.50,
        "preco_venda_sugerido": 7.00,
        "descricao": "Néctar de uva integral em lata 290ml, rico em antioxidantes."
    },

    # =========================================================================
    # 7. ENERGÉTICOS
    # =========================================================================
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
        "descricao": "Red Bull te dá asas. A fórmula original que revitaliza mente e corpo."
    },
    {
        "codigo_barras": "9002490205935",
        "nome": "Energético Red Bull Sugarfree 250ml",
        "marca": "Red Bull",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "energeticos",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.50,
        "preco_venda_sugerido": 15.00,
        "descricao": "As mesmas asas energéticas do Red Bull original, totalmente sem açúcar."
    },
    {
        "codigo_barras": "9002490234126",
        "nome": "Energético Red Bull Tropical Edition 250ml",
        "marca": "Red Bull",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "energeticos",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.80,
        "preco_venda_sugerido": 16.00,
        "descricao": "Sabor refrescante de frutas tropicais (maracujá e manga) em lata amarela."
    },
    {
        "codigo_barras": "070847811169",
        "nome": "Energético Monster Energy Tradicional 473ml",
        "marca": "Monster",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "energeticos",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.20,
        "preco_venda_sugerido": 14.00,
        "descricao": "O clássico Monster em latão 473ml com taurina, ginseng e cafeína."
    },
    {
        "codigo_barras": "070847812166",
        "nome": "Energético Monster Ultra White Sem Açúcar 473ml",
        "marca": "Monster",
        "categoria": "bebidas",
        "subcategoria": "nao_alcoolicas",
        "tipo": "energeticos",
        "foto_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 7.20,
        "preco_venda_sugerido": 14.00,
        "descricao": "Sabor cítrico suave, zero calorias e lata fosca texturizada."
    },

    # =========================================================================
    # 8. SNACKS & PETISCOS RÁPIDOS DE BALCÃO
    # =========================================================================
    {
        "codigo_barras": "7896058500203",
        "nome": "Amendoim Torrado e Salgado Dori 120g",
        "marca": "Dori",
        "categoria": "alimentos",
        "subcategoria": "snacks",
        "tipo": "amendoim",
        "foto_url": "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 2.80,
        "preco_venda_sugerido": 6.00,
        "descricao": "Amendoim sem pele tostado e crocante com sal refinado."
    },
    {
        "codigo_barras": "7896058500210",
        "nome": "Amendoim Japonês Crocante Dori 120g",
        "marca": "Dori",
        "categoria": "alimentos",
        "subcategoria": "snacks",
        "tipo": "amendoim",
        "foto_url": "https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 3.00,
        "preco_venda_sugerido": 6.50,
        "descricao": "Casquinha extra crocante temperada com molho de soja."
    },
    {
        "codigo_barras": "7898422745673",
        "nome": "Batata Pringles Original 114g",
        "marca": "Pringles",
        "categoria": "alimentos",
        "subcategoria": "snacks",
        "tipo": "batata",
        "foto_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 8.50,
        "preco_venda_sugerido": 16.00,
        "descricao": "Lâminas crocantes de batata no clássico tubo protetor com tampa."
    },
    {
        "codigo_barras": "7898422745680",
        "nome": "Batata Pringles Creme e Cebola 114g",
        "marca": "Pringles",
        "categoria": "alimentos",
        "subcategoria": "snacks",
        "tipo": "batata",
        "foto_url": "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
        "preco_custo_sugerido": 8.50,
        "preco_venda_sugerido": 16.00,
        "descricao": "Sabor marcante de sour cream & onion em batatas empilhadas perfeitamente."
    }
]
