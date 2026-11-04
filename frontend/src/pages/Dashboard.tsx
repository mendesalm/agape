import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DollarSign, TrendingUp, AlertTriangle, Users, Receipt } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
      console.error("Erro ao carregar painel financeiro", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-500 animate-pulse">Carregando métricas financeiras...</div>;
  }

  // Dados para o Gráfico (Exemplo simplificado consolidando em uma barrinha para demonstração)
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
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Painel Financeiro</h1>
        <p className="text-gray-500 mt-1">Visão geral do faturamento, lucros e perdas do estabelecimento.</p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Faturamento Bruto</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(resumo?.faturamento || 0)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Lucro Estimado</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(resumo?.lucro_bruto || 0)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
            <AlertTriangle size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Prejuízo (Quebras)</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(resumo?.prejuizo_quebras || 0)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 shrink-0">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Ticket Médio</p>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(resumo?.ticket_medio || 0)}</p>
            <p className="text-xs text-gray-400 mt-1">{resumo?.total_comandas_fechadas} contas fechadas</p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Receitas vs Custos vs Lucro</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                <Bar dataKey="Faturamento" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Histórico Recente */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center space-x-2">
            <Receipt className="text-gray-500" size={20} />
            <h3 className="font-bold text-gray-800">Transações Recentes</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-80">
            {transacoes.length === 0 ? (
              <p className="p-6 text-center text-gray-400">Sem fluxo de caixa.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {transacoes.map((t) => (
                  <li key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.descricao || 'Transação Genérica'}</p>
                      <p className="text-xs text-gray-400">{new Date(t.data_transacao).toLocaleString()}</p>
                    </div>
                    <div className={`font-bold ${t.tipo === 'receita' ? 'text-green-600' : 'text-red-500'}`}>
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
