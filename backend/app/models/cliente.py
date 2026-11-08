from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Enum, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class Cliente(Base):
    """
    Consumidor no Salão de Ágapes (agape.e-sigma.app).
    Unifica:
    1. Irmãos do Quadro (sincronizados automaticamente da tabela 'obreiros' por CIM ou CPF)
    2. Irmãos Visitantes (sincronizados automaticamente da tabela 'visitantes' por CIM ou CPF)
    3. Familiares de Maçons (sincronizados de 'familiares' ou cadastrados no Ágape)
    4. Convidados Não Maçons (sessões brancas / eventos beneficentes)
    
    Garante que o operador do balcão veja apenas dados de consumo (nome, tipo, saldo),
    protegendo os dados ritualísticos da tabela 'obreiros'.
    """
    __tablename__ = "agape_clientes"

    id = Column(Integer, primary_key=True, index=True)
    cpf = Column(String(20), unique=True, nullable=False, index=True) # CPF ou chave "CIM:{cim}" quando CPF não informado
    cim = Column(String(30), unique=True, nullable=True, index=True)  # CIM Maçônico para reconhecimento imediato
    
    nome = Column(String(100), nullable=False)
    telefone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    
    # Classificação no Ágape: 'IRMAO_QUADRO', 'IRMAO_VISITANTE', 'FAMILIAR', 'CONVIDADO_NAO_MACOM'
    tipo_consumidor = Column(String(30), default="IRMAO_QUADRO", nullable=False, index=True)
    
    # Vínculos de origem com as tabelas existentes do lojas_db (sem expor dados maçônicos ao garçom)
    obreiro_esigma_id = Column(Integer, nullable=True, index=True)      # obreiros.id
    visitante_esigma_id = Column(Integer, nullable=True, index=True)    # visitantes.id
    familiar_esigma_id = Column(Integer, nullable=True, index=True)     # familiares.id
    obreiro_responsavel_id = Column(Integer, nullable=True, index=True) # Irmão anfitrião (para familiares/convidados)
    nome_loja_origem = Column(String(120), nullable=True)               # Ex: Loja de origem do visitante

    # Validação e Dados Oficiais MetaGOB (e-GOB Card)
    grau_maconico = Column(String(50), nullable=True)                   # Ex: Mestre Maçom
    situacao_gob = Column(String(50), nullable=True)                    # Ex: REGULAR, ATIVO
    validado_metagob = Column(Boolean, default=False)                   # True se conferido via PIN oficial
    data_validacao_metagob = Column(DateTime, nullable=True)

    # Carteiras e Documentos com QR Code Atrelados (CNH, CNI, e-GOB Card, Militares, OAB, etc.)
    identificadores_qr = Column(JSON().with_variant(JSONB, "postgresql"), default=list, nullable=False)

    observacao = Column(String(255), nullable=True)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
    ativo = Column(Boolean, default=True)

    # Relacionamentos
    carteiras = relationship("CarteiraCliente", back_populates="cliente", cascade="all, delete-orphan")
    cartoes = relationship("CartaoCliente", back_populates="cliente", cascade="all, delete-orphan")
    vinculos_cartoes = relationship("VinculoCartaoCliente", back_populates="cliente")

class CarteiraCliente(Base):
    """Saldo financeiro isolado por Loja (Salão de Ágapes)"""
    __tablename__ = "agape_carteiras_clientes"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("agape_clientes.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    
    saldo = Column(Float, default=0.0, nullable=False)
    limite_fiado = Column(Float, default=100.0, nullable=False) # Trava de limite devedor máximo (R$ 100,00)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cliente = relationship("Cliente", back_populates="carteiras")
    estabelecimento = relationship("Estabelecimento")
    transacoes = relationship("TransacaoCarteira", back_populates="carteira", cascade="all, delete-orphan")

class TipoTransacaoCarteira(str, enum.Enum):
    CREDITO_PIX = "credito_pix"
    CREDITO_BALCAO = "credito_balcao"
    RECARGA_BOLETO = "recarga_boleto"
    RECARGA_DINHEIRO = "recarga_dinheiro"
    RECARGA_CARTAO = "recarga_cartao"
    DEBITO_PEDIDO = "debito_pedido"
    ESTORNO = "estorno"

class TransacaoCarteira(Base):
    """Ledger Imutável (Event Sourcing) para auditar cada centavo no Ágape."""
    __tablename__ = "agape_transacoes_carteira"

    id = Column(Integer, primary_key=True, index=True)
    carteira_id = Column(Integer, ForeignKey("agape_carteiras_clientes.id"), nullable=False, index=True)
    
    tipo = Column(Enum(TipoTransacaoCarteira), nullable=False)
    valor = Column(Float, nullable=False)
    descricao = Column(String(255), nullable=True)
    referencia_externa = Column(String(100), nullable=True, index=True)
    
    data_transacao = Column(DateTime, default=datetime.utcnow, nullable=False)

    carteira = relationship("CarteiraCliente", back_populates="transacoes")

class CartaoCliente(Base):
    """Cartões Físicos (RFID) ou Identificadores Virtuais vinculados ao consumidor em uma Loja"""
    __tablename__ = "agape_cartoes_clientes"

    id = Column(Integer, primary_key=True, index=True)
    rfid_uuid = Column(String(100), unique=True, nullable=False, index=True)
    
    cliente_id = Column(Integer, ForeignKey("agape_clientes.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    
    ativo = Column(Boolean, default=True)
    data_emissao = Column(DateTime, default=datetime.utcnow)

    cliente = relationship("Cliente", back_populates="cartoes")
    estabelecimento = relationship("Estabelecimento")


class StatusCartaoFisico(str, enum.Enum):
    DISPONIVEL = "disponivel"
    EM_USO = "em_uso"
    EXTRAVIADO = "extraviado"
    BLOQUEADO = "bloqueado"

class TipoCartaoFisico(str, enum.Enum):
    CORINGA_TEMPORARIO = "coringa_temporario"
    PERSONALIZADO_MEMBRO = "personalizado_membro"

class CartaoFisico(Base):
    """Cartão físico reutilizável (Coringa) da Loja para visitantes/convidados ou membros."""
    __tablename__ = "agape_cartoes_fisicos"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    codigo_identificador = Column(String(100), unique=True, nullable=False, index=True) # Ex: "AGAPE-CARD-042"
    
    tipo = Column(Enum(TipoCartaoFisico), default=TipoCartaoFisico.CORINGA_TEMPORARIO, nullable=False)
    status = Column(Enum(StatusCartaoFisico), default=StatusCartaoFisico.DISPONIVEL, nullable=False, index=True)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

    estabelecimento = relationship("Estabelecimento")
    vinculos = relationship("VinculoCartaoCliente", back_populates="cartao", cascade="all, delete-orphan")


class VinculoCartaoCliente(Base):
    """Histórico perpétuo de custódia do cartão no Salão de Ágapes."""
    __tablename__ = "agape_vinculos_cartoes_clientes"

    id = Column(Integer, primary_key=True, index=True)
    cartao_id = Column(Integer, ForeignKey("agape_cartoes_fisicos.id"), nullable=False, index=True)
    cliente_id = Column(Integer, ForeignKey("agape_clientes.id"), nullable=False, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=False, index=True)
    comanda_id = Column(Integer, ForeignKey("agape_comandas.id"), nullable=True, index=True)
    
    data_vinculo = Column(DateTime, default=datetime.utcnow, nullable=False)
    data_desvinculo = Column(DateTime, nullable=True)
    ativo = Column(Boolean, default=True, index=True)
    
    observacao = Column(String(255), nullable=True)

    cartao = relationship("CartaoFisico", back_populates="vinculos")
    cliente = relationship("Cliente", back_populates="vinculos_cartoes")
    estabelecimento = relationship("Estabelecimento")
    comanda = relationship("Comanda")
