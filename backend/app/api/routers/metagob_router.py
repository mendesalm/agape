from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

from app.core.database import obter_sessao
from app.api.dependencias import obter_usuario_logado
from app.models.usuario import Usuario
from app.services.metagob_service import MetaGobService

router = APIRouter(prefix="/integracoes/metagob", tags=["Integração MetaGOB (Grande Oriente do Brasil)"])

class VerificarPinRequest(BaseModel):
    cim: str = Field(..., description="CIM do Obreiro (Cadastro de Identificação Maçônica)", example="123456")
    pin: str = Field(..., description="PIN dinâmico temporário gerado no app e-GOB Card (6 dígitos)", example="483920")
    sincronizar_cliente: bool = Field(True, description="Se True, cria ou atualiza o perfil do Cliente na base do Bar")

class DadosMembroEgob(BaseModel):
    nome: str
    cim: str
    grau: Optional[str] = None
    loja: Optional[str] = None
    situacao: Optional[str] = None

class VerificarPinResponse(BaseModel):
    sucesso: bool
    valid: bool
    mensagem: str
    verified_at: Optional[str] = None
    member: Optional[DadosMembroEgob] = None
    cliente: Optional[Dict[str, Any]] = None

@router.post("/verificar-pin", response_model=VerificarPinResponse)
async def verificar_pin_egob_card(
    dados: VerificarPinRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Realiza a conferência de identidade e regularidade maçônica do obreiro
    através da API externa MetaGOB (OAuth2 com escopo members:verify-egob-pin).
    
    Regras de Negócio:
    - O PIN possui validade máxima de 5 minutos gerado pelo app e-GOB Card.
    - Apenas o último PIN gerado pelo irmão é aceito.
    - 5 tentativas incorretas consecutivas derrubam o PIN por segurança.
    - Se válido, sincroniza os dados oficiais (Nome, CIM, Grau, Loja, Situação)
      com o perfil de cliente e inicializa sua carteira no Bar/Ágape.
    """
    if dados.sincronizar_cliente:
        resultado = await MetaGobService.verificar_e_sincronizar_cliente(
            db=db,
            tenant_id=usuario.tenant_id,
            cim=dados.cim,
            pin=dados.pin
        )
    else:
        resultado_externo = await MetaGobService.verificar_pin_egob(
            cim=dados.cim,
            pin=dados.pin
        )
        resultado = {
            "sucesso": resultado_externo.get("valid", False),
            "valid": resultado_externo.get("valid", False),
            "mensagem": resultado_externo.get("mensagem") or resultado_externo.get("message", ""),
            "verified_at": resultado_externo.get("verified_at"),
            "member": resultado_externo.get("member"),
            "cliente": None
        }

    return resultado
