from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text, or_
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.core.database import obter_sessao
from app.api.dependencias import obter_usuario_logado
from app.core.security import obter_hash_senha
from app.models.usuario import Usuario
from app.models.cliente import Cliente, CarteiraCliente
from app.models.estabelecimento import Estabelecimento, ModoOperacao
from app.models.comanda import Comanda, StatusComanda
from loguru import logger

router = APIRouter(prefix="/esigma", tags=["Integração Nativa e-Sigma (lojas_db)"])

# ==============================================================
# SCHEMAS SANITIZADOS (ZERO VAZAMENTO DE DADOS MAÇÔNICOS)
# ==============================================================

class ConsumidorSanitizadoResponse(BaseModel):
    cliente_id: int
    nome: str
    cpf_mascarado: str
    cim: Optional[str] = None
    tipo_consumidor: str # 'IRMAO_QUADRO', 'IRMAO_VISITANTE', 'FAMILIAR', 'CONVIDADO_NAO_MACOM'
    nome_loja_origem: Optional[str] = None
    nome_irmao_responsavel: Optional[str] = None
    identificador_qr: str
    comanda_aberta_id: Optional[int] = None
    saldo_carteira: float = 0.0

class CadastrarClienteNaoMacomRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    cpf: str = Field(..., min_length=5, max_length=20)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    tipo_consumidor: str = Field(default="FAMILIAR", pattern="^(FAMILIAR|CONVIDADO_NAO_MACOM)$")
    cim_ou_cpf_irmao_responsavel: Optional[str] = Field(None, description="CIM ou CPF do Irmão anfitrião/familiar")
    familiar_esigma_id: Optional[int] = None
    abrir_comanda_imediata: bool = True

class FamiliarDisponivelResponse(BaseModel):
    familiar_id: int
    nome_familiar: str
    tipo_relacionamento: Optional[str] = None
    email: Optional[str] = None
    telefone: Optional[str] = None
    obreiro_id: int
    nome_obreiro: str
    cim_obreiro: Optional[str] = None

class CriarOperadorAgapeRequest(BaseModel):
    nome: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=100)
    senha: str = Field(..., min_length=4, max_length=100)
    cpf: Optional[str] = Field(None, max_length=20)
    telefone: Optional[str] = Field(None, max_length=30)
    cargo: str = Field(default="OPERADOR_BALCAO", pattern="^(OPERADOR_BALCAO|GARCOM|WEBMASTER)$")
    tipo_vinculo: str = Field(default="CONTRATADO_EXTERNO", pattern="^(FAMILIAR_LOJA|CONTRATADO_EXTERNO|OFICIAL_LOJA)$")
    familiar_esigma_id: Optional[int] = None
    obreiro_responsavel_id: Optional[int] = None

class OperadorAgapeResponse(BaseModel):
    id: int
    nome: str
    email: str
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    cargo: str
    tipo_vinculo: str
    familiar_esigma_id: Optional[int] = None
    obreiro_responsavel_id: Optional[int] = None
    ativo: bool

    class Config:
        from_attributes = True


# ==============================================================
# HELPER: MASCARAR CPF
# ==============================================================
def mascarar_cpf(cpf: Optional[str]) -> str:
    if not cpf:
        return "***.***.***-**"
    if cpf.startswith("CIM:"):
        return f"CIM {cpf.split(':', 1)[1]}"
    limpo = cpf.replace(".", "").replace("-", "")
    if len(limpo) >= 11:
        return f"***.{limpo[3:6]}.{limpo[6:9]}-{limpo[9:11]}"
    return cpf


# ==============================================================
# 1. IDENTIFICAÇÃO AUTOMÁTICA POR CIM, CPF OU QR CODE
# ==============================================================
@router.get("/identificar-consumidor", response_model=ConsumidorSanitizadoResponse)
async def identificar_consumidor_por_cim_ou_cpf(
    identificador: str = Query(..., description="CIM, CPF ou Tag QR Code (ex: AGAPE:CLIENTE:123456)"),
    abrir_comanda_se_nao_existir: bool = Query(False),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Reconhece automaticamente um Irmão do Quadro ('obreiros'), Irmão Visitante ('visitantes'),
    Familiar ('familiares') ou Convidado ('agape_clientes') usando CIM, CPF ou QR Code.
    Retorna APENAS dados sanitizados para o operador do balcão (sem graus ou dados secretos da Loja).
    """
    termo = identificador.strip()
    for prefixo in ["AGAPE:CLIENTE:", "BIPFY:CLIENTE:", "BARIX:CLIENTE:"]:
        if termo.upper().startswith(prefixo):
            termo = termo[len(prefixo):].strip()

    termo_limpo = termo.replace(".", "").replace("-", "").strip()

    # 1. Busca primeiro em agape_clientes (por CPF exato, CPF limpo ou CIM)
    res_cli = await db.execute(
        select(Cliente).where(
            or_(
                Cliente.cpf == termo,
                Cliente.cpf == termo_limpo,
                Cliente.cim == termo,
                Cliente.cim == termo_limpo,
                Cliente.cpf == f"CIM:{termo_limpo}"
            )
        )
    )
    cliente = res_cli.scalars().first()

    # 2. Se ainda não existe em agape_clientes, consulta 'obreiros' e 'visitantes' no lojas_db!
    if not cliente:
        try:
            # 2a. Consulta 'obreiros' no lojas_db (apenas colunas civis e CIM)
            sql_obreiro = text("""
                SELECT id, nome_completo, cpf, cim, email, telefone
                FROM obreiros
                WHERE REPLACE(REPLACE(COALESCE(cpf, ''), '.', ''), '-', '') = :termo
                   OR TRIM(COALESCE(cim, '')) = :termo_raw
                LIMIT 1
            """)
            res_ob = await db.execute(sql_obreiro, {"termo": termo_limpo, "termo_raw": termo})
            row_ob = res_ob.mappings().first()

            if row_ob:
                cpf_val = (row_ob["cpf"] or "").replace(".", "").replace("-", "").strip() or f"CIM:{row_ob['cim']}"
                cliente = Cliente(
                    cpf=cpf_val,
                    cim=str(row_ob["cim"]).strip() if row_ob["cim"] else None,
                    nome=row_ob["nome_completo"],
                    email=row_ob["email"],
                    telefone=row_ob["telefone"],
                    tipo_consumidor="IRMAO_QUADRO",
                    obreiro_esigma_id=row_ob["id"]
                )
                db.add(cliente)
                await db.commit()
                await db.refresh(cliente)
                logger.info(f"Irmão do Quadro '{cliente.nome}' (CIM: {cliente.cim}) sincronizado automaticamente para o Ágape.")

            # 2b. Se não achou em obreiros, consulta 'visitantes' no lojas_db
            if not cliente:
                sql_vis = text("""
                    SELECT id, nome_completo, cpf, cim, email, telefone, nome_loja_manual
                    FROM visitantes
                    WHERE REPLACE(REPLACE(COALESCE(cpf, ''), '.', ''), '-', '') = :termo
                       OR TRIM(COALESCE(cim, '')) = :termo_raw
                    LIMIT 1
                """)
                res_vis = await db.execute(sql_vis, {"termo": termo_limpo, "termo_raw": termo})
                row_vis = res_vis.mappings().first()

                if row_vis:
                    cpf_val = (row_vis["cpf"] or "").replace(".", "").replace("-", "").strip() or f"CIM:{row_vis['cim']}"
                    cliente = Cliente(
                        cpf=cpf_val,
                        cim=str(row_vis["cim"]).strip() if row_vis["cim"] else None,
                        nome=row_vis["nome_completo"],
                        email=row_vis["email"],
                        telefone=row_vis["telefone"],
                        tipo_consumidor="IRMAO_VISITANTE",
                        visitante_esigma_id=row_vis["id"],
                        nome_loja_origem=row_vis["nome_loja_manual"]
                    )
                    db.add(cliente)
                    await db.commit()
                    await db.refresh(cliente)
                    logger.info(f"Irmão Visitante '{cliente.nome}' (CIM: {cliente.cim}) sincronizado automaticamente para o Ágape.")
        except Exception as e:
            logger.warning(f"Consulta direta às tabelas nativas do lojas_db indisponível ou sem permissão: {e}")

    if not cliente:
        raise HTTPException(
            status_code=404,
            detail="Consumidor não encontrado por este CIM/CPF. Caso seja um familiar ou convidado não maçom, utilize o cadastro rápido de convidado."
        )

    # 3. Verifica se já possui comanda aberta nesta Loja
    comanda_aberta = None
    if usuario.tenant_id:
        res_com = await db.execute(
            select(Comanda).where(
                Comanda.tenant_id == usuario.tenant_id,
                Comanda.cliente_id == cliente.id,
                Comanda.status == StatusComanda.ABERTA
            )
        )
        comanda_aberta = res_com.scalars().first()

        if not comanda_aberta and abrir_comanda_se_nao_existir:
            comanda_aberta = Comanda(
                tenant_id=usuario.tenant_id,
                cliente_id=cliente.id,
                nome_cliente=cliente.nome,
                identificador_cartao=f"AGAPE:{cliente.cim or cliente.cpf}",
                status=StatusComanda.ABERTA
            )
            db.add(comanda_aberta)
            await db.commit()
            await db.refresh(comanda_aberta)

    # 4. Saldo na carteira da Loja
    saldo = 0.0
    if usuario.tenant_id:
        res_cart = await db.execute(
            select(CarteiraCliente).where(
                CarteiraCliente.cliente_id == cliente.id,
                CarteiraCliente.tenant_id == usuario.tenant_id
            )
        )
        cart = res_cart.scalars().first()
        if cart:
            saldo = cart.saldo

    chave_qr = cliente.cim or cliente.cpf
    return ConsumidorSanitizadoResponse(
        cliente_id=cliente.id,
        nome=cliente.nome,
        cpf_mascarado=mascarar_cpf(cliente.cpf),
        cim=cliente.cim,
        tipo_consumidor=cliente.tipo_consumidor,
        nome_loja_origem=cliente.nome_loja_origem,
        identificador_qr=f"AGAPE:CLIENTE:{chave_qr}",
        comanda_aberta_id=comanda_aberta.id if comanda_aberta else None,
        saldo_carteira=saldo
    )


# ==============================================================
# 2. CADASTRO DE CLIENTES NÃO MAÇONS (FAMILIARES E CONVIDADOS)
# ==============================================================
@router.post("/clientes-nao-macons", response_model=ConsumidorSanitizadoResponse, status_code=status.HTTP_201_CREATED)
async def cadastrar_cliente_nao_macom(
    dados: CadastrarClienteNaoMacomRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Cadastra familiares de maçons (Cunhadas, Sobrinhos) ou convidados não maçons no Ágape,
    mantendo isolamento total da tabela 'obreiros' da Loja.
    """
    cpf_limpo = dados.cpf.replace(".", "").replace("-", "").strip()

    res_existente = await db.execute(select(Cliente).where(Cliente.cpf == cpf_limpo))
    cliente = res_existente.scalars().first()

    obreiro_resp_id = None
    nome_irmao_resp = None

    # Se informou o CIM ou CPF do Irmão anfitrião/responsável, localiza o vínculo
    if dados.cim_ou_cpf_irmao_responsavel:
        termo_resp = dados.cim_ou_cpf_irmao_responsavel.replace(".", "").replace("-", "").strip()
        try:
            sql_resp = text("""
                SELECT id, nome_completo FROM obreiros
                WHERE REPLACE(REPLACE(COALESCE(cpf, ''), '.', ''), '-', '') = :t
                   OR TRIM(COALESCE(cim, '')) = :t_raw
                LIMIT 1
            """)
            res_r = await db.execute(sql_resp, {"t": termo_resp, "t_raw": dados.cim_ou_cpf_irmao_responsavel.strip()})
            row_r = res_r.mappings().first()
            if row_r:
                obreiro_resp_id = row_r["id"]
                nome_irmao_resp = row_r["nome_completo"]
        except Exception:
            pass

    if not cliente:
        cliente = Cliente(
            cpf=cpf_limpo,
            nome=dados.nome.strip(),
            telefone=dados.telefone,
            email=dados.email,
            tipo_consumidor=dados.tipo_consumidor,
            familiar_esigma_id=dados.familiar_esigma_id,
            obreiro_responsavel_id=obreiro_resp_id,
            observacao=f"Responsável: {nome_irmao_resp}" if nome_irmao_resp else "Convidado / Familiar no Ágape"
        )
        db.add(cliente)
        await db.commit()
        await db.refresh(cliente)

    comanda_aberta = None
    if dados.abrir_comanda_imediata and usuario.tenant_id:
        res_com = await db.execute(
            select(Comanda).where(
                Comanda.tenant_id == usuario.tenant_id,
                Comanda.cliente_id == cliente.id,
                Comanda.status == StatusComanda.ABERTA
            )
        )
        comanda_aberta = res_com.scalars().first()
        if not comanda_aberta:
            comanda_aberta = Comanda(
                tenant_id=usuario.tenant_id,
                cliente_id=cliente.id,
                nome_cliente=cliente.nome,
                identificador_cartao=f"AGAPE:FAM:{cliente.cpf}",
                status=StatusComanda.ABERTA
            )
            db.add(comanda_aberta)
            await db.commit()
            await db.refresh(comanda_aberta)

    return ConsumidorSanitizadoResponse(
        cliente_id=cliente.id,
        nome=cliente.nome,
        cpf_mascarado=mascarar_cpf(cliente.cpf),
        cim=None,
        tipo_consumidor=cliente.tipo_consumidor,
        nome_irmao_responsavel=nome_irmao_resp,
        identificador_qr=f"AGAPE:CLIENTE:{cliente.cpf}",
        comanda_aberta_id=comanda_aberta.id if comanda_aberta else None,
        saldo_carteira=0.0
    )


# ==============================================================
# 3. GESTÃO DE OPERADORES DO ÁGAPE (FAMILIARES DE MAÇONS E EXTERNOS)
# ==============================================================
@router.get("/familiares-disponiveis", response_model=List[FamiliarDisponivelResponse])
async def buscar_familiares_para_operador_ou_consumo(
    busca: Optional[str] = Query(None, description="Nome do familiar ou Nome/CIM do Irmão"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Permite ao Mestre de Banquetes buscar familiares já cadastrados na tabela 'familiares' do lojas_db
    para habilitá-los rapidamente como Operadores do Balcão ou Clientes no Ágape.
    """
    if usuario.cargo not in ("SUPERADMIN", "WEBMASTER"):
        raise HTTPException(status_code=403, detail="Apenas gestores da Loja podem consultar o cadastro de familiares.")

    try:
        filtro_sql = ""
        params = {}
        if busca:
            filtro_sql = "AND (f.nome_completo ILIKE :b OR o.nome_completo ILIKE :b OR o.cim ILIKE :b)"
            params["b"] = f"%{busca.strip()}%"

        sql = text(f"""
            SELECT f.id AS familiar_id, f.nome_completo AS nome_familiar, f.tipo_relacionamento,
                   f.email, f.telefone, o.id AS obreiro_id, o.nome_completo AS nome_obreiro, o.cim AS cim_obreiro
            FROM familiares f
            JOIN obreiros o ON f.obreiro_id = o.id
            WHERE COALESCE(f.falecido, false) = false
            {filtro_sql}
            ORDER BY f.nome_completo ASC
            LIMIT 50
        """)
        res = await db.execute(sql, params)
        return [FamiliarDisponivelResponse(**dict(r)) for r in res.mappings().all()]
    except Exception as e:
        logger.warning(f"Erro ao consultar familiares no lojas_db: {e}")
        return []


@router.get("/operadores", response_model=List[OperadorAgapeResponse])
async def listar_operadores_agape(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """Lista os operadores do Salão de Ágapes (Familiares de Maçons e Contratados Externos Não Maçons)."""
    if usuario.cargo not in ("SUPERADMIN", "WEBMASTER"):
        raise HTTPException(status_code=403, detail="Acesso restrito ao Mestre de Banquetes / Webmaster.")

    query = select(Usuario).order_by(Usuario.id.desc())
    if usuario.tenant_id:
        query = query.where(Usuario.tenant_id == usuario.tenant_id)
    res = await db.execute(query)
    return res.scalars().all()


@router.post("/operadores", response_model=OperadorAgapeResponse, status_code=status.HTTP_201_CREATED)
async def cadastrar_operador_agape(
    dados: CriarOperadorAgapeRequest,
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Cadastra um Operador para o Salão de Ágapes (Garçom/Atendente não maçom ou Familiar de Maçom).
    Garante isolamento total: o operador acessa apenas o Ágape e jamais a tabela 'obreiros'.
    """
    if usuario.cargo not in ("SUPERADMIN", "WEBMASTER"):
        raise HTTPException(status_code=403, detail="Apenas o Mestre de Banquetes / Webmaster pode cadastrar operadores.")

    res_email = await db.execute(select(Usuario).where(Usuario.email == dados.email.strip().lower()))
    if res_email.scalars().first():
        raise HTTPException(status_code=400, detail="Já existe um operador/usuário com este e-mail no Ágape.")

    novo_op = Usuario(
        tenant_id=usuario.tenant_id,
        nome=dados.nome.strip(),
        email=dados.email.strip().lower(),
        cpf=dados.cpf,
        telefone=dados.telefone,
        senha_hash=obter_hash_senha(dados.senha),
        cargo=dados.cargo,
        tipo_vinculo=dados.tipo_vinculo,
        familiar_esigma_id=dados.familiar_esigma_id,
        obreiro_responsavel_id=dados.obreiro_responsavel_id,
        ativo=True
    )
    db.add(novo_op)

    # Se o operador for um FAMILIAR_LOJA e tiver CPF, já garante também seu registro em agape_clientes
    # caso ele também consuma durante o evento!
    if dados.tipo_vinculo == "FAMILIAR_LOJA" and dados.cpf:
        cpf_limpo = dados.cpf.replace(".", "").replace("-", "").strip()
        res_cli = await db.execute(select(Cliente).where(Cliente.cpf == cpf_limpo))
        if not res_cli.scalars().first():
            db.add(Cliente(
                cpf=cpf_limpo,
                nome=dados.nome.strip(),
                telefone=dados.telefone,
                email=dados.email.strip().lower(),
                tipo_consumidor="FAMILIAR",
                familiar_esigma_id=dados.familiar_esigma_id,
                obreiro_responsavel_id=dados.obreiro_responsavel_id,
                observacao="Familiar atuando também como Operador do Ágape"
            ))

    await db.commit()
    await db.refresh(novo_op)
    return novo_op


@router.patch("/operadores/{operador_id}/status", response_model=OperadorAgapeResponse)
async def alternar_status_operador_agape(
    operador_id: int,
    ativo: bool = Query(..., description="True para liberar acesso na sessão de hoje, False para encerrar acesso"),
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """Permite ativar o login do garçom/atendente apenas na noite da sessão e desativar ao final."""
    if usuario.cargo not in ("SUPERADMIN", "WEBMASTER"):
        raise HTTPException(status_code=403, detail="Sem permissão.")

    res = await db.execute(select(Usuario).where(Usuario.id == operador_id))
    op = res.scalars().first()
    if not op or (usuario.tenant_id and op.tenant_id != usuario.tenant_id):
        raise HTTPException(status_code=404, detail="Operador não encontrado.")

    op.ativo = ativo
    await db.commit()
    await db.refresh(op)
    return op


# ==============================================================
# 4. SINCRONIZAÇÃO DE LOJAS DO LOJAS_DB PARA O ÁGAPE
# ==============================================================
@router.post("/sincronizar-lojas")
async def sincronizar_lojas_esigma(
    db: AsyncSession = Depends(obter_sessao),
    usuario: Usuario = Depends(obter_usuario_logado)
):
    """
    Importa automaticamente as Lojas Maçônicas cadastradas na tabela 'lojas' do lojas_db
    para 'agape_estabelecimentos', permitindo ativar o Salão de Ágapes para cada Loja.
    """
    if usuario.cargo != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Apenas SuperAdmin pode sincronizar Lojas do e-Sigma.")

    sql_lojas = text("""
        SELECT id, nome_loja, numero_loja, rito, cnpj, ativo
        FROM lojas
        ORDER BY id ASC
    """)
    res_lojas = await db.execute(sql_lojas)
    lojas_rows = res_lojas.mappings().all()

    criadas = 0
    for r in lojas_rows:
        res_est = await db.execute(select(Estabelecimento).where(Estabelecimento.loja_esigma_id == r["id"]))
        est = res_est.scalars().first()
        if not est:
            nome_exibicao = f"{r['nome_loja']} Nº {r['numero_loja']}" if r["numero_loja"] else r["nome_loja"]
            novo_est = Estabelecimento(
                loja_esigma_id=r["id"],
                nome_fantasia=nome_exibicao,
                numero_loja=str(r["numero_loja"]) if r["numero_loja"] else None,
                rito=r["rito"],
                cnpj=r["cnpj"],
                ativo=bool(r["ativo"]) if r["ativo"] is not None else True,
                modo_operacao=ModoOperacao.HIBRIDO
            )
            db.add(novo_est)
            criadas += 1

    await db.commit()
    return {"mensagem": f"Sincronização concluída! {criadas} novas Lojas importadas do lojas_db.", "total_lojas_lidas": len(lojas_rows)}
