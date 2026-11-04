from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.services.storage_service import StorageService

router = APIRouter(prefix="/uploads", tags=["Uploads e Arquivos"])

@router.post("/produtos")
async def upload_foto_produto(
    file: UploadFile = File(...),
    usuario_atual: Usuario = Depends(obter_usuario_logado)
):
    """
    Salva a foto de um produto no disco, isolado na pasta do tenant atual.
    """
    if not usuario_atual.tenant_id:
        return {"error": "Apenas contas de estabelecimentos podem fazer upload."}
        
    caminho_relativo = await StorageService.salvar_foto_produto(usuario_atual.tenant_id, file)
    return {"url": caminho_relativo}

@router.get("/tenant_{tenant_id}/{nome_arquivo}")
async def visualizar_foto_produto(tenant_id: int, nome_arquivo: str):
    """
    Serve a imagem de forma estática para o Frontend e App Mobile.
    Possui trava contra Path Traversal embutida no StorageService.
    """
    caminho_absoluto = StorageService.obter_caminho_leitura(tenant_id, nome_arquivo)
    return FileResponse(caminho_absoluto)
