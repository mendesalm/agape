import { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Search, Clock, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { api } from '../services/api';

interface TransacaoAudit {
  id: number;
  data: string;
  cliente_nome: string;
  cliente_cpf: string;
  tipo: string;
  valor: number;
  descricao: string;
}

export function Auditoria() {
  const [transacoes, setTransacoes] = useState<TransacaoAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  useEffect(() => {
    carregarAuditoria();
  }, []);

  const carregarAuditoria = async () => {
    try {
      const res = await api.get('/financeiro/auditoria');
      setTransacoes(res.data);
    } catch (err) {
      console.error("Erro ao carregar auditoria", err);
    } finally {
      setLoading(false);
    }
  };

  const transacoesFiltradas = transacoes.filter(t => 
    t.cliente_nome.toLowerCase().includes(filtro.toLowerCase()) || 
    t.descricao.toLowerCase().includes(filtro.toLowerCase()) ||
    t.cliente_cpf.includes(filtro)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            Auditoria & Ledger
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Log imutável de todas as transações financeiras para cruzamento com câmeras.
          </p>
        </div>
        <button onClick={carregarAuditoria} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm">
          <Activity className="w-4 h-4" /> Atualizar Tempo Real
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por nome, CPF ou descrição da compra..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            Carregando log de auditoria...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-medium">Horário Exato</th>
                  <th className="px-6 py-4 font-medium">Cliente</th>
                  <th className="px-6 py-4 font-medium">Ação (Descrição)</th>
                  <th className="px-6 py-4 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma transação encontrada no sistema.
                    </td>
                  </tr>
                ) : (
                  transacoesFiltradas.map((t) => {
                    const isCredito = t.tipo.includes('credito');
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded w-fit">
                            <Clock className="w-4 h-4 text-gray-500" />
                            {new Date(t.data).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 ml-1">{new Date(t.data).toLocaleDateString('pt-BR')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{t.cliente_nome}</div>
                          <div className="text-xs text-gray-500 font-mono">CPF: {t.cliente_cpf}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{t.descricao || 'Transação do Sistema'}</div>
                          <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">{t.tipo.replace('_', ' ')}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`text-sm font-semibold flex items-center justify-end gap-1 ${isCredito ? 'text-green-600' : 'text-red-600'}`}>
                            {isCredito ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            R$ {t.valor.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
