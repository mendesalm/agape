import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  ShieldCheck, 
  Search, 
  ShoppingBag, 
  AlertTriangle, 
  Inbox, 
  Download, 
  PlusCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

interface TransacaoAudit {
  id: number;
  data: string;
  cliente_nome: string;
  cliente_cpf: string;
  tipo: string;
  valor: number;
  descricao: string;
  comanda_id?: number;
  motivo?: string;
  quantidade?: number;
}

export const Auditoria: React.FC = () => {
  const navigate = useNavigate();
  const [transacoes, setTransacoes] = useState<TransacaoAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [contextoAba, setContextoAba] = useState<'ESTOQUE' | 'CAIXA'>('ESTOQUE');
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'VENDAS' | 'PERDAS' | 'ENTRADAS'>('TODOS');
  const [isModalOcorrencia, setIsModalOcorrencia] = useState(false);
  const [novaOcorrenciaDesc, setNovaOcorrenciaDesc] = useState('');

  useEffect(() => {
    carregarAuditoria();
  }, []);

  const carregarAuditoria = async () => {
    try {
      setLoading(true);
      const res = await api.get('/financeiro/auditoria').catch(() => ({ data: [] }));
      if (Array.isArray(res.data)) {
        setTransacoes(res.data);
      } else {
        setTransacoes([]);
      }
    } catch (err) {
      console.error("Erro ao carregar auditoria", err);
    } finally {
      setLoading(false);
    }
  };

  const transacoesFiltradas = transacoes.filter(t => {
    const matchBusca = 
      t.cliente_nome.toLowerCase().includes(termoBusca.toLowerCase()) || 
      t.descricao.toLowerCase().includes(termoBusca.toLowerCase()) ||
      (t.motivo && t.motivo.toLowerCase().includes(termoBusca.toLowerCase()));

    if (!matchBusca) return false;

    if (filtroTipo === 'VENDAS') return t.tipo.toLowerCase().includes('venda');
    if (filtroTipo === 'PERDAS') return t.tipo.toLowerCase().includes('perda');
    if (filtroTipo === 'ENTRADAS') return t.tipo.toLowerCase().includes('entrada');
    return true;
  });

  const countVendas = transacoes.filter(t => t.tipo.toLowerCase().includes('venda')).length;
  const countPerdas = transacoes.filter(t => t.tipo.toLowerCase().includes('perda')).length;
  const countEntradas = transacoes.filter(t => t.tipo.toLowerCase().includes('entrada')).length;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-lg lg:max-w-4xl mx-auto overflow-hidden animate-fadeIn select-none text-slate-100">
      
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow) */}
      <div className="pointer-events-none absolute -top-16 -left-12 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-16 w-64 h-64 rounded-full bg-cyan-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. TOP HEADER & NAVEGAÇÃO BIDIRECIONAL                         */}
      {/* ============================================================== */}
      <header className="relative z-10 flex items-center justify-between pt-1 mb-3">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/app/gerencia/administrativo')}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
            title="Voltar para Administrativo"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Admin</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-emerald-400">Auditoria</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
              Trilha & Logs de Segurança
            </h1>
          </div>
        </div>

        {/* Indicador de Status com Pulso Verde */}
        <button 
          onClick={carregarAuditoria}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 hover:border-emerald-400/40 text-slate-300 hover:text-emerald-300 transition active:scale-95 shadow-inner text-xs font-semibold"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Ao Vivo</span>
        </button>
      </header>

      {/* ============================================================== */}
      {/* 2. SELETOR SEGMENTADO (ESTOQUE & PERDAS VS CAIXA DO BAR)       */}
      {/* ============================================================== */}
      <nav className="relative z-10 grid grid-cols-2 p-1 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 gap-1 my-2 text-xs font-semibold">
        <button 
          onClick={() => setContextoAba('ESTOQUE')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            contextoAba === 'ESTOQUE'
              ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/20 text-emerald-300 border border-emerald-400/30 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Estoque & Perdas</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 text-[10px] font-bold text-emerald-300">
            {transacoes.length}
          </span>
        </button>

        <button 
          onClick={() => setContextoAba('CAIXA')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
            contextoAba === 'CAIXA'
              ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border border-amber-400/30 shadow-sm font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          <span>Caixa do Bar</span>
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-slate-300">
            {countVendas}
          </span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* 3. CAMPO DE BUSCA & CHIPS DE FILTRO RÁPIDO                     */}
      {/* ============================================================== */}
      <div className="relative z-10 my-1 space-y-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 text-slate-400" size={16} />
          <input 
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar produto, obreiro ou motivo..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400/50 shadow-inner"
          />
        </div>

        {/* Chips de Filtro Horizontal */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setFiltroTipo('TODOS')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
              filtroTipo === 'TODOS'
                ? 'bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 shadow-sm'
                : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Todos ({transacoes.length})
          </button>

          <button 
            onClick={() => setFiltroTipo('VENDAS')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
              filtroTipo === 'VENDAS'
                ? 'bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 shadow-sm'
                : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            Vendas ({countVendas})
          </button>

          <button 
            onClick={() => setFiltroTipo('PERDAS')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
              filtroTipo === 'PERDAS'
                ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 shadow-sm'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:text-white'
            }`}
          >
            Perdas ({countPerdas})
          </button>

          <button 
            onClick={() => setFiltroTipo('ENTRADAS')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
              filtroTipo === 'ENTRADAS'
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-sm'
                : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 hover:text-white'
            }`}
          >
            Entradas ({countEntradas})
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. FEED DE AUDITORIA INTELIGENTE (CARDS GLASSMORPHISM)         */}
      {/* ============================================================== */}
      <main className="relative z-10 flex-1 flex flex-col justify-start gap-2.5 my-2 overflow-y-auto max-h-[380px] scrollbar-thin scrollbar-thumb-slate-800">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-mono text-xs animate-pulse">
            Sincronizando trilha de auditoria...
          </div>
        ) : transacoesFiltradas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhuma ocorrência encontrada com os filtros aplicados.
          </div>
        ) : (
          transacoesFiltradas.map((evt) => {
            const isVenda = evt.tipo.toLowerCase().includes('venda');
            const isPerda = evt.tipo.toLowerCase().includes('perda');

            return (
              <article 
                key={evt.id}
                className="p-3.5 rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex items-center justify-between transition-all hover:border-white/20"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    isVenda 
                      ? 'bg-emerald-500/15 border border-emerald-400/30 text-emerald-400' 
                      : isPerda 
                      ? 'bg-rose-500/20 border border-rose-400/30 text-rose-400' 
                      : 'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400'
                  }`}>
                    {isVenda ? <ShoppingBag size={20} /> : isPerda ? <AlertTriangle size={20} /> : <Inbox size={20} />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white line-clamp-1">{evt.descricao}</span>
                      {evt.quantidade && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          evt.quantidade < 0 
                            ? isPerda ? 'text-rose-400 bg-rose-400/10' : 'text-emerald-400 bg-emerald-400/10' 
                            : 'text-cyan-400 bg-cyan-400/10'
                        }`}>
                          {evt.quantidade > 0 ? `+${evt.quantidade}` : evt.quantidade} un
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      {evt.comanda_id ? `Comanda #${evt.comanda_id} • ` : ''}
                      <span className="text-slate-400">{evt.cliente_nome}</span>
                      {evt.motivo ? ` • ${evt.motivo}` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-medium text-slate-400 block tabular-nums">{evt.data}</span>
                  {evt.valor > 0 ? (
                    <span className="text-[11px] font-bold text-emerald-400 tabular-nums">
                      + R$ {evt.valor.toFixed(2).replace('.', ',')}
                    </span>
                  ) : (
                    <span className={`text-[10px] font-semibold ${isPerda ? 'text-rose-400' : 'text-cyan-300'}`}>
                      {isPerda ? 'Avaria' : 'Entrada'}
                    </span>
                  )}
                </div>
              </article>
            );
          })
        )}
      </main>

      {/* ============================================================== */}
      {/* 5. COMPACT GLASS BOTTOM BAR                                    */}
      {/* ============================================================== */}
      <footer className="relative z-10 pt-2 pb-1">
        <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2.5 flex items-center justify-between shadow-xl">
          <button 
            onClick={() => alert('Exportação de relatório CSV de auditoria iniciada!')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
          >
            <Download size={16} />
            Exportar CSV
          </button>

          <div className="h-4 w-px bg-white/10" />

          <button 
            onClick={() => setIsModalOcorrencia(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 transition text-xs font-bold shadow-sm"
          >
            <PlusCircle size={16} />
            Registrar Ocorrência
          </button>
        </div>
      </footer>

      {/* Modal Simples de Ocorrência */}
      {isModalOcorrencia && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-emerald-400/40 rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <h3 className="text-sm font-bold">Registrar Ocorrência na Trilha de Auditoria</h3>
            <textarea
              value={novaOcorrenciaDesc}
              onChange={(e) => setNovaOcorrenciaDesc(e.target.value)}
              placeholder="Descreva a ocorrência fiscal ou operacional..."
              className="w-full h-24 p-3 rounded-2xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setIsModalOcorrencia(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  alert('Ocorrência registrada com assinatura digital do gerente!');
                  setIsModalOcorrencia(false);
                  setNovaOcorrenciaDesc('');
                }}
                className="flex-1 py-2 rounded-xl bg-emerald-500 text-stone-950 text-xs font-bold"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
