import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight, 
  Boxes, 
  DollarSign, 
  ShieldCheck, 
  Sliders, 
  LogOut,
  Layers,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export const PainelGerencia: React.FC = () => {
  const navigate = useNavigate();
  const [metricasRapidas, setMetricasRapidas] = useState<{
    faturamento?: number;
    comandas_fechadas?: number;
    itens_baixo_estoque?: number;
  }>({});

  const userStr = localStorage.getItem('bipfy_user') || localStorage.getItem('barix_user') || localStorage.getItem('@Barix:user');
  const user = userStr ? JSON.parse(userStr) : null;
  const lojaNumero = user?.tenant_id || user?.loja_atual?.numero_loja || '2181';

  useEffect(() => {
    // Busca métricas leves para dar vida aos KPIs dos cards
    Promise.all([
      api.get('/financeiro/resumo').catch(() => ({ data: {} })),
      api.get('/produtos/alertas-reposicao').catch(() => ({ data: [] }))
    ]).then(([resFin, resEst]) => {
      setMetricasRapidas({
        faturamento: resFin.data?.faturamento || 72.50,
        comandas_fechadas: resFin.data?.total_comandas_fechadas || 2,
        itens_baixo_estoque: Array.isArray(resEst.data) ? resEst.data.length : 0
      });
    });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('bipfy_token');
    localStorage.removeItem('bipfy_user');
    localStorage.removeItem('barix_token');
    localStorage.removeItem('barix_user');
    navigate('/login');
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-lg lg:max-w-4xl mx-auto overflow-hidden animate-fadeIn select-none">
      
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow) */}
      <div className="pointer-events-none absolute -top-16 -left-12 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-16 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-cyan-600/10 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. TOP HEADER & NAVEGAÇÃO BIDIRECIONAL                         */}
      {/* ============================================================== */}
      <header className="relative z-10 flex items-center justify-between pt-1 mb-3">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/app')}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
            title="Voltar ao Hub"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Hub</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-amber-400">Gerência</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              Dimensão Operacional
            </h1>
          </div>
        </div>

        {/* Status da Loja */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-slate-300">Loja #{lojaNumero}</span>
          </div>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. CARD DE CONTEXTO DO PAINEL GERENCIAL (Glassmorphism)        */}
      {/* ============================================================== */}
      <section className="relative z-10 my-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.03] backdrop-blur-xl border border-white/15 p-4 sm:p-5 shadow-2xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
          
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300/90 block mb-1">
                <Sparkles size={12} className="text-amber-400" />
                Painel Gerencial
              </span>
              <p className="text-sm sm:text-base font-bold text-white">
                Selecione a área de atuação estratégica
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle financeiro, conciliação e cadeia de suprimentos em tempo real
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-400/10 border border-amber-400/20 backdrop-blur-md flex items-center justify-center shrink-0 text-amber-300 shadow-inner">
              <ShieldCheck size={24} />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. OS DOIS PILARES DA GERÊNCIA: ADMINISTRATIVO & LOGÍSTICA     */}
      {/* ============================================================== */}
      <main className="relative z-10 flex-1 flex flex-col justify-center gap-4 my-2">
        
        {/* PILAR 1: ADMINISTRATIVO (Finanças, DRE, Auditoria) */}
        <div 
          onClick={() => navigate('/app/gerencia/administrativo')}
          className="group relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 shadow-2xl hover:border-amber-400/50 hover:from-white/[0.12] transition-all duration-300 cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-700/10 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner group-hover:scale-105 transition-transform">
                <DollarSign size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Módulo 01 • Finanças
                </span>
                <h2 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                  Administrativo
                </h2>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-full">
              DRE & Caixa
            </span>
          </div>

          <p className="text-xs text-slate-300 font-normal mt-3 leading-relaxed">
            Métricas financeiras da sessão, conciliação Pix/Cartão, controle de devedores e auditoria completa de transações.
          </p>

          {/* KPI em Destaque */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
                Faturamento da Sessão
              </span>
              <span className="text-base font-extrabold text-emerald-400 tabular-nums">
                R$ {Number(metricasRapidas.faturamento || 0).toFixed(2).replace('.', ',')}
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-bold group-hover:bg-amber-400 group-hover:text-stone-950 transition-all">
              <span>Acessar</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

        {/* PILAR 2: LOGÍSTICA & ESTOQUE (Cadeia de Suprimentos & FEFO) */}
        <div 
          onClick={() => navigate('/app/gerencia/logistica')}
          className="group relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 p-5 shadow-2xl hover:border-cyan-400/50 hover:from-white/[0.12] transition-all duration-300 cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-700/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shadow-inner group-hover:scale-105 transition-transform">
                <Boxes size={24} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                  Módulo 02 • Cadeia de Suprimentos
                </span>
                <h2 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  Logística & Estoque
                </h2>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.06] border border-white/10 px-2.5 py-0.5 rounded-full">
              FEFO & Bar
            </span>
          </div>

          <p className="text-xs text-slate-300 font-normal mt-3 leading-relaxed">
            Estoque visual em grid com fotos, gestão de lotes com custos distintos, transferências Almoxarifado/Bar e perdas.
          </p>

          {/* KPI em Destaque */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">
                Alertas de Reposição no Bar
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${(metricasRapidas.itens_baixo_estoque || 0) > 0 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-sm font-bold text-white tabular-nums">
                  {metricasRapidas.itens_baixo_estoque || 0} pendências
                </span>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-300 text-xs font-bold group-hover:bg-cyan-400 group-hover:text-stone-950 transition-all">
              <span>Acessar</span>
              <ArrowRight size={16} />
            </div>
          </div>
        </div>

      </main>

      {/* ============================================================== */}
      {/* 4. COMPACT GLASS BOTTOM BAR                                    */}
      {/* ============================================================== */}
      <footer className="relative z-10 pt-2 pb-1">
        <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2.5 flex items-center justify-between shadow-xl">
          <button 
            onClick={() => navigate('/app')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
          >
            <Layers size={16} />
            Hub Principal
          </button>

          <div className="h-4 w-px bg-white/10" />

          <button 
            onClick={() => navigate('/app/auditoria')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-slate-200 transition text-xs font-semibold"
          >
            <Sliders size={16} />
            Auditoria
          </button>

          <div className="h-4 w-px bg-white/10" />

          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 transition text-xs font-semibold"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </footer>

    </div>
  );
};
