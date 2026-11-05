import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Wallet, 
  CheckCircle2, 
  X, 
  Coins, 
  ShieldAlert,
  RotateCcw,
  Copy,
  Check,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import type { DadosComprovante } from './ComprovanteTermicoModal';

interface FecharComandaModalProps {
  isOpen: boolean;
  onClose: () => void;
  comandaId: number;
  totalComanda: number;
  clienteId?: number | null;
  clienteNome?: string | null;
  clienteCim?: string | null;
  clienteFoto?: string | null;
  identificadorCartao?: string | null;
  onSuccess: (comprovante: DadosComprovante) => void;
  onAbrirRecarga?: () => void;
}

export function FecharComandaModal({
  isOpen,
  onClose,
  comandaId,
  totalComanda,
  clienteId,
  clienteNome,
  clienteCim,
  clienteFoto,
  identificadorCartao,
  onSuccess,
  onAbrirRecarga
}: FecharComandaModalProps) {
  const [formaPagamento, setFormaPagamento] = useState<string>('pix');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [devolverCartao, setDevolverCartao] = useState<boolean>(true);
  const [saldoBar, setSaldoBar] = useState<number | null>(null);
  const [carregandoSaldo, setCarregandoSaldo] = useState<boolean>(false);
  const [processando, setProcessando] = useState<boolean>(false);
  const [pixCopiado, setPixCopiado] = useState<boolean>(false);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(300); // 5 minutos de timer Pix

  useEffect(() => {
    if (isOpen && clienteId) {
      carregarSaldoCliente();
    } else {
      setSaldoBar(null);
    }
  }, [isOpen, clienteId]);

  // Timer regressivo para o QR Code Pix
  useEffect(() => {
    if (!isOpen || formaPagamento !== 'pix') return;
    setSegundosRestantes(300);
    const interval = setInterval(() => {
      setSegundosRestantes((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, formaPagamento]);

  const carregarSaldoCliente = async () => {
    try {
      setCarregandoSaldo(true);
      const res = await api.get(`/comandas/relatorios/extrato-periodo`, {
        params: {
          cliente_id: clienteId,
          data_inicio: new Date().toISOString(),
          data_fim: new Date().toISOString()
        }
      });
      setSaldoBar(res.data.saldo_atual_bar ?? 0);
    } catch {
      setSaldoBar(0);
    } finally {
      setCarregandoSaldo(false);
    }
  };

  if (!isOpen) return null;

  const vRecebido = parseFloat(valorRecebido) || 0;
  const troco = Math.max(0, vRecebido - totalComanda);

  // Verificação de Limite de Fiado (máximo R$ 100,00 devedor)
  const limiteFiado = 100.0;
  const saldoAtualNum = saldoBar ?? 0;
  const saldoFinalProjetado = saldoAtualNum - totalComanda;
  const fiadoBloqueado = formaPagamento === 'saldo_bar_fiado' && saldoFinalProjetado < -limiteFiado;

  const chavePixFicticia = `00020126580014br.gov.bcb.pix0136agape-loja-${comandaId}@e-sigma.app520400005303986540${totalComanda.toFixed(2)}5802BR5915Agape Bar6009Sao Paulo62070503***6304`;

  const handleCopiarPix = () => {
    navigator.clipboard?.writeText(chavePixFicticia);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2500);
  };

  const formatarTempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  };

  const renderAvatar = () => {
    if (clienteFoto) {
      return (
        <img
          src={clienteFoto}
          alt={clienteNome || 'Irmão'}
          className="w-11 h-11 rounded-xl object-cover border border-[#10B981]/50 shrink-0"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
          }}
        />
      );
    }
    const iniciais = clienteNome
      ? clienteNome
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0].toUpperCase())
          .join('')
      : 'IR';
    return (
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#0B1326] border border-[#10B981]/40 text-[#4EDEA3] flex items-center justify-center font-extrabold text-sm shrink-0 tracking-wider font-mono">
        {iniciais}
      </div>
    );
  };

  const handleConfirmarFechamento = async () => {
    if (formaPagamento === 'dinheiro' && vRecebido > 0 && vRecebido < totalComanda) {
      alert("O valor recebido em dinheiro é inferior ao total da comanda.");
      return;
    }

    if (formaPagamento === 'saldo_bar_fiado') {
      if (!clienteId) {
        alert("Para pagamento via Saldo/Fiado na conta do bar, é obrigatório ter um irmão identificado.");
        return;
      }
      if (fiadoBloqueado) {
        alert(`Venda fiada não autorizada: o saldo devedor passaria para R$ ${Math.abs(saldoFinalProjetado).toFixed(2)}, excedendo o limite de R$ 100,00.`);
        return;
      }
    }

    try {
      setProcessando(true);
      await api.patch(`/comandas/${comandaId}/fechar`, {
        forma_pagamento: formaPagamento,
        valor_recebido: vRecebido > 0 ? vRecebido : totalComanda,
        troco: troco,
        observacao: observacao || undefined,
        cliente_id: clienteId || undefined
      });

      // Devolução e liberação do cartão genérico no mesmo ato
      if (devolverCartao && identificadorCartao) {
        try {
          await api.post('/cartoes/devolver-coringa', {
            codigo_cartao: identificadorCartao.trim(),
            confirmar_pagamento_e_fechamento: false
          });
        } catch (errDevolucao) {
          console.warn("Aviso na liberação do cartão genérico:", errDevolucao);
        }
      }

      const resComp = await api.get(`/comandas/${comandaId}/comprovante-termico`);
      onSuccess(resComp.data);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao fechar a comanda.");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn select-none">
      <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-white flex flex-col max-h-[94vh]">
        
        {/* ============================================================== */}
        {/* CABEÇALHO DO MODAL (Tactile Velocity)                          */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 border-b border-[#334155] bg-[#131B2E] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {renderAvatar()}
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] block font-mono">
                Pagamento & Check-out
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-white truncate leading-tight">
                {clienteNome ? `Ir.'. ${clienteNome}` : "Consumidor no Balcão"}
              </h3>
              {clienteCim && (
                <span className="text-[10px] text-slate-400 font-mono">
                  CIM: {clienteCim}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 border border-[#334155] flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* CORPO DO CHECKOUT COM ROLAGEM SUAVE                            */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          
          {/* Card Total a Receber */}
          <div className="p-4 bg-[#131B2E] border border-[#334155] rounded-2xl flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Valor Total a Receber
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#4EDEA3] font-mono tracking-tight mt-0.5">
                R$ {totalComanda.toFixed(2)}
              </div>
            </div>

            {clienteId && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Saldo Conta Bar</span>
                <span className={`text-sm font-extrabold font-mono ${saldoAtualNum < 0 ? 'text-rose-400' : 'text-[#4EDEA3]'}`}>
                  {carregandoSaldo ? "Consultando..." : `R$ ${saldoAtualNum.toFixed(2)}`}
                </span>
              </div>
            )}
          </div>

          {/* Integração: Devolução e Liberação do Cartão Físico */}
          {identificadorCartao && (
            <div className="p-3.5 bg-[#171F33] border border-[#F59E0B]/40 rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 shrink-0">
                  <RotateCcw size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-[#FFB95F] block truncate">
                    Devolver e Liberar Cartão Físico
                  </span>
                  <p className="text-[11px] text-slate-400 truncate">
                    Cartão <span className="font-mono text-[#F59E0B] font-bold">{identificadorCartao}</span> volta a ficar livre para recepção
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={devolverCartao}
                onChange={e => setDevolverCartao(e.target.checked)}
                className="w-5 h-5 accent-[#10B981] rounded cursor-pointer shrink-0 ml-3"
              />
            </div>
          )}

          {/* SELEÇÃO DAS FORMAS DE PAGAMENTO: 3 TILES SIMÉTRICOS (Padrão Stitch) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 font-mono">
              Forma de Pagamento:
            </label>
            
            <div className="grid grid-cols-3 gap-2">
              
              {/* PIX */}
              <button
                type="button"
                onClick={() => setFormaPagamento('pix')}
                className={`min-h-[58px] p-2 rounded-2xl border font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  formaPagamento === 'pix'
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#4EDEA3] shadow-md ring-1 ring-[#10B981]'
                    : 'bg-[#131B2E] border-[#334155] text-slate-300 hover:bg-[#1E293B]'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs">PIX Direto</span>
              </button>

              {/* CARTÃO */}
              <button
                type="button"
                onClick={() => setFormaPagamento('cartao_debito')}
                className={`min-h-[58px] p-2 rounded-2xl border font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  formaPagamento === 'cartao_debito' || formaPagamento === 'cartao_credito'
                    ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#7BD0FF] shadow-md ring-1 ring-[#38BDF8]'
                    : 'bg-[#131B2E] border-[#334155] text-slate-300 hover:bg-[#1E293B]'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs">Cartão / POS</span>
              </button>

              {/* DINHEIRO */}
              <button
                type="button"
                onClick={() => setFormaPagamento('dinheiro')}
                className={`min-h-[58px] p-2 rounded-2xl border font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  formaPagamento === 'dinheiro'
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#FFB95F] shadow-md ring-1 ring-[#F59E0B]'
                    : 'bg-[#131B2E] border-[#334155] text-slate-300 hover:bg-[#1E293B]'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                <span className="text-xs">Dinheiro</span>
              </button>

            </div>

            {/* Opção Complementar: Débito na Conta do Bar / Fiado com Teto */}
            {clienteId && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setFormaPagamento('saldo_bar_fiado')}
                  className={`w-full min-h-[46px] px-3 py-2 rounded-xl border font-bold flex items-center justify-between text-xs transition-all cursor-pointer ${
                    formaPagamento === 'saldo_bar_fiado'
                      ? fiadoBloqueado 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                        : 'bg-[#10B981]/20 border-[#10B981] text-[#4EDEA3] shadow-md ring-1 ring-[#10B981]'
                      : 'bg-[#131B2E] border-[#334155] text-slate-400 hover:bg-[#1E293B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wallet size={16} />
                    <span>Lançar na Conta do Bar (Pós-pago)</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#F59E0B]">Teto Máx: R$ 100,00</span>
                </button>
              </div>
            )}
          </div>

          {/* PAINEL DINÂMICO PIX (Padrão Stitch) */}
          {formaPagamento === 'pix' && (
            <div className="p-4 bg-[#131B2E] border border-[#334155] rounded-2xl space-y-3 text-center animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-[#4EDEA3] font-bold">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                  Aguardando Pagamento
                </span>
                <span className="flex items-center gap-1 text-[#F59E0B]">
                  <Clock size={14} /> {formatarTempo(segundosRestantes)}
                </span>
              </div>

              {/* QR Code Container em Alto Contraste (Fundo Branco Puro) */}
              <div className="p-3 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(chavePixFicticia)}`}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Aponte a câmera do aplicativo bancário ou copie a chave abaixo:
              </p>

              <button
                type="button"
                onClick={handleCopiarPix}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {pixCopiado ? <Check size={16} className="text-[#4EDEA3]" /> : <Copy size={16} />}
                <span>{pixCopiado ? "Chave Pix Copiada!" : "Copiar Chave Copia e Cola"}</span>
              </button>
            </div>
          )}

          {/* Painel Dinheiro com Troco */}
          {formaPagamento === 'dinheiro' && (
            <div className="p-3.5 bg-[#131B2E] border border-[#334155] rounded-2xl space-y-2 animate-fadeIn">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5 font-mono">
                  <Coins className="w-4 h-4 text-[#F59E0B]" /> Valor Entregue:
                </span>
                {troco > 0 && (
                  <span className="font-extrabold text-[#4EDEA3] bg-[#10B981]/15 px-2 py-0.5 rounded-lg border border-[#10B981]/30 font-mono">
                    Troco: R$ {troco.toFixed(2)}
                  </span>
                )}
              </div>
              <input 
                type="number"
                step="0.50"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                placeholder={`Ex: ${(Math.ceil(totalComanda / 10) * 10).toFixed(2)}`}
                className="w-full bg-[#0B1326] border border-[#334155] rounded-xl px-4 py-2.5 text-base font-extrabold text-white outline-none focus:border-[#10B981] min-h-[48px] font-mono"
              />
            </div>
          )}

          {/* Alerta de Fiado Bloqueado */}
          {formaPagamento === 'saldo_bar_fiado' && fiadoBloqueado && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-500/50 rounded-2xl text-xs space-y-1.5 text-rose-200 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <ShieldAlert size={18} />
                <span>Limite Devedor Ultrapassado (Regra R$ 100,00)</span>
              </div>
              <p className="text-[11px] text-slate-300">
                O saldo pós-compra seria de -R$ {Math.abs(saldoFinalProjetado).toFixed(2)}. Selecione Pix, Dinheiro ou Cartão.
              </p>
              {onAbrirRecarga && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onAbrirRecarga}
                    className="text-xs font-bold text-[#F59E0B] hover:underline cursor-pointer"
                  >
                    + Fazer Recarga de Saldo no Bar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Observação Opcional */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
              Observação (Opcional):
            </label>
            <input 
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pago pelo Ir. Primeiro Vigilante"
              className="w-full bg-[#131B2E] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-[#10B981] min-h-[42px]"
            />
          </div>

        </div>

        {/* ============================================================== */}
        {/* RODAPÉ DO MODAL: BOTÃO DE AÇÃO PRIMÁRIA                       */}
        {/* ============================================================== */}
        <div className="p-4 sm:p-5 border-t border-[#334155] bg-[#131B2E] flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 text-slate-400 hover:text-white rounded-xl text-xs font-bold hover:bg-[#1E293B] transition-colors cursor-pointer"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleConfirmarFechamento}
            disabled={processando || fiadoBloqueado}
            className={`w-full sm:w-auto min-h-[50px] px-6 py-3 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98 cursor-pointer ${
              fiadoBloqueado
                ? 'bg-[#1E293B] text-slate-500 cursor-not-allowed border border-[#334155]'
                : 'bg-[#10B981] hover:bg-[#059669] text-[#0B1326]'
            }`}
          >
            <CheckCircle2 size={18} />
            <span>{processando ? "Efetivando Venda..." : "Efetivar Pagamento & Emitir Cupom"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
