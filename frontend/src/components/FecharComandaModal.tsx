import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Wallet, 
  CheckCircle2, 
  X, 
  Receipt, 
  Coins, 
  PlusCircle, 
  ShieldAlert 
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
  onSuccess,
  onAbrirRecarga
}: FecharComandaModalProps) {
  const [formaPagamento, setFormaPagamento] = useState<string>('pix');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  const [observacao, setObservacao] = useState<string>('');
  const [saldoBar, setSaldoBar] = useState<number | null>(null);
  const [carregandoSaldo, setCarregandoSaldo] = useState<boolean>(false);
  const [processando, setProcessando] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && clienteId) {
      carregarSaldoCliente();
    } else {
      setSaldoBar(null);
    }
  }, [isOpen, clienteId]);

  const carregarSaldoCliente = async () => {
    try {
      setCarregandoSaldo(true);
      // Busca saldo do cliente na carteira do Bar
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

  // Cálculo de troco para dinheiro
  const vRecebido = parseFloat(valorRecebido) || 0;
  const troco = Math.max(0, vRecebido - totalComanda);

  // Verificação de Limite de Fiado (máximo R$ 100,00 devedor)
  const limiteFiado = 100.0;
  const saldoAtualNum = saldoBar ?? 0;
  const saldoFinalProjetado = saldoAtualNum - totalComanda;
  const fiadoBloqueado = formaPagamento === 'saldo_bar_fiado' && saldoFinalProjetado < -limiteFiado;

  const handleConfirmarFechamento = async () => {
    if (formaPagamento === 'dinheiro' && vRecebido > 0 && vRecebido < totalComanda) {
      alert("O valor recebido em dinheiro é inferior ao total da comanda.");
      return;
    }

    if (formaPagamento === 'saldo_bar_fiado') {
      if (!clienteId) {
        alert("Para pagamento via Saldo/Fiado na conta do bar, é obrigatório ter um irmão/cliente identificado.");
        return;
      }
      if (fiadoBloqueado) {
        alert(`Venda fiada não autorizada: o saldo devedor passaria para R$ ${Math.abs(saldoFinalProjetado).toFixed(2)}, excedendo o limite de R$ 100,00. O irmão deve fazer uma recarga na conta do bar ou pagar por Pix/Dinheiro/Cartão.`);
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

      // Busca o comprovante térmico pronto para impressão
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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        
        {/* Topo do Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-amber-300">
                Encerrar Comanda #{comandaId}
              </h3>
              <p className="text-xs text-slate-400">
                Caixa do Bar Isolado da Loja • Emissão de Comprovante Térmico
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Card Resumo do Total */}
          <div className="p-4 bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total da Fatura</span>
              <div className="text-3xl font-black text-amber-400 mt-0.5">
                R$ {totalComanda.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Cliente / Obreiro:</span>
              <p className="font-bold text-slate-200 text-sm truncate max-w-[180px]">
                {clienteNome || "Cliente no Balcão"}
              </p>
              {clienteId && (
                <div className="mt-1">
                  <span className="text-[11px] text-slate-400">Saldo Bar: </span>
                  <span className={`text-xs font-extrabold ${saldoAtualNum < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {carregandoSaldo ? "Consultando..." : `R$ ${saldoAtualNum.toFixed(2)}`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Seleção da Forma de Pagamento (Ergonomia: botões com min-h-[50px] e alvos generosos) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Selecione a Forma de Pagamento:
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              
              {/* PIX */}
              <button
                type="button"
                onClick={() => setFormaPagamento('pix')}
                className={`min-h-[50px] p-3 rounded-xl border font-bold flex items-center gap-3 transition-all ${
                  formaPagamento === 'pix'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm">PIX do Bar</div>
                  <span className="text-[10px] text-slate-400">QR Code / Chave Bar</span>
                </div>
              </button>

              {/* DINHEIRO */}
              <button
                type="button"
                onClick={() => setFormaPagamento('dinheiro')}
                className={`min-h-[50px] p-3 rounded-xl border font-bold flex items-center gap-3 transition-all ${
                  formaPagamento === 'dinheiro'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md ring-1 ring-amber-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Dinheiro em Espécie</div>
                  <span className="text-[10px] text-slate-400">Calcula troco exato</span>
                </div>
              </button>

              {/* CARTÃO DÉBITO */}
              <button
                type="button"
                onClick={() => setFormaPagamento('cartao_debito')}
                className={`min-h-[50px] p-3 rounded-xl border font-bold flex items-center gap-3 transition-all ${
                  formaPagamento === 'cartao_debito'
                    ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-md ring-1 ring-blue-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Cartão de Débito</div>
                  <span className="text-[10px] text-slate-400">Maquininha do Bar</span>
                </div>
              </button>

              {/* CARTÃO CRÉDITO */}
              <button
                type="button"
                onClick={() => setFormaPagamento('cartao_credito')}
                className={`min-h-[50px] p-3 rounded-xl border font-bold flex items-center gap-3 transition-all ${
                  formaPagamento === 'cartao_credito'
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-md ring-1 ring-indigo-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm">Cartão de Crédito</div>
                  <span className="text-[10px] text-slate-400">Maquininha do Bar</span>
                </div>
              </button>

              {/* SALDO / FIADO NA CONTA DO BAR */}
              <button
                type="button"
                onClick={() => setFormaPagamento('saldo_bar_fiado')}
                className={`min-h-[50px] p-3 rounded-xl border font-bold flex items-center gap-3 transition-all sm:col-span-2 ${
                  formaPagamento === 'saldo_bar_fiado'
                    ? fiadoBloqueado 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                      : 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md ring-1 ring-purple-500'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="text-left flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Saldo / Fiado Conta do Bar</span>
                    <span className="text-[11px] font-bold text-amber-400">Teto Máx Fiado: R$ 100,00</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Débito direto na conta do irmão no Bar (isolada da Loja)
                  </span>
                </div>
              </button>

            </div>
          </div>

          {/* Seletor de Dinheiro com Cálculo de Troco */}
          {formaPagamento === 'dinheiro' && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" /> Valor Entregue pelo Cliente:
                </span>
                {troco > 0 && (
                  <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    Troco a Devolver: R$ {troco.toFixed(2)}
                  </span>
                )}
              </div>
              <input 
                type="number"
                step="0.50"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(e.target.value)}
                placeholder={`Ex: ${(Math.ceil(totalComanda / 10) * 10).toFixed(2)}`}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 min-h-[46px]"
              />
            </div>
          )}

          {/* Alerta de Bloqueio de Fiado se Ultrapassar R$ 100,00 */}
          {formaPagamento === 'saldo_bar_fiado' && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              fiadoBloqueado 
                ? 'bg-rose-950/70 border-rose-500/60 text-rose-200' 
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-start gap-2.5">
                {fiadoBloqueado ? (
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-bold text-sm">
                    {fiadoBloqueado ? "COMPRA FIADA BLOQUEADA (REGRA DE SEGURANÇA)" : "Simulação do Saldo do Bar"}
                  </h4>
                  <p className="text-[11px] mt-0.5 text-slate-400">
                    Saldo atual: <strong>R$ {saldoAtualNum.toFixed(2)}</strong> • Total da compra: <strong>R$ {totalComanda.toFixed(2)}</strong>
                  </p>
                  <p className={`text-xs font-bold mt-1 ${fiadoBloqueado ? 'text-rose-300' : 'text-slate-300'}`}>
                    Saldo devedor resultante: R$ {saldoFinalProjetado < 0 ? Math.abs(saldoFinalProjetado).toFixed(2) : '0,00'}
                  </p>
                </div>
              </div>

              {fiadoBloqueado ? (
                <div className="pt-2 border-t border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <span className="text-[11px] text-rose-300">
                    Débito excede o limite de R$ 100,00!
                  </span>
                  {onAbrirRecarga && (
                    <button
                      type="button"
                      onClick={onAbrirRecarga}
                      className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 min-h-[38px] transition-all"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Inserir Crédito na Conta
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-slate-500">
                  O valor será registrado no extrato do obreiro na conta exclusiva do Bar.
                </div>
              )}
            </div>
          )}

          {/* Observação Opcional */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observação da Operação (Opcional)
            </label>
            <input 
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Pago no balcão pelo Ir. Primeiro Vigilante"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 min-h-[40px]"
            />
          </div>

        </div>

        {/* Rodapé e Botões de Ação Ergonômicos (min-h-[48px]) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleConfirmarFechamento}
            disabled={processando || fiadoBloqueado}
            className={`w-full sm:w-auto min-h-[48px] px-6 py-3 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all ${
              fiadoBloqueado
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{processando ? "Fechando Conta..." : "Confirmar & Emitir Térmica"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
