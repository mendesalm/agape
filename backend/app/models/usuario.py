from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Usuario(Base):
    """
    Usuários e Operadores do e-Sigma Ágape (agape.e-sigma.app).
    Isolado da tabela 'obreiros' para permitir que Não Maçons (familiares ou garçons contratados)
    operem o balcão/estoque sem jamais ter acesso aos dados maçônicos da Loja.
    """
    __tablename__ = "agape_usuarios"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=True, index=True)
    
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    cpf = Column(String(20), nullable=True, index=True)
    telefone = Column(String(30), nullable=True)
    senha_hash = Column(String(255), nullable=False)
    ativo = Column(Boolean, default=True)

    # Cargos:
    # - 'SUPERADMIN' (Gestor Global e-Sigma Ágape)
    # - 'WEBMASTER' (Mestre de Banquetes / Tesoureiro / Venerável da Loja)
    # - 'OPERADOR_BALCAO' (Atendente não maçom ou familiar no balcão/caixa)
    # - 'GARCOM' (Atendente restrito a lançamento de pedidos e reposição)
    cargo = Column(String(50), nullable=False, default="OPERADOR_BALCAO")

    # Tipo de vínculo com a Loja:
    # - 'FAMILIAR_LOJA' (Cunhada, Sobrinho, Lowton vinculado a um Irmão do Quadro)
    # - 'CONTRATADO_EXTERNO' (Garçom / Barman / Ecônomo terceirizado não maçom)
    # - 'OFICIAL_LOJA' (Irmão responsável pelo Ágape / Tesouraria)
    # - 'SISTEMA'
    tipo_vinculo = Column(String(40), nullable=False, default="CONTRATADO_EXTERNO")
    familiar_esigma_id = Column(Integer, nullable=True, index=True)      # Referência opcional a familiares.id no lojas_db
    obreiro_responsavel_id = Column(Integer, nullable=True, index=True)  # Referência opcional a obreiros.id no lojas_db

    # Relacionamentos
    estabelecimento = relationship("Estabelecimento")
