import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Receipt,
  UtensilsCrossed,
  Package
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ResumoFinanceiro {
  faturamento: number;
  despesas: number;
  prejuizo_quebras: number;
  lucro_bruto: number;
  total_comandas_fechadas: number;
  ticket_medio: number;
}

interface Transacao {
  id: number;
  tipo: 'receita' | 'despesa';
  valor: number;
  descricao: string;
  data_transacao: string;
}

export function Dashboard() {
  const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      const [respResumo, respTransacoes] = await Promise.all([
        api.get('/financeiro/resumo'),
        api.get('/financeiro/transacoes')
      ]);
      setResumo(respResumo.data);
      setTransacoes(respTransacoes.data);
    } catch (error) {
      console.error('Erro ao carregar painel financeiro', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-[#DDB96B] animate-pulse font-cinzel">
        Carregando métricas financeiras do Salão de Ágapes...
      </div>
    );
  }

  const chartData = [
    {
      name: 'Resumo do Mês',
      Faturamento: resumo?.faturamento || 0,
      Custos: (resumo?.despesas || 0) + (resumo?.prejuizo_quebras || 0),
      Lucro: resumo?.lucro_bruto || 0
    }
  ];

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-cinzel text-sigma-gold">
            Painel do Salão de Ágapes
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visão geral de faturamento, comandas fechadas, estoque e resultado da Loja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/comandas"
            className="px-5 py-2.5 text-xs uppercase tracking-wider btn-masonic-pill btn-pill-blue"
          >
            <UtensilsCrossed className="w-4 h-4" /> Abrir Comandas
          </Link>
          <Link
            to="/app/produtos"
            className="px-5 py-2.5 text-xs uppercase tracking-wider btn-masonic-pill btn-pill-dark"
          >
            <Package className="w-4 h-4" /> Estoque FEFO
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card-deep-blue-glass p-6 flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl vidro-destaque flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 icon-sigma-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Faturamento Bruto
            </p>
            <p className="text-2xl font-bold text-[#FDE68A] mt-0.5">
              {formatCurrency(resumo?.faturamento || 0)}
            </p>
          </div>
        </div>

        <div className="card-deep-blue-glass p-6 flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl vidro-destaque flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 icon-sigma-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Resultado Estimado
            </p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">
              {formatCurrency(resumo?.lucro_bruto || 0)}
            </p>
          </div>
        </div>

        <div className="card-deep-blue-glass p-6 flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl vidro-destaque flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 icon-sigma-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Perdas / Quebras
            </p>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">
              {formatCurrency(resumo?.prejuizo_quebras || 0)}
            </p>
          </div>
        </div>

        <div className="card-deep-blue-glass p-6 flex items-center space-x-4">
          <div className="w-13 h-13 rounded-2xl vidro-destaque flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 icon-sigma-gold" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ticket Médio
            </p>
            <p className="text-2xl font-bold text-sky-400 mt-0.5">
              {formatCurrency(resumo?.ticket_medio || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {resumo?.total_comandas_fechadas || 0} comandas fechadas
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico */}
        <div className="lg:col-span-2 card-deep-blue-glass p-6">
          <h3 className="text-base font-bold font-cinzel text-[#FDE68A] mb-6">
            Receitas vs Custos vs Resultado
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(221, 185, 107, 0.15)" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1428',
                    borderColor: 'rgba(221, 185, 107, 0.35)',
                    borderRadius: '12px',
                    color: '#f8fafc'
                  }}
                  formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
                />
                <Bar dataKey="Faturamento" fill="#DDB96B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Custos" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Lucro" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histórico Recente */}
        <div className="card-deep-blue-glass overflow-hidden flex flex-col">
          <div className="p-5 border-b border-[#DDB96B]/20 bg-[#0A1428]/60 flex items-center space-x-2.5">
            <Receipt className="w-5 h-5 icon-sigma-gold" />
            <h3 className="font-bold font-cinzel text-[#FDE68A] text-sm">
              Transações Recentes
            </h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-80">
            {transacoes.length === 0 ? (
              <p className="p-8 text-center text-slate-400 text-sm">
                Sem movimentações registradas no período.
              </p>
            ) : (
              <ul className="divide-y divide-[#DDB96B]/15">
                {transacoes.map((t) => (
                  <li
                    key={t.id}
                    className="p-4 flex justify-between items-center hover:bg-white/[0.03] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        {t.descricao || 'Transação do Ágape'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(t.data_transacao).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className={`font-bold text-sm ${
                        t.tipo === 'receita' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toFixed(2)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
