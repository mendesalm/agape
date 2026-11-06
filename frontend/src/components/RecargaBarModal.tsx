import { useState, type FormEvent } from 'react';
import { Wallet, QrCode, DollarSign, CreditCard, X, Check } from 'lucide-react';
import { api } from '../services/api';

interface RecargaBarModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  clienteNome: string;
  saldoAtual?: number;
  onSuccess: (novoSaldo: number) => void;
}

export function RecargaBarModal({
  isOpen,
  onClose,
  clienteId,
  clienteNome,
  saldoAtual = 0,
  onSuccess
}: RecargaBarModalProps) {
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'dinheiro' | 'cartao_debito' | 'cartao_credito' | 'cartao' | 'boleto'>('pix');
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) {
      alert("Informe um valor válido maior que zero.");
      return;
    }

    try {
      setSalvando(true);
      const res = await api.post('/comandas/carteira/recarga', {
        cliente_id: clienteId,
        valor: v,
        forma_pagamento: formaPagamento,
        observacao: observacao || undefined
      });
      alert(res.data.mensagem || "Crédito adicionado com sucesso!");
      onSuccess(res.data.saldo_atual);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao efetuar recarga.");
    } finally {
      setSalvando(false);
    }
  };

  const valoresRapidos = [20, 50, 100, 150];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
        
        {/* Topo do Modal */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">
                Inserir Créditos na Conta do Bar
              </h3>
              <p className="text-xs text-slate-400">
                Caixa do Ágape 100% isolado da Loja
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Card do Cliente e Saldo Atual */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-400">Obreiro/Cliente:</span>
              <p className="font-bold text-slate-200 text-sm">{clienteNome}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400">Saldo Atual no Bar:</span>
              <p className={`font-extrabold text-sm ${saldoAtual < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                R$ {saldoAtual.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Formas de Pagamento (Ergonomia: botões com min-h-[44px]) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Forma de Entrada no Caixa do Bar
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setFormaPagamento('pix')}
                className={`min-h-[46px] p-2.5 rounded-xl border font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  formaPagamento === 'pix'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-400" /> Pix do Bar
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento('dinheiro')}
                className={`min-h-[46px] p-2.5 rounded-xl border font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  formaPagamento === 'dinheiro'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4 text-amber-400" /> Dinheiro Físico
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento('cartao_debito')}
                className={`min-h-[46px] p-2.5 rounded-xl border font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  formaPagamento === 'cartao_debito'
                    ? 'bg-[#0284C7]/20 border-[#38BDF8] text-[#7BD0FF] shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#38BDF8]" /> Cartão Débito
              </button>

              <button
                type="button"
                onClick={() => setFormaPagamento('cartao_credito')}
                className={`min-h-[46px] p-2.5 rounded-xl border font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  formaPagamento === 'cartao_credito'
                    ? 'bg-[#6366F1]/20 border-[#818CF8] text-[#A5B4FC] shadow-sm'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#818CF8]" /> Cartão Crédito
              </button>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Valor a Creditar (R$)
            </label>
            <input 
              type="number"
              step="0.50"
              min="1"
              required
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-bold text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500 min-h-[48px]"
            />

            {/* Atalhos Rápidos de Valor */}
            <div className="flex gap-2 mt-2">
              {valoresRapidos.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setValor(v.toString())}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-all min-h-[36px]"
                >
                  + R$ {v}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observação / Comprovante (Opcional)
            </label>
            <input 
              type="text"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Quitação de consumação do mês"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 min-h-[40px]"
            />
          </div>

          {/* Rodapé e Botões Ergonômicos (min-h-[48px]) */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] px-4 py-2.5 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="min-h-[48px] px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition-all"
            >
              <Check className="w-4 h-4" />
              {salvando ? "Processando..." : "Confirmar Recarga"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
