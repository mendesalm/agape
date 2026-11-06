import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  ArrowRight, 
  Boxes
} from 'lucide-react';
import { api } from '../services/api';

export const PainelGerencia: React.FC = () => {
  const navigate = useNavigate();
  const [metricasRapidas, setMetricasRapidas] = useState<{
    faturamento?: number;
    comandas_fechadas?: number;
    itens_baixo_estoque?: number;
  }>({});

  useEffect(() => {
    // Busca métricas leves para dar vida aos cards
    Promise.all([
      api.get('/financeiro/resumo').catch(() => ({ data: {} })),
      api.get('/produtos/alertas-reposicao').catch(() => ({ data: [] }))
    ]).then(([resFin, resEst]) => {
      setMetricasRapidas({
        faturamento: resFin.data?.faturamento || 0,
        comandas_fechadas: resFin.data?.total_comandas_fechadas || 0,
        itens_baixo_estoque: Array.isArray(resEst.data) ? resEst.data.length : 0
      });
    });
  }, []);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn select-none">
      
      {/* ============================================================== */}
      {/* BARRA SUPERIOR BIDIRECIONAL & BREADCRUMBS                      */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app')}
            className="p-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold font-mono"
            title="Voltar ao Hub Inicial"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Hub</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Hub</span>
            <span>/</span>
            <span className="text-[#DDB96B] font-bold">Painel da Gerência</span>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400">
          Nível de Acesso: <strong className="text-white">Gerente do Bar / Loja</strong>
        </span>
      </div>

      {/* ============================================================== */}
      {/* TÍTULO DA SEÇÃO                                                */}
      {/* ============================================================== */}
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#DDB96B]">
          Painel Secundário da Gerência
        </span>
        <h2 className="text-2xl sm:text-3xl font-black font-cinzel text-white">
          Selecione a Dimensão Operacional
        </h2>
        <p className="text-xs sm:text-sm text-slate-300">
          Escolha entre a gestão financeira/administrativa ou o controle de estoque e reposição logística.
        </p>
      </div>

      {/* ============================================================== */}
      {/* OS DOIS WIDGETS DE ALTO NÍVEL: ADMINISTRATIVO E LOGÍSTICA      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ------------------------------------------------------------ */}
        {/* CARD A: ADMINISTRATIVO                                       */}
        {/* ------------------------------------------------------------ */}
        <div
          onClick={() => navigate('/app/gerencia/administrativo')}
          className="group relative bg-[#0B1326] hover:bg-[#101A33] border border-[#DDB96B]/30 hover:border-[#DDB96B] rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:shadow-[#DDB96B]/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[320px]"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#DDB96B]/10 rounded-full blur-3xl group-hover:bg-[#DDB96B]/20 transition-all" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#DDB96B]/20 to-[#0B1326] border border-[#DDB96B]/50 flex items-center justify-center text-[#FDE68A] shadow-md group-hover:scale-105 transition-transform">
                <DollarSign className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-mono text-[#FDE68A]">
                Módulo 01
              </span>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#DDB96B] block">
                Finanças & Conformidade
              </span>
              <h3 className="text-2xl font-black text-white font-cinzel mt-1">
                Administrativo
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dashboard Geral de métricas gerenciais, controle de caixa do bar, conciliação Pix/Cartão, relatórios de devedores (fiado) e trilha completa de <strong>Auditoria</strong>.
            </p>

            {/* Micro métrica de faturamento */}
            <div className="p-3 bg-[#070F1E] border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Faturamento da Sessão:</span>
              <span className="font-extrabold text-[#4EDEA3]">
                R$ {(metricasRapidas.faturamento || 0).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-6 relative z-10 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs font-bold font-mono text-[#FDE68A] group-hover:text-white transition-colors">
            <span>Acessar Administrativo</span>
            <div className="w-9 h-9 rounded-xl bg-[#DDB96B]/20 group-hover:bg-[#DDB96B] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
              <ArrowRight size={18} />
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------ */}
        {/* CARD B: LOGÍSTICA                                            */}
        {/* ------------------------------------------------------------ */}
        <div
          onClick={() => navigate('/app/gerencia/logistica')}
          className="group relative bg-[#0B1326] hover:bg-[#101A33] border border-[#38BDF8]/30 hover:border-[#38BDF8] rounded-3xl p-6 sm:p-8 shadow-xl hover:shadow-2xl hover:shadow-[#38BDF8]/10 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[320px]"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#38BDF8]/10 rounded-full blur-3xl group-hover:bg-[#38BDF8]/20 transition-all" />

          <div className="space-y-5 relative z-10">
            <div className="flex items-center justify-between">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#38BDF8]/20 to-[#0B1326] border border-[#38BDF8]/50 flex items-center justify-center text-[#7BD0FF] shadow-md group-hover:scale-105 transition-transform">
                <Boxes className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-[11px] font-mono text-[#7BD0FF]">
                Módulo 02
              </span>
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7BD0FF] block">
                Cadeia de Suprimentos & Bar
              </span>
              <h3 className="text-2xl font-black text-white font-cinzel mt-1">
                Logística
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Dashboard Logístico, <strong>Controle de Estoque visual em Grid de Fotos</strong>, cascata de gestão por item, transferências (Almoxarifado ➔ Bar), lotes com custos diferentes e perdas.
            </p>

            {/* Micro métrica de reposição */}
            <div className="p-3 bg-[#070F1E] border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Itens em Alerta de Estoque:</span>
              <span className={`font-extrabold ${metricasRapidas.itens_baixo_estoque ? 'text-amber-400' : 'text-emerald-400'}`}>
                {metricasRapidas.itens_baixo_estoque || 0} produto(s)
              </span>
            </div>
          </div>

          <div className="pt-6 relative z-10 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs font-bold font-mono text-[#7BD0FF] group-hover:text-white transition-colors">
            <span>Acessar Logística</span>
            <div className="w-9 h-9 rounded-xl bg-[#38BDF8]/20 group-hover:bg-[#38BDF8] group-hover:text-[#0B1326] flex items-center justify-center transition-all">
              <ArrowRight size={18} />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
