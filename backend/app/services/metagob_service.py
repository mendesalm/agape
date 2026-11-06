import time
import httpx
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import config
from app.core.logger import logger
from app.models.cliente import Cliente, CarteiraCliente

class MetaGobService:
    """
    Serviço oficial de integração com a API MetaGOB (Grande Oriente do Brasil).
    Responsável por validar a identidade e regularidade maçônica de obreiros
    através do PIN dinâmico temporário do e-GOB Card (TOTP / OTP).
    
    Regras da API Externa:
    - Autenticação via OAuth2 Client Credentials (escopo: members:verify-egob-pin).
    - Endpoint: POST /api/v2/external/members/egob-card/verify
    - Payload: { "cim": "123456", "pin": "483920" }
    - Validade do PIN: 5 minutos (apenas o último PIN gerado pelo app é aceito).
    - Segurança: 5 tentativas erradas invalidam o PIN na origem.
    """

    _cached_token: Optional[str] = None
    _token_expires_at: Optional[float] = None

    @classmethod
    async def obter_access_token(cls) -> str:
        """
        Obtém ou reutiliza o Access Token OAuth2 com escopo members:verify-egob-pin.
        Garante cache em memória para evitar requisições repetidas de autenticação.
        """
        agora = time.time()
        if cls._cached_token and cls._token_expires_at and agora < (cls._token_expires_at - 60):
            return cls._cached_token

        # Se estiver em modo sandbox ou sem credenciais preenchidas
        if config.METAGOB_SANDBOX_MODE or not config.METAGOB_CLIENT_ID or not config.METAGOB_CLIENT_SECRET:
            cls._cached_token = "mock_token_metagob_sandbox"
            cls._token_expires_at = agora + 3600
            return cls._cached_token

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                payload = {
                    "grant_type": "client_credentials",
                    "client_id": config.METAGOB_CLIENT_ID,
                    "client_secret": config.METAGOB_CLIENT_SECRET,
                    "scope": "members:verify-egob-pin"
                }
                res = await client.post(config.METAGOB_TOKEN_URL, data=payload)
                if res.status_code == 200:
                    dados = res.json()
                    cls._cached_token = dados.get("access_token")
                    expires_in = int(dados.get("expires_in", 3600))
                    cls._token_expires_at = agora + expires_in
                    logger.info("Novo token OAuth2 MetaGOB emitido com sucesso.")
                    return cls._cached_token
                else:
                    logger.error(f"Falha na autenticação OAuth2 MetaGOB: {res.status_code} - {res.text}")
                    raise Exception(f"Erro na autenticação MetaGOB: HTTP {res.status_code}")
        except Exception as e:
            logger.error(f"Exceção ao solicitar token MetaGOB: {str(e)}")
            # Em caso de falha de conexão com a API externa e sandbox permitido, usa fallback
            if config.METAGOB_SANDBOX_MODE:
                return "mock_token_metagob_sandbox"
            raise e

    @classmethod
    async def verificar_pin_egob(cls, cim: str, pin: str) -> Dict[str, Any]:
        """
        Executa a verificação de PIN dinâmico do e-GOB Card junto à API do MetaGOB.
        Retorna dicionário com:
        - valid: bool
        - member: { nome, cim, grau, loja, situacao }
        - verified_at: string ISO
        - mensagem: mensagem descritiva (especialmente em caso de erro ou PIN expirado)
        """
        cim_limpo = str(cim).strip().lstrip("0") or str(cim).strip()
        pin_limpo = str(pin).strip()

        if not cim_limpo or not pin_limpo:
            return {
                "valid": False,
                "message": "CIM e PIN são obrigatórios para validação.",
                "verified_at": datetime.utcnow().isoformat() + "Z"
            }

        # Modo Sandbox / Simulação local (quando credenciais de produção não foram preenchidas)
        if config.METAGOB_SANDBOX_MODE and (not config.METAGOB_CLIENT_ID or config.METAGOB_CLIENT_ID == "demo"):
            # Regra de mock: PINs de teste como '483920', '123456' ou qualquer PIN de 6 dígitos que não termine em '0'
            if len(pin_limpo) == 6 and not pin_limpo.endswith("00"):
                return {
                    "valid": True,
                    "member": {
                        "nome": f"Irmão e-GOB {cim_limpo}",
                        "cim": cim_limpo,
                        "grau": "Mestre Maçom",
                        "loja": "ARLS Fraternidade e Confraternização Nº 0001",
                        "situacao": "REGULAR"
                    },
                    "verified_at": datetime.utcnow().isoformat() + "Z",
                    "mensagem": "Obreiro validado com sucesso via e-GOB Card (Sandbox)."
                }
            else:
                return {
                    "valid": False,
                    "message": "PIN incorreto, expirado ou derrubado após tentativas excessivas (Sandbox).",
                    "verified_at": datetime.utcnow().isoformat() + "Z"
                }

        # Conexão Real com a API MetaGOB
        token = await cls.obter_access_token()
        url = f"{config.METAGOB_API_URL.rstrip('/')}/api/v2/external/members/egob-card/verify"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        body = {
            "cim": cim_limpo,
            "pin": pin_limpo
        }

        try:
            async with httpx.AsyncClient(timeout=7.0) as client:
                res = await client.post(url, json=body, headers=headers)
                
                # Se token expirou na API externa, invalida cache e tenta uma vez mais
                if res.status_code == 401:
                    cls._cached_token = None
                    token = await cls.obter_access_token()
                    headers["Authorization"] = f"Bearer {token}"
                    res = await client.post(url, json=body, headers=headers)

                if res.status_code == 200:
                    dados = res.json()
                    return {
                        "valid": dados.get("valid", False),
                        "member": dados.get("member"),
                        "verified_at": dados.get("verified_at") or (datetime.utcnow().isoformat() + "Z"),
                        "mensagem": "Identidade e regularidade maçônica confirmadas pelo GOB." if dados.get("valid") else "PIN inválido ou expirado."
                    }
                elif res.status_code in [400, 422]:
                    dados = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
                    msg = dados.get("message") or "PIN inválido, expirado ou excedeu 5 tentativas incorretas."
                    return {
                        "valid": False,
                        "message": msg,
                        "verified_at": datetime.utcnow().isoformat() + "Z"
                    }
                else:
                    logger.error(f"MetaGOB retornou HTTP {res.status_code}: {res.text}")
                    return {
                        "valid": False,
                        "message": f"Não foi possível validar o PIN junto ao MetaGOB (HTTP {res.status_code}).",
                        "verified_at": datetime.utcnow().isoformat() + "Z"
                    }
        except httpx.TimeoutException:
            logger.warning(f"Timeout ao consultar MetaGOB para CIM {cim_limpo}")
            return {
                "valid": False,
                "message": "Tempo limite esgotado ao consultar a base do MetaGOB. Tente novamente.",
                "verified_at": datetime.utcnow().isoformat() + "Z"
            }
        except Exception as e:
            logger.error(f"Erro inesperado ao consultar MetaGOB: {str(e)}")
            return {
                "valid": False,
                "message": f"Erro de comunicação com o serviço do MetaGOB: {str(e)}",
                "verified_at": datetime.utcnow().isoformat() + "Z"
            }

    @classmethod
    async def verificar_e_sincronizar_cliente(
        cls, 
        db: AsyncSession, 
        tenant_id: int, 
        cim: str, 
        pin: str
    ) -> Dict[str, Any]:
        """
        Valida o PIN no MetaGOB e, se válido:
        1. Localiza ou cadastra o Cliente correspondente na base do Bar/Loja.
        2. Atualiza grau maçônico, situação no GOB e marca validado_metagob = True.
        3. Inicializa ou sincroniza a Carteira de Consumo para o tenant_id ativo.
        """
        resultado_pin = await cls.verificar_pin_egob(cim, pin)

        if not resultado_pin.get("valid") or not resultado_pin.get("member"):
            return {
                "sucesso": False,
                "valid": False,
                "mensagem": resultado_pin.get("message", "PIN inválido ou expirado."),
                "cliente": None
            }

        membro = resultado_pin["member"]
        cim_membro = str(membro.get("cim") or cim).strip()
        nome_membro = membro.get("nome", "").strip() or f"Irmão CIM {cim_membro}"
        grau_membro = membro.get("grau")
        loja_membro = membro.get("loja")
        situacao_membro = membro.get("situacao", "REGULAR")

        # 1. Localiza cliente existente por CIM
        query = select(Cliente).where(Cliente.cim == cim_membro)
        res = await db.execute(query)
        cliente = res.scalars().first()

        if cliente:
            # Atualiza dados oficiais
            cliente.nome = nome_membro
            cliente.grau_maconico = grau_membro
            cliente.situacao_gob = situacao_membro
            if loja_membro:
                cliente.nome_loja_origem = loja_membro
            cliente.validado_metagob = True
            cliente.data_validacao_metagob = datetime.utcnow()
        else:
            # Cadastra novo cliente como IRMAO_VISITANTE ou do Quadro
            chave_cpf = f"CIM:{cim_membro}"
            cliente = Cliente(
                cpf=chave_cpf,
                cim=cim_membro,
                nome=nome_membro,
                grau_maconico=grau_membro,
                situacao_gob=situacao_membro,
                nome_loja_origem=loja_membro or "Grande Oriente do Brasil",
                tipo_consumidor="IRMAO_VISITANTE",
                validado_metagob=True,
                data_validacao_metagob=datetime.utcnow(),
                observacao="Cadastrado e autenticado via validação dinâmica e-GOB Card."
            )
            db.add(cliente)
            await db.flush()

        # 2. Garante que o cliente possui Carteira para o tenant_id atual
        res_cart = await db.execute(
            select(CarteiraCliente).where(
                CarteiraCliente.cliente_id == cliente.id,
                CarteiraCliente.tenant_id == tenant_id
            )
        )
        carteira = res_cart.scalars().first()
        if not carteira:
            nova_carteira = CarteiraCliente(
                cliente_id=cliente.id,
                tenant_id=tenant_id,
                saldo=0.0,
                limite_fiado=150.0
            )
            db.add(nova_carteira)

        await db.commit()
        await db.refresh(cliente)

        return {
            "sucesso": True,
            "valid": True,
            "mensagem": f"Obreiro {cliente.nome} verificado com sucesso pelo MetaGOB!",
            "verified_at": resultado_pin.get("verified_at"),
            "member": membro,
            "cliente": {
                "id": cliente.id,
                "nome": cliente.nome,
                "cim": cliente.cim,
                "grau": cliente.grau_maconico,
                "loja_origem": cliente.nome_loja_origem,
                "situacao": cliente.situacao_gob,
                "tipo_consumidor": cliente.tipo_consumidor,
                "validado_metagob": cliente.validado_metagob
            }
        }
