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
