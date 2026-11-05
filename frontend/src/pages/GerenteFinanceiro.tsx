import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
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
  Calendar,
  Lock
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

interface Transacao {
  id: number;
  tipo: 'receita' | 'despesa';
  valor: number;
  descricao: string;
  data_transacao: string;
}

export function GerenteFinanceiro() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
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
      const [respResumo, respTransacoes] = await Promise.all([
        api.get('/financeiro/resumo'),
        api.get('/financeiro/transacoes')
      ]);
      setResumo(respResumo.data);
      setTransacoes(respTransacoes.data);
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

  if (loading) {
    return (
      <div className="p-12 text-center text-[#4EDEA3] font-mono animate-pulse space-y-3">
        <div className="w-10 h-10 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm">Carregando controladoria financeira do Bar...</p>
      </div>
    );
  }

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
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 select-none animate-fadeIn">
      
      {/* ============================================================== */}
      {/* CABEÇALHO DO NÍVEL GERENTE (Tactile Velocity)                  */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] px-2.5 py-0.5 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 font-mono">
              Nível Gerente
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Building2 size={13} className="text-[#38BDF8]" />
              Controladoria & Fluxo de Caixa
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
            Gestão Financeira do Salão de Ágapes
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Caixa isolado da oficina, conciliação de pagamentos e contas a receber.
          </p>
        </div>

        <button
          onClick={carregarDados}
          className="min-h-[44px] px-4 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={15} />
          <span>Atualizar Métricas</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 4 CARDS DE KPIS EM GRID SIMÉTRICO (Tactile Velocity)           */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: Faturamento Total */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131B2E] border border-[#334155] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Faturamento Bruto
            </span>
            <div className="p-2 rounded-xl bg-[#10B981]/15 text-[#4EDEA3] border border-[#10B981]/30">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#4EDEA3] font-mono tracking-tight mt-2">
            {formatBrl(resumo?.faturamento || 0)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            {resumo?.total_comandas_fechadas || 0} comandas liquidadas
          </p>
        </div>

        {/* KPI 2: Lucro Líquido Real */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131B2E] border border-[#334155] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Resultado Líquido Bar
            </span>
            <div className="p-2 rounded-xl bg-[#38BDF8]/15 text-[#7BD0FF] border border-[#38BDF8]/30">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#38BDF8] font-mono tracking-tight mt-2">
            {formatBrl(resumo?.lucro_bruto || 0)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Deduzindo despesas e perdas
          </p>
        </div>

        {/* KPI 3: Inadimplência / Contas a Receber */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131B2E] border border-[#334155] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Contas a Receber (Fiado)
            </span>
            <div className="p-2 rounded-xl bg-[#F59E0B]/15 text-[#FFB95F] border border-[#F59E0B]/30">
              <Wallet size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#F59E0B] font-mono tracking-tight mt-2">
            {formatBrl(resumo?.inadimplencia_total || 0)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            {resumo?.devedores?.length || 0} irmãos com saldo pendente
          </p>
        </div>

        {/* KPI 4: Ticket Médio */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#131B2E] border border-[#334155] shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
              Ticket Médio
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight mt-2">
            {formatBrl(resumo?.ticket_medio || 0)}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">
            Média por obreiro atendido
          </p>
        </div>

      </div>

      {/* ============================================================== */}
      {/* DISCRIMINAÇÃO POR FORMA DE PAGAMENTO (5 TILES SIMÉTRICOS)      */}
      {/* ============================================================== */}
      <div className="p-5 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-3.5 shadow-xl">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono block">
          Arrecadação Consolidada por Forma de Pagamento
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* PIX */}
          <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#10B981]/30 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#4EDEA3]">
              <QrCode size={16} />
              <span>PIX Direto</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {formatBrl(formas.pix)}
            </div>
          </div>

          {/* DÉBITO */}
          <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#38BDF8]/30 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#7BD0FF]">
              <CreditCard size={16} />
              <span>Cartão Débito</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {formatBrl(formas.cartao_debito)}
            </div>
          </div>

          {/* CRÉDITO */}
          <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#38BDF8]/30 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#7BD0FF]">
              <CreditCard size={16} />
              <span>Cartão Crédito</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {formatBrl(formas.cartao_credito)}
            </div>
          </div>

          {/* DINHEIRO */}
          <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#F59E0B]/30 space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-[#FFB95F]">
              <Coins size={16} />
              <span>Dinheiro Físico</span>
            </div>
            <div className="text-lg font-black text-white font-mono">
              {formatBrl(formas.dinheiro)}
            </div>
          </div>

          {/* SALDO / FIADO */}
          <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-slate-700 space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Wallet size={16} />
              <span>Conta Bar / Fiado</span>
            </div>
            <div className="text-lg font-black text-slate-200 font-mono">
              {formatBrl(formas.saldo_bar_fiado)}
            </div>
          </div>

        </div>
      </div>

      {/* ============================================================== */}
      {/* SELETOR DE SUB-ABAS DO GERENTE (Tactile Velocity)              */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 border-b border-[#334155] pb-2">
        <button
          onClick={() => setAbaAtiva('VISAO_GERAL')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            abaAtiva === 'VISAO_GERAL'
              ? 'bg-[#10B981] text-[#0B1326] font-extrabold shadow-md'
              : 'bg-[#131B2E] text-slate-400 hover:text-white border border-[#334155]'
          }`}
        >
          <FileText size={16} />
          <span>Extrato de Vendas & Entradas</span>
        </button>

        <button
          onClick={() => setAbaAtiva('DEVEDORES')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            abaAtiva === 'DEVEDORES'
              ? 'bg-[#10B981] text-[#0B1326] font-extrabold shadow-md'
              : 'bg-[#131B2E] text-slate-400 hover:text-white border border-[#334155]'
          }`}
        >
          <Users size={16} />
          <span>Irmãos Devedores ({resumo?.devedores?.length || 0})</span>
        </button>

        <button
          onClick={() => setAbaAtiva('FECHAMENTO')}
          className={`min-h-[44px] px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            abaAtiva === 'FECHAMENTO'
              ? 'bg-[#10B981] text-[#0B1326] font-extrabold shadow-md'
              : 'bg-[#131B2E] text-slate-400 hover:text-white border border-[#334155]'
          }`}
        >
          <Lock size={16} />
          <span>Fechamento & Gaveta de Caixa</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: EXTRATO DE VENDAS & ENTRADAS                            */}
      {/* ============================================================== */}
      {abaAtiva === 'VISAO_GERAL' && (
        <div className="p-5 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
              Últimas Transações Registradas
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total de registros: {transacoes.length}
            </span>
          </div>

          {!transacoes.length ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Nenhuma transação lançada recentemente no caixa do bar.
            </p>
          ) : (
            <div className="divide-y divide-[#334155]">
              {transacoes.slice(0, 20).map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {t.descricao}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(t.data_transacao).toLocaleDateString()} {new Date(t.data_transacao).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-sm font-black font-mono ${
                      t.tipo === 'receita' ? 'text-[#4EDEA3]' : 'text-rose-400'
                    }`}>
                      {t.tipo === 'receita' ? '+' : '-'} {formatBrl(t.valor)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: IRMÃOS DEVEDORES (CONTAS A RECEBER)                     */}
      {/* ============================================================== */}
      {abaAtiva === 'DEVEDORES' && (
        <div className="p-5 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-4 shadow-xl">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
              Cobrança Fraternal & Contas em Aberto
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Irmãos que consumiram na modalidade pós-paga no Bar (limite máximo de R$ 100,00).
            </p>
          </div>

          {!resumo?.devedores?.length ? (
            <div className="p-8 text-center space-y-2 bg-[#131B2E] rounded-2xl border border-[#334155]">
              <Check className="mx-auto text-[#4EDEA3]" size={36} />
              <p className="text-sm font-bold text-white">Nenhum irmão devedor no momento!</p>
              <p className="text-xs text-slate-400">Todos os consumos do bar estão 100% quitados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resumo.devedores.map((dev, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#131B2E] border border-[#334155] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-[#FFB95F] border border-amber-500/30 font-mono">
                        Pós-pago
                      </span>
                      {dev.cim && (
                        <span className="text-xs text-slate-400 font-mono">CIM: {dev.cim}</span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-white mt-1 truncate">
                      Ir.'. {dev.nome}
                    </h4>
                    {dev.telefone && (
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        WhatsApp: {dev.telefone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-[#334155]">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Débito Atual</span>
                      <span className="text-xl font-black text-[#F59E0B] font-mono">
                        {formatBrl(dev.saldo_devedor)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopiarCobrancaPix(dev.nome, dev.saldo_devedor, idx)}
                      className="min-h-[44px] px-4 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      {pixCopiadoIdx === idx ? <Check size={14} className="text-[#4EDEA3]" /> : <Copy size={14} />}
                      <span>{pixCopiadoIdx === idx ? "Copiado!" : "Copiar Cobrança Pix"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: FECHAMENTO & GAVETA DE CAIXA                            */}
      {/* ============================================================== */}
      {abaAtiva === 'FECHAMENTO' && (
        <div className="p-5 rounded-3xl bg-[#0B1326] border border-[#334155] space-y-4 shadow-xl">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
              Balancete & Conciliação da Gaveta
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Conferência entre dinheiro físico apurado e os comprovantes digitais do evento.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Bloco 1: Esperado pelo Sistema */}
            <div className="p-4 rounded-2xl bg-[#131B2E] border border-[#334155] space-y-3">
              <span className="text-xs font-bold text-slate-300 font-mono block">
                1. Valores Digitais Computados
              </span>
              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>PIX (Conta Digital Bar):</span>
                  <span className="font-bold text-white">{formatBrl(formas.pix)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cartões POS (Maquininha):</span>
                  <span className="font-bold text-white">{formatBrl(formas.cartao_debito + formas.cartao_credito)}</span>
                </div>
                <div className="flex justify-between border-t border-[#334155] pt-1.5 font-bold text-slate-200">
                  <span>Dinheiro em Espécie Esperado:</span>
                  <span className="text-[#F59E0B]">{formatBrl(totalEmEspecie)}</span>
                </div>
              </div>
            </div>

            {/* Bloco 2: Contagem Física da Gaveta */}
            <div className="p-4 rounded-2xl bg-[#131B2E] border border-[#334155] space-y-3">
              <span className="text-xs font-bold text-slate-300 font-mono block">
                2. Contagem da Gaveta de Dinheiro
              </span>
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 block">
                  Informe o total em notas e moedas apurado fisicamente:
                </label>
                <input
                  type="number"
                  step="0.50"
                  value={gavetaDinheiroInput}
                  onChange={(e) => setGavetaDinheiroInput(e.target.value)}
                  placeholder={`Ex: ${totalEmEspecie.toFixed(2)}`}
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-xl bg-[#0B1326] border border-[#334155] focus:border-[#10B981] text-white font-mono font-bold text-base outline-none"
                />
                
                {gavetaDinheiroInput && (
                  <div className={`p-2.5 rounded-xl text-xs font-mono font-bold flex justify-between ${
                    diferencaGaveta === 0 
                      ? 'bg-[#10B981]/15 text-[#4EDEA3] border border-[#10B981]/30'
                      : diferencaGaveta > 0
                      ? 'bg-[#38BDF8]/15 text-[#7BD0FF] border border-[#38BDF8]/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}>
                    <span>Diferença apurada:</span>
                    <span>{diferencaGaveta >= 0 ? '+' : ''}{formatBrl(diferencaGaveta)}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleSimularFechamentoCaixa}
              className="w-full min-h-[50px] px-6 py-3 bg-[#10B981] hover:bg-[#059669] text-[#0B1326] rounded-xl font-extrabold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Lock size={18} />
              <span>Concluir Conciliação & Fechar Caixa da Sessão</span>
            </button>
          </div>

          {fechamentoConcluido && (
            <div className="p-3.5 rounded-xl bg-[#10B981]/20 border border-[#10B981] text-[#4EDEA3] font-bold text-xs flex items-center gap-2 animate-fadeIn">
              <Check size={18} />
              <span>Caixa da sessão conciliado e registrado com sucesso na auditoria do Bar!</span>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
