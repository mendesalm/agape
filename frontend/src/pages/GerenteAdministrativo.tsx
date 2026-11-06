import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft,
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  QrCode, 
  Coins, 
  Wallet, 
  Users, 
  FileText, 
  Copy, 
  Check, 
  RefreshCw,
  Building2,
  Lock,
  ShieldAlert,
  ArrowRight,
  Receipt
} from 'lucide-react';

interface ResumoFinanceiro {
  faturamento: number;
  despesas: number;
  prejuizo_quebras: number;
  lucro_bruto: number;
  total_comandas_fechadas: number;
  ticket_medio: number;
  receitas_por_forma_pagamento?: {
    pix: number;
    cartao_debito: number;
    cartao_credito: number;
    dinheiro: number;
    saldo_bar_fiado: number;
  };
  inadimplencia_total?: number;
  devedores?: Array<{
    nome: string;
    cim?: string;
    telefone?: string;
    saldo_devedor: number;
  }>;
}

export const GerenteAdministrativo: React.FC = () => {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'VISAO_GERAL' | 'DEVEDORES' | 'FECHAMENTO'>('VISAO_GERAL');
  const [pixCopiadoIdx, setPixCopiadoIdx] = useState<number | null>(null);
  const [gavetaDinheiroInput, setGavetaDinheiroInput] = useState<string>('');
  const [fechamentoConcluido, setFechamentoConcluido] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const respResumo = await api.get('/financeiro/resumo').catch(() => ({ data: null }));
      setResumo(respResumo.data);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarCobrancaPix = (nome: string, valor: number, idx: number) => {
    const chavePix = `00020126580014br.gov.bcb.pix0136bar-agape@e-sigma.app520400005303986540${valor.toFixed(2)}5802BR5915Agape Bar6009Sao Paulo62070503***6304`;
    const mensagem = `Ir.'. ${nome}, segue a chave Pix para liquidação do consumo no Bar do Ágape no valor de R$ ${valor.toFixed(2)}:\n\n${chavePix}`;
    navigator.clipboard?.writeText(mensagem);
    setPixCopiadoIdx(idx);
    setTimeout(() => setPixCopiadoIdx(null), 2500);
  };

  const handleSimularFechamentoCaixa = () => {
    setFechamentoConcluido(true);
    setTimeout(() => setFechamentoConcluido(false), 5000);
  };

  const formatBrl = (val: number) => `R$ ${val.toFixed(2)}`;

  const formas = resumo?.receitas_por_forma_pagamento || {
    pix: 0,
    cartao_debito: 0,
    cartao_credito: 0,
    dinheiro: 0,
    saldo_bar_fiado: 0
  };

  const totalEmEspecie = formas.dinheiro;
  const diferencaGaveta = (parseFloat(gavetaDinheiroInput) || 0) - totalEmEspecie;

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 select-none animate-fadeIn p-2 sm:p-4">
      
      {/* ============================================================== */}
      {/* BARRA SUPERIOR BIDIRECIONAL & BREADCRUMBS                      */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/gerencia')}
            className="p-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold font-mono"
            title="Voltar ao Painel da Gerência"
          >
            <ArrowLeft size={16} />
            <span>Voltar para Gerência</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Hub</span>
            <span>/</span>
            <span>Gerência</span>
            <span>/</span>
            <span className="text-[#DDB96B] font-bold">Administrativo</span>
          </div>
        </div>

        <button
          onClick={carregarDados}
          className="p-2 px-3 rounded-xl bg-[#131B2E] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TÍTULO E APRESENTAÇÃO                                          */}
      {/* ============================================================== */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#DDB96B] px-2.5 py-0.5 rounded-md bg-[#DDB96B]/15 border border-[#DDB96B]/30">
            Módulo Administrativo
          </span>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Building2 size={13} className="text-[#38BDF8]" />
            Controladoria & Prestação de Contas
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white font-cinzel mt-1">
          Dashboard Geral & Gestão Administrativa
        </h1>
        <p className="text-xs sm:text-sm text-slate-300">
          Visão consolidada do fluxo de caixa do Bar, conciliação e acesso à auditoria oficial.
        </p>
      </div>

      {/* ============================================================== */}
      {/* WIDGETS DE ATALHO RÁPIDO: AUDITORIA E RELATÓRIOS               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* WIDGET AUDITORIA */}
        <div 
          onClick={() => navigate('/app/auditoria')}
          className="p-5 rounded-2xl bg-[#0B1326] border border-[#10B981]/30 hover:border-[#10B981] hover:bg-[#101A33] transition-all cursor-pointer flex items-center justify-between group shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#4EDEA3] group-hover:scale-105 transition-transform">
              <ShieldAlert size={24} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4EDEA3] block">
                Trilha de Segurança
              </span>
              <h3 className="text-base font-bold text-white">
                Área de Auditoria & Logs
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rastreamento completo de cancelamentos, estornos e acessos.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-[#10B981] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
            <ArrowRight size={16} />
          </div>
        </div>

        {/* WIDGET RELATÓRIOS ADMINISTRATIVOS */}
        <div 
          onClick={() => setAbaAtiva('DEVEDORES')}
          className="p-5 rounded-2xl bg-[#0B1326] border border-[#DDB96B]/30 hover:border-[#DDB96B] hover:bg-[#101A33] transition-all cursor-pointer flex items-center justify-between group shadow-lg"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#DDB96B]/20 border border-[#DDB96B]/40 flex items-center justify-center text-[#FDE68A] group-hover:scale-105 transition-transform">
              <FileText size={24} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#DDB96B] block">
                Contas & Inadimplência
              </span>
              <h3 className="text-base font-bold text-white">
                Relatórios Financeiros & Devedores
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Listagem nominal de consumos a receber e cobrança via Pix.
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-[#DDB96B] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
            <ArrowRight size={16} />
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* NAVEGAÇÃO ENTRE ABAS DO DASHBOARD                              */}
      {/* ============================================================== */}
      <div className="flex gap-2 border-b border-[#334155] pb-2 text-xs font-mono font-bold">
        <button
          onClick={() => setAbaAtiva('VISAO_GERAL')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            abaAtiva === 'VISAO_GERAL'
              ? 'bg-[#10B981]/20 text-[#4EDEA3] border border-[#10B981]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp size={15} />
          <span>Visão Geral & Faturamento</span>
        </button>

        <button
          onClick={() => setAbaAtiva('DEVEDORES')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            abaAtiva === 'DEVEDORES'
              ? 'bg-[#DDB96B]/20 text-[#FDE68A] border border-[#DDB96B]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users size={15} />
          <span>Devedores / Fiado do Bar</span>
          {(resumo?.devedores?.length || 0) > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 text-[10px]">
              {resumo?.devedores?.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAbaAtiva('FECHAMENTO')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
            abaAtiva === 'FECHAMENTO'
              ? 'bg-[#38BDF8]/20 text-[#7BD0FF] border border-[#38BDF8]'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Lock size={15} />
          <span>Fechamento de Caixa</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: VISÃO GERAL & FORMAS DE PAGAMENTO                       */}
      {/* ============================================================== */}
      {abaAtiva === 'VISAO_GERAL' && (
        <div className="space-y-6">
          {/* CARDS DE KPIS PRINCIPAIS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0B1326] border border-[#10B981]/30 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4EDEA3] flex items-center gap-1.5">
                <DollarSign size={14} /> Faturamento Bruto
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                {formatBrl(resumo?.faturamento || 0)}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Total de vendas registradas</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1326] border border-[#38BDF8]/30 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7BD0FF] flex items-center gap-1.5">
                <Receipt size={14} /> Comandas Fechadas
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                {resumo?.total_comandas_fechadas || 0}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Ticket Médio: {formatBrl(resumo?.ticket_medio || 0)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1326] border border-[#DDB96B]/30 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FDE68A] flex items-center gap-1.5">
                <TrendingUp size={14} /> Lucro Bruto Estimado
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                {formatBrl(resumo?.lucro_bruto || 0)}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Margem sobre custo</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1326] border border-rose-500/30 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Users size={14} /> Inadimplência / Fiado
              </span>
              <p className="text-xl sm:text-2xl font-black text-rose-300 font-mono">
                {formatBrl(resumo?.inadimplencia_total || 0)}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">A receber de irmãos</span>
            </div>
          </div>

          {/* DISCRIMINAÇÃO DAS FORMAS DE PAGAMENTO */}
          <div className="p-5 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-4 shadow-xl">
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300">
              Discriminação de Receitas por Meio de Pagamento
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* PIX */}
              <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#10B981]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4EDEA3]">
                  <QrCode size={15} />
                  <span>PIX Direto</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {formatBrl(formas.pix)}
                </div>
              </div>

              {/* DÉBITO */}
              <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#38BDF8]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#7BD0FF]">
                  <CreditCard size={15} />
                  <span>Cartão Débito</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {formatBrl(formas.cartao_debito)}
                </div>
              </div>

              {/* CRÉDITO */}
              <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#818CF8]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#A5B4FC]">
                  <CreditCard size={15} />
                  <span>Cartão Crédito</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {formatBrl(formas.cartao_credito)}
                </div>
              </div>

              {/* DINHEIRO */}
              <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#F59E0B]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFB95F]">
                  <Coins size={15} />
                  <span>Dinheiro Físico</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {formatBrl(formas.dinheiro)}
                </div>
              </div>

              {/* SALDO BAR */}
              <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#DDB96B]/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#FDE68A]">
                  <Wallet size={15} />
                  <span>Saldo / Fiado</span>
                </div>
                <div className="text-lg font-black text-white font-mono">
                  {formatBrl(formas.saldo_bar_fiado)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: RELATÓRIO DE DEVEDORES / FIADO                          */}
      {/* ============================================================== */}
      {abaAtiva === 'DEVEDORES' && (
        <div className="p-5 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-cinzel">
                Contas a Receber (Fiado Acumulado)
              </h3>
              <p className="text-xs text-slate-400">
                Irmãos e visitantes com saldo devedor na conta do Bar (limite máximo de R$ 100,00).
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-rose-400 bg-rose-500/10 px-3 py-1 rounded-xl border border-rose-500/20">
              Total a Receber: {formatBrl(resumo?.inadimplencia_total || 0)}
            </span>
          </div>

          <div className="space-y-2 pt-2">
            {(resumo?.devedores || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                Nenhum saldo devedor pendente. Todas as contas do bar estão liquidadas!
              </div>
            ) : (
              (resumo?.devedores || []).map((dev, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#131B2E] border border-slate-800 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-white text-sm block">{dev.nome}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {dev.cim ? `CIM: ${dev.cim}` : 'Visitante'} {dev.telefone ? `• ${dev.telefone}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-rose-400 text-sm">
                      {formatBrl(Math.abs(dev.saldo_devedor))}
                    </span>
                    <button
                      onClick={() => handleCopiarCobrancaPix(dev.nome, Math.abs(dev.saldo_devedor), idx)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center gap-1 font-mono transition-all cursor-pointer"
                    >
                      {pixCopiadoIdx === idx ? <Check size={14} className="text-[#4EDEA3]" /> : <Copy size={14} />}
                      <span>{pixCopiadoIdx === idx ? 'Chave Copiada!' : 'Cobrar Pix'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: FECHAMENTO DE CAIXA DA SESSÃO                           */}
      {/* ============================================================== */}
      {abaAtiva === 'FECHAMENTO' && (
        <div className="p-6 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-5 shadow-xl max-w-xl mx-auto">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-white font-cinzel">
              Fechamento & Conferência de Gaveta
            </h3>
            <p className="text-xs text-slate-400">
              Insira o total em cédulas físicas contadas na gaveta do caixa.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#131B2E] border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Registrado em Dinheiro:</span>
                <span className="font-bold text-white">{formatBrl(totalEmEspecie)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Registrado em Pix/Cartões:</span>
                <span className="font-bold text-[#4EDEA3]">{formatBrl(formas.pix + formas.cartao_debito + formas.cartao_credito)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 font-mono">
                Valor Físico Encontrado na Gaveta:
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="0.50"
                  value={gavetaDinheiroInput}
                  onChange={(e) => setGavetaDinheiroInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070F1E] border border-slate-700 text-white font-mono text-base outline-none focus:border-[#10B981]"
                />
              </div>
            </div>

            {gavetaDinheiroInput && (
              <div className={`p-3 rounded-xl border text-xs font-mono flex justify-between items-center ${
                diferencaGaveta === 0 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300' 
                  : diferencaGaveta > 0 
                    ? 'bg-blue-950/40 border-blue-500/50 text-blue-300' 
                    : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
              }`}>
                <span>Diferença de Caixa:</span>
                <span className="font-black text-sm">
                  {diferencaGaveta > 0 ? `+ ${formatBrl(diferencaGaveta)} (Sobra)` : diferencaGaveta < 0 ? `- ${formatBrl(Math.abs(diferencaGaveta))} (Falta)` : 'Caixa Exato (R$ 0,00)'}
                </span>
              </div>
            )}

            <button
              onClick={handleSimularFechamentoCaixa}
              className="w-full py-3.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-bold text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
            >
              <Check size={18} />
              <span>Concluir e Lacrar Caixa da Sessão</span>
            </button>

            {fechamentoConcluido && (
              <div className="p-3 bg-emerald-900/60 border border-emerald-500 rounded-xl text-center text-xs text-emerald-200 font-mono animate-fadeIn">
                ✓ Caixa fechado e auditado com sucesso! Relatório gerado.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
