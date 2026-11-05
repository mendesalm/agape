from sqlalchemy import Column, Integer, ForeignKey, Enum, DateTime, String, Float
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base

class TipoMovimentacao(str, enum.Enum):
    ENTRADA_COMPRA = "entrada_compra"
    TRANSFERENCIA_GONDOLA = "transferencia_gondola"
    TRANSFERENCIA_ARMAZEM = "transferencia_armazem"
    SAIDA_VENDA = "saida_venda"
    PERDA_QUEBRA = "perda_quebra"
    AJUSTE_INVENTARIO = "ajuste_inventario"

class FormaPagamento(str, enum.Enum):
    PIX = "pix"
    DINHEIRO = "dinheiro"
    CARTAO_DEBITO = "cartao_debito"
    CARTAO_CREDITO = "cartao_credito"
    SALDO_BAR_FIADO = "saldo_bar_fiado"

class TipoPerda(str, enum.Enum):
    QUEBRA = "quebra"
    VENCIMENTO = "vencimento"
    AVARIA_TRANSPORTE = "avaria_transporte"
    DESCARTE_OPERACIONAL = "descarte_operacional"
    OUTRO = "outro"

class MovimentacaoEstoque(Base):
    """
    Registro perpétuo e auditável de cada entrada, saída, transferência e perda de mercadoria.
    Relaciona cliente, operador, forma de pagamento e custos para compliance e conferência com câmeras.
    """
    __tablename__ = "agape_movimentacoes_estoque"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("agape_estabelecimentos.id"), nullable=True, index=True)
    produto_id = Column(Integer, ForeignKey("agape_produtos.id"), nullable=False, index=True)
    lote_id = Column(Integer, ForeignKey("agape_lotes_estoque.id"), nullable=True, index=True)
    
    tipo = Column(Enum(TipoMovimentacao), nullable=False)
    quantidade = Column(Integer, nullable=False)
    local_origem = Column(String(30), nullable=True)
    local_destino = Column(String(30), nullable=True)
    motivo = Column(String(255), nullable=True)
    data_movimentacao = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Campos de Auditoria e Rastreabilidade Integral
    operador_id = Column(Integer, ForeignKey("agape_usuarios.id"), nullable=True, index=True)
    cliente_id = Column(Integer, ForeignKey("agape_clientes.id"), nullable=True, index=True)
    comanda_id = Column(Integer, ForeignKey("agape_comandas.id"), nullable=True, index=True)
    forma_pagamento = Column(String(30), nullable=True, index=True)
    
    # Detalhes de Perda/Quebra
    tipo_perda = Column(String(50), nullable=True)
    justificativa_perda = Column(String(255), nullable=True)
    
    # Valores Financeiros Registrados no Momento da Operação
    preco_custo_unitario = Column(Float, default=0.0)
    preco_venda_unitario = Column(Float, default=0.0)
    custo_total_perda = Column(Float, default=0.0)
    valor_total = Column(Float, default=0.0)

    # Relacionamentos
    produto = relationship("Produto", back_populates="movimentacoes")
    lote = relationship("LoteEstoque", back_populates="movimentacoes")
    estabelecimento = relationship("Estabelecimento")
    operador = relationship("Usuario")
    cliente = relationship("Cliente")
    comanda = relationship("Comanda")
