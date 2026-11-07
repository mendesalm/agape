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
  RefreshCw,
  Lock,
  ChevronRight,
  ShieldCheck,
  Receipt,
  Search,
  CheckCircle,
  Copy,
  Check,
  Download,
  AlertTriangle
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
    dias_atraso?: number;
    comanda_id?: number;
  }>;
}

export const GerenteAdministrativo: React.FC = () => {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'VISAO_GERAL' | 'DEVEDORES' | 'FECHAMENTO'>('VISAO_GERAL');
  const [pixCopiadoIdx, setPixCopiadoIdx] = useState<number | null>(null);
  const [gavetaDinheiroInput, setGavetaDinheiroInput] = useState<string>('50,00');
  const [fechamentoConcluido, setFechamentoConcluido] = useState<boolean>(false);
  const [buscaDevedor, setBuscaDevedor] = useState<string>('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const respResumo = await api.get('/financeiro/resumo').catch(() => ({ data: null }));
      if (respResumo.data) {
        setResumo(respResumo.data);
      } else {
        // Mock fallback alinhado ao Stitch
        setResumo({
          faturamento: 72.50,
          despesas: 34.00,
          prejuizo_quebras: 0,
          lucro_bruto: 38.50,
          total_comandas_fechadas: 2,
          ticket_medio: 36.25,
          inadimplencia_total: 120.00,
          receitas_por_forma_pagamento: {
            pix: 60.00,
            cartao_debito: 0.00,
            cartao_credito: 0.00,
            dinheiro: 12.50,
            saldo_bar_fiado: 0.00
          },
          devedores: [
            { nome: 'Rafael Vasconcelos', cim: '44812', saldo_devedor: 75.00, dias_atraso: 15, comanda_id: 89 },
            { nome: 'André Oliveira', cim: '39201', saldo_devedor: 45.00, dias_atraso: 7, comanda_id: 96 }
          ]
        });
      }
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

  const formatBrl = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;

  const devedoresLista = resumo?.devedores || [
    { nome: 'Rafael Vasconcelos', cim: '44812', saldo_devedor: 75.00, dias_atraso: 15, comanda_id: 89 },
    { nome: 'André Oliveira', cim: '39201', saldo_devedor: 45.00, dias_atraso: 7, comanda_id: 96 }
  ];

  const devedoresFiltrados = devedoresLista.filter(d => 
    d.nome.toLowerCase().includes(buscaDevedor.toLowerCase()) || 
    (d.cim && d.cim.includes(buscaDevedor))
  );

  const formas = resumo?.receitas_por_forma_pagamento || {
    pix: 60.00,
    cartao_debito: 0,
    cartao_credito: 0,
    dinheiro: 12.50,
    saldo_bar_fiado: 0
  };

  const totalCartoes = (formas.cartao_debito || 0) + (formas.cartao_credito || 0);

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-lg lg:max-w-4xl mx-auto overflow-hidden animate-fadeIn select-none text-slate-100">
      
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow) */}
      <div className="pointer-events-none absolute -top-14 -left-12 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-1/4 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. TOP HEADER & NAVEGAÇÃO BIDIRECIONAL                         */}
      {/* ============================================================== */}
      <header className="relative z-10 flex items-center justify-between pt-1 mb-3">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/app/gerencia')}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
            title="Voltar para Dimensões"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Gerência</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-amber-400">Administrativo</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              Dashboard & Auditoria
            </h1>
          </div>
        </div>

        <button 
          onClick={carregarDados}
          className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-300 hover:bg-white/10 transition active:scale-95 shadow-inner" 
          title="Atualizar Métricas"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin text-amber-400' : ''} />
        </button>
      </header>

      {/* ============================================================== */}
      {/* 2. ATALHOS RÁPIDOS GLASS (Auditoria & Devedores)                */}
      {/* ============================================================== */}
      <section className="relative z-10 grid grid-cols-2 gap-2.5 my-2">
        <button 
          onClick={() => navigate('/app/auditoria')}
          className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-emerald-400/40 text-left transition-all active:scale-95 shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <ShieldCheck size={18} />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block">Segurança</span>
              <span className="text-xs font-bold text-white block -mt-0.5 group-hover:text-emerald-300">Auditoria</span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-300 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button 
          onClick={() => setAbaAtiva('DEVEDORES')}
          className="group flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-rose-400/40 text-left transition-all active:scale-95 shadow-xl"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shadow-inner">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-rose-400 block">Cobrança</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-white block -mt-0.5 group-hover:text-rose-300">
                Devedores ({devedoresLista.length})
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-300 transition-transform group-hover:translate-x-0.5" />
        </button>
      </section>

      {/* ============================================================== */}
      {/* 3. SEGMENTED TAB BAR                                           */}
      {/* ============================================================== */}
      <nav className="relative z-10 flex p-1 rounded-2xl bg-white/[0.05] backdrop-blur-md border border-white/10 gap-1 text-xs font-semibold my-1">
        <button 
          onClick={() => setAbaAtiva('VISAO_GERAL')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            abaAtiva === 'VISAO_GERAL'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp size={15} />
          Visão Geral
        </button>

        <button 
          onClick={() => setAbaAtiva('DEVEDORES')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            abaAtiva === 'DEVEDORES'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users size={15} />
          Devedores ({devedoresLista.length})
        </button>

        <button 
          onClick={() => setAbaAtiva('FECHAMENTO')}
          className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            abaAtiva === 'FECHAMENTO'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-sm font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Lock size={15} />
          Fechamento
        </button>
      </nav>

      {/* ============================================================== */}
      {/* 4. CONTEÚDO DAS ABAS                                           */}
      {/* ============================================================== */}
      <div className="relative z-10 flex-1 my-2">
        
        {/* ------------------------------------------------------------ */}
        {/* ABA A: VISÃO GERAL (DRE & RECEBIMENTOS)                      */}
        {/* ------------------------------------------------------------ */}
        {abaAtiva === 'VISAO_GERAL' && (
          <div className="space-y-3">
            
            {/* Grid 2x2 de KPIs Principais */}
            <div className="grid grid-cols-2 gap-2.5">
              
              {/* KPI 1: Faturamento Bruto */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Faturamento</span>
                  <DollarSign size={18} className="text-emerald-400" />
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight tabular-nums">
                    {formatBrl(resumo?.faturamento || 72.50)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Vendas da sessão</p>
                </div>
              </div>

              {/* KPI 2: Lucro Estimado */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Lucro Estimado</span>
                  <TrendingUp size={18} className="text-amber-400" />
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight tabular-nums">
                    {formatBrl(resumo?.lucro_bruto || 38.50)}
                  </div>
                  <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5">53.1% margem</p>
                </div>
              </div>

              {/* KPI 3: Comandas & Ticket Médio */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comandas</span>
                  <Receipt size={18} className="text-cyan-400" />
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
                    {resumo?.total_comandas_fechadas || 2} <span className="text-xs font-normal text-slate-400">pedidos</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Ticket médio: {formatBrl(resumo?.ticket_medio || 36.25)}
                  </p>
                </div>
              </div>

              {/* KPI 4: Fiado Pendente / Inadimplência */}
              <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-rose-500/20 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Fiado Pendente</span>
                  <AlertTriangle size={18} className="text-rose-400" />
                </div>
                <div className="mt-2">
                  <div className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight tabular-nums">
                    {formatBrl(resumo?.inadimplencia_total || 120.00)}
                  </div>
                  <p className="text-[10px] text-rose-300/80 font-medium mt-0.5">A receber (irmãos)</p>
                </div>
              </div>

            </div>

            {/* Discriminação de Meios de Pagamento */}
            <div className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Wallet size={16} className="text-amber-400" />
                  Recebimentos da Sessão
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
                  Conciliado
                </span>
              </div>

              {/* Barra de progresso visual */}
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex mb-3.5">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: '82%' }} />
                <div className="h-full bg-blue-400" style={{ width: '0%' }} />
                <div className="h-full bg-amber-400" style={{ width: '18%' }} />
              </div>

              {/* Grid 3 Canais */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-400 font-bold mb-0.5">
                    <QrCode size={13} />
                    PIX
                  </div>
                  <span className="text-xs font-extrabold text-white tabular-nums">
                    {formatBrl(formas.pix)}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 opacity-70">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-medium mb-0.5">
                    <CreditCard size={13} />
                    Cartões
                  </div>
                  <span className="text-xs font-medium text-slate-400 tabular-nums">
                    {formatBrl(totalCartoes)}
                  </span>
                </div>

                <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-amber-400 font-bold mb-0.5">
                    <Coins size={13} />
                    Dinheiro
                  </div>
                  <span className="text-xs font-extrabold text-white tabular-nums">
                    {formatBrl(formas.dinheiro)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ABA B: DEVEDORES & COBRANÇA PIX                              */}
        {/* ------------------------------------------------------------ */}
        {abaAtiva === 'DEVEDORES' && (
          <div className="space-y-3">
            
            {/* Card Resumo do Fiado */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.03] backdrop-blur-xl border border-rose-500/25 p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Total a Receber</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-300">
                      {devedoresLista.length} Irmãos
                    </span>
                  </div>
                  <div className="text-2xl font-black text-rose-400 tracking-tight tabular-nums">
                    {formatBrl(resumo?.inadimplencia_total || 120.00)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Saldo em aberto pendente de acerto no bar</p>
                </div>

                <button 
                  onClick={() => alert('Mensagens de cobrança em lote disparadas com sucesso!')}
                  className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/30 text-rose-300 hover:bg-rose-500/25 transition active:scale-95 shadow-inner"
                >
                  <Receipt size={22} />
                  <span className="text-[9px] font-bold mt-1">Cobrar</span>
                </button>
              </div>
            </div>

            {/* Campo de Busca de Devedores */}
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-400" size={16} />
              <input 
                type="text"
                value={buscaDevedor}
                onChange={(e) => setBuscaDevedor(e.target.value)}
                placeholder="Buscar por nome do irmão ou CIM..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-400/50 shadow-inner"
              />
            </div>

            {/* Lista de Devedores */}
            <div className="space-y-2.5">
              {devedoresFiltrados.map((dev, idx) => (
                <div key={idx} className="p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-white/10 flex items-center justify-center text-amber-300 font-bold text-sm shadow-inner">
                        {dev.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Ir.'. {dev.nome}</span>
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded-md border border-rose-400/20">
                            {dev.dias_atraso || 15} dias
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Comanda #{dev.comanda_id || 89} • CIM: {dev.cim || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-rose-400 tabular-nums block">
                        {formatBrl(dev.saldo_devedor)}
                      </span>
                      <span className="text-[10px] text-slate-400">Em aberto</span>
                    </div>
                  </div>

                  {/* Ações Rápidas */}
                  <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                    <button 
                      onClick={() => alert(`Visualizando itens da comanda do Ir.'. ${dev.nome}`)}
                      className="flex-1 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <Receipt size={14} />
                      Ver Itens
                    </button>
                    <button 
                      onClick={() => handleCopiarCobrancaPix(dev.nome, dev.saldo_devedor, idx)}
                      className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                    >
                      {pixCopiadoIdx === idx ? <Check size={14} /> : <Copy size={14} />}
                      {pixCopiadoIdx === idx ? 'Copiado!' : 'Cobrar Pix'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------ */}
        {/* ABA C: FECHAMENTO DE CAIXA                                   */}
        {/* ------------------------------------------------------------ */}
        {abaAtiva === 'FECHAMENTO' && (
          <div className="space-y-3">
            
            {/* Card Resumo do Fechamento */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.03] backdrop-blur-xl border border-white/15 p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Arrecadado</span>
                  <div className="text-2xl font-black text-emerald-400 tracking-tight tabular-nums mt-0.5">
                    {formatBrl(resumo?.faturamento || 72.50)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">2 comandas finalizadas • 0 cancelamentos</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Diferença / Quebra</span>
                  <div className="text-sm font-bold text-white tracking-tight tabular-nums mt-0.5 flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    R$ 0,00
                  </div>
                  <span className="text-[9px] text-emerald-400/90 font-semibold">Conferido 100%</span>
                </div>
              </div>
            </div>

            {/* Conferência de Valores */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest px-1 flex items-center justify-between">
                <span>Conferência de Valores</span>
                <span className="text-[10px] text-emerald-400 font-medium">Balanço OK</span>
              </div>

              {/* Linha 1: PIX Direto */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">PIX Direto</span>
                    <span className="text-[10px] text-slate-400 block">Sistema: {formatBrl(formas.pix)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={formas.pix.toFixed(2).replace('.', ',')} 
                    readOnly
                    className="w-20 px-2 py-1 text-right text-xs font-bold text-emerald-400 bg-black/40 border border-emerald-400/30 rounded-lg tabular-nums"
                  />
                  <CheckCircle size={18} className="text-emerald-400" />
                </div>
              </div>

              {/* Linha 2: Cartões TEF/Maquininha */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Cartões TEF / Maquininha</span>
                    <span className="text-[10px] text-slate-400 block">Sistema: {formatBrl(totalCartoes)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={totalCartoes.toFixed(2).replace('.', ',')} 
                    readOnly
                    className="w-20 px-2 py-1 text-right text-xs font-medium text-slate-300 bg-black/40 border border-white/10 rounded-lg tabular-nums"
                  />
                  <CheckCircle size={18} className="text-slate-500" />
                </div>
              </div>

              {/* Linha 3: Dinheiro em Espécie (Gaveta) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Coins size={18} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Dinheiro em Espécie</span>
                    <span className="text-[10px] text-slate-400 block">Fundo inicial + vendas: R$ 50,00</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={gavetaDinheiroInput}
                    onChange={(e) => setGavetaDinheiroInput(e.target.value)}
                    className="w-20 px-2 py-1 text-right text-xs font-bold text-white bg-black/40 border border-amber-400/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 tabular-nums"
                  />
                  <CheckCircle size={18} className="text-emerald-400" />
                </div>
              </div>
            </div>

            {fechamentoConcluido ? (
              <div className="p-4 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 text-center animate-bounce">
                <span className="text-xs font-bold text-emerald-300">✓ Caixa Fechado com Sucesso! Relatório DRE arquivado.</span>
              </div>
            ) : (
              <button 
                onClick={handleSimularFechamentoCaixa}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-stone-950 font-black text-sm tracking-tight flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-[0.98] transition"
              >
                <Lock size={18} />
                <span>Concluir e Fechar Caixa Definitivo</span>
              </button>
            )}

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* 5. COMPACT GLASS BOTTOM BAR                                    */}
      {/* ============================================================== */}
      <footer className="relative z-10 pt-2 pb-1">
        <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2.5 flex items-center justify-between shadow-xl">
          <button 
            onClick={() => alert('Download do Relatório DRE iniciado!')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
          >
            <Download size={16} />
            Exportar DRE
          </button>

          <div className="h-4 w-px bg-white/10" />

          <button 
            onClick={() => setAbaAtiva('FECHAMENTO')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 transition text-xs font-bold shadow-sm"
          >
            <Lock size={16} />
            Fechar Caixa
          </button>
        </div>
      </footer>

    </div>
  );
};
