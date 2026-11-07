import os
import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException

# Raiz segura para todos os uploads
BASE_UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))

class StorageService:
    @staticmethod
    def _garantir_diretorio(caminho: str):
        if not os.path.exists(caminho):
            os.makedirs(caminho)

    @staticmethod
    def _validar_path_traversal(caminho_final: str):
        """
        Trava de segurança extraída do projeto Sigma.
        Garante que o caminho absoluto resolvido pertença estritamente à pasta BASE_UPLOAD_DIR,
        impedindo que o usuário envie um filepath malicioso como '../../../../windows/system32/'.
        """
        if not caminho_final.startswith(BASE_UPLOAD_DIR):
            raise HTTPException(status_code=403, detail="Acesso negado: Path Traversal detectado.")

    @staticmethod
    async def salvar_foto_produto(tenant_id: int, arquivo: UploadFile) -> str:
        tenant_folder = os.path.join(BASE_UPLOAD_DIR, f"tenant_{tenant_id}", "produtos")
        StorageService._garantir_diretorio(tenant_folder)

        # Gera um nome seguro para não sobrescrever
        extensao = arquivo.filename.split('.')[-1] if '.' in arquivo.filename else 'jpg' # type: ignore
        nome_seguro = f"{uuid.uuid4().hex}.{extensao}"
        
        caminho_absoluto = os.path.abspath(os.path.join(tenant_folder, nome_seguro))
        StorageService._validar_path_traversal(caminho_absoluto)

        # Salva em disco de forma otimizada
        with open(caminho_absoluto, "wb") as buffer:
            shutil.copyfileobj(arquivo.file, buffer)
            
        # Retorna o path relativo que o frontend usará para buscar a imagem via API
        return f"/api/uploads/tenant_{tenant_id}/{nome_seguro}"

    @staticmethod
    def obter_caminho_leitura(tenant_id: int, nome_arquivo: str) -> str:
        tenant_folder = os.path.join(BASE_UPLOAD_DIR, f"tenant_{tenant_id}", "produtos")
        caminho_absoluto = os.path.abspath(os.path.join(tenant_folder, nome_arquivo))
        StorageService._validar_path_traversal(caminho_absoluto)
        
        if not os.path.exists(caminho_absoluto):
            raise HTTPException(status_code=404, detail="Arquivo não encontrado.")
            
        return caminho_absoluto

    @staticmethod
    def _padronizar_imagem_catalogo(img_pil):
        """
        Padroniza o enquadramento óptico de latas, garrafas e produtos em canvas 800x800:
        1. Remove margens vazias/transparentes (autocrop).
        2. Escala proporcionalmente para altura óptica padrão de 680px (85% do canvas).
        3. Centraliza milimetricamente no canvas 800x800 transparente.
        """
        from PIL import Image, ImageChops

        if 'A' in img_pil.mode:
            alpha = img_pil.split()[-1]
            mask = alpha.point(lambda p: 255 if p > 10 else 0)
            bbox = mask.getbbox()
            if not bbox:
                bbox = (0, 0, img_pil.width, img_pil.height)
            cropped = img_pil.crop(bbox)
        else:
            corner = img_pil.getpixel((0, 0))
            bg = Image.new(img_pil.mode, img_pil.size, corner)
            diff = ImageChops.difference(img_pil, bg)
            mask = diff.convert('L').point(lambda p: 255 if p > 15 else 0)
            bbox = mask.getbbox()
            if not bbox:
                bbox = (0, 0, img_pil.width, img_pil.height)
            cropped = img_pil.crop(bbox)
            if corner[0] > 220 and corner[1] > 220 and corner[2] > 220:
                cropped = cropped.convert('RGBA')
                datas = cropped.getdata()
                newData = []
                for item in datas:
                    if item[0] > 235 and item[1] > 235 and item[2] > 235:
                        newData.append((255, 255, 255, 0))
                    else:
                        newData.append(item)
                cropped.putdata(newData)

        cw, ch = cropped.size
        target_canvas = 800

        # Para latas e produtos verticais (altura >= largura): altura padrão de 680px
        if ch >= cw:
            target_h = 680
            aspect = cw / ch
            new_h = target_h
            new_w = max(1, int(new_h * aspect))
            if new_w > 720:
                new_w = 720
                new_h = max(1, int(new_w / aspect))
        else:
            # Para produtos horizontais (snacks, petiscos): largura de 680px
            target_w = 680
            aspect = ch / cw
            new_w = target_w
            new_h = max(1, int(new_w * aspect))

        resized = cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (target_canvas, target_canvas), (0, 0, 0, 0))
        paste_x = (target_canvas - new_w) // 2
        paste_y = (target_canvas - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y), mask=resized if 'A' in resized.mode else None)
        return canvas

    @staticmethod
    async def salvar_foto_catalogo_mestre(arquivo: UploadFile) -> str:
        catalogo_folder = os.path.join(BASE_UPLOAD_DIR, "catalogo")
        StorageService._garantir_diretorio(catalogo_folder)

        # Sempre padroniza no formato WEBP para alta performance e leveza
        nome_seguro = f"mestre_{uuid.uuid4().hex}.webp"
        caminho_absoluto = os.path.abspath(os.path.join(catalogo_folder, nome_seguro))
        StorageService._validar_path_traversal(caminho_absoluto)

        conteudo = await arquivo.read()

        try:
            # Processa, orienta e normaliza dimensões ópticas com Pillow
            from PIL import Image, ImageOps
            import io

            img = Image.open(io.BytesIO(conteudo))
            img = ImageOps.exif_transpose(img) # Corrige orientação do celular

            if img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')

            canvas_normalizado = StorageService._padronizar_imagem_catalogo(img)
            canvas_normalizado.save(caminho_absoluto, format="WEBP", quality=90, method=6)
        except Exception:
            # Fallback seguro caso ocorra erro no processamento
            with open(caminho_absoluto, "wb") as buffer:
                buffer.write(conteudo)

        return f"/uploads/catalogo/{nome_seguro}"

    @staticmethod
    def obter_caminho_leitura_catalogo(nome_arquivo: str) -> str:
        catalogo_folder = os.path.join(BASE_UPLOAD_DIR, "catalogo")
        caminho_absoluto = os.path.abspath(os.path.join(catalogo_folder, nome_arquivo))
        StorageService._validar_path_traversal(caminho_absoluto)

        if not os.path.exists(caminho_absoluto):
            raise HTTPException(status_code=404, detail="Imagem do catálogo não encontrada.")

        return caminho_absoluto
