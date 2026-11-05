import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Search, 
  Clock, 
  ArrowDownRight, 
  ArrowUpRight, 
  Boxes, 
  AlertTriangle, 
  User, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Wallet,
  TrendingDown
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
}

interface MovimentacaoAudit {
  id: number;
  data_hora: string;
  tipo: string;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  local_origem?: string;
  local_destino?: string;
  motivo?: string;
  operador_nome?: string;
  cliente_nome?: string;
  cliente_documento?: string;
  forma_pagamento?: string;
  tipo_perda?: string;
  justificativa_perda?: string;
  preco_custo_unitario?: number;
  preco_venda_unitario?: number;
  custo_total_perda?: number;
  valor_total?: number;
}

export function Auditoria() {
  const [abaAtiva, setAbaAtiva] = useState<'estoque' | 'financeiro'>('estoque');
  
  // Dados de Auditoria de Estoque
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoAudit[]>([]);
  const [loadingEstoque, setLoadingEstoque] = useState(true);
  
  // Dados de Auditoria de Carteira / Ledger
  const [transacoes, setTransacoes] = useState<TransacaoAudit[]>([]);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);

  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroTipoEstoque, setFiltroTipoEstoque] = useState<string>('todos');

  useEffect(() => {
    carregarAuditoriaEstoque();
    carregarAuditoriaFinanceira();
  }, []);

  const carregarAuditoriaEstoque = async () => {
    try {
      setLoadingEstoque(true);
      const res = await api.get('/financeiro/auditoria-estoque');
      setMovimentacoes(res.data);
    } catch (err) {
      console.error("Erro ao carregar auditoria de estoque", err);
    } finally {
      setLoadingEstoque(false);
    }
  };

  const carregarAuditoriaFinanceira = async () => {
    try {
      setLoadingFinanceiro(true);
      const res = await api.get('/financeiro/auditoria');
      setTransacoes(res.data);
    } catch (err) {
      console.error("Erro ao carregar auditoria financeira", err);
    } finally {
      setLoadingFinanceiro(false);
    }
  };

  const atualizarTudo = () => {
    carregarAuditoriaEstoque();
    carregarAuditoriaFinanceira();
  };

  // Filtragem de Estoque
  const movimentacoesFiltradas = movimentacoes.filter(m => {
    const termo = filtroTexto.toLowerCase();
    const bateTexto = 
      m.produto_nome.toLowerCase().includes(termo) ||
      (m.cliente_nome && m.cliente_nome.toLowerCase().includes(termo)) ||
      (m.operador_nome && m.operador_nome.toLowerCase().includes(termo)) ||
      (m.justificativa_perda && m.justificativa_perda.toLowerCase().includes(termo)) ||
      (m.motivo && m.motivo.toLowerCase().includes(termo));

    if (!bateTexto) return false;

    if (filtroTipoEstoque === 'vendas') {
      return m.tipo === 'saida_venda';
    }
    if (filtroTipoEstoque === 'perdas') {
      return m.tipo === 'perda_quebra' || !!m.tipo_perda;
    }
    if (filtroTipoEstoque === 'entradas') {
      return m.tipo.includes('entrada') || m.tipo.includes('compra');
    }
    return true;
  });

  // Filtragem Financeira
  const transacoesFiltradas = transacoes.filter(t => 
    t.cliente_nome.toLowerCase().includes(filtroTexto.toLowerCase()) || 
    t.descricao.toLowerCase().includes(filtroTexto.toLowerCase()) ||
    t.cliente_cpf.includes(filtroTexto)
  );

  const getFormaPagamentoBadge = (fp?: string) => {
    if (!fp) return <span className="text-gray-400">-</span>;
    const f = fp.toLowerCase();
    if (f.includes('pix')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">
          <QrCode size={13} /> PIX
        </span>
      );
    }
    if (f.includes('dinheiro')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">
          <DollarSign size={13} /> Dinheiro
        </span>
      );
    }
    if (f.includes('cartao_debito')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">
          <CreditCard size={13} /> Débito
        </span>
      );
    }
    if (f.includes('cartao_credito') || f.includes('cartao')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg">
          <CreditCard size={13} /> Crédito
        </span>
      );
    }
    if (f.includes('saldo') || f.includes('fiado')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg">
          <Wallet size={13} /> Saldo/Fiado Bar
        </span>
      );
    }
    return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded">{fp}</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Topo da Página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            Auditoria & Histórico Perpétuo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Rastreabilidade integral de estoque, entradas, saídas, perdas e transações do Bar com data/hora.
          </p>
        </div>

        {/* Botão de Atualização com Ergonomia Sênior (min-h-[44px]) */}
        <button 
          onClick={atualizarTudo} 
          className="min-h-[44px] bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all active:scale-98"
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Atualizar Tempo Real</span>
        </button>
      </div>

      {/* Navegação por Abas Ergonômicas (min-h-[44px]) */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
        <button
          onClick={() => setAbaAtiva('estoque')}
          className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            abaAtiva === 'estoque'
              ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Movimentações de Estoque & Perdas</span>
          <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-extrabold">
            {movimentacoes.length}
          </span>
        </button>

        <button
          onClick={() => setAbaAtiva('financeiro')}
          className={`flex-1 min-h-[44px] py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            abaAtiva === 'financeiro'
              ? 'bg-white text-blue-700 shadow-sm border border-gray-200'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Ledger & Caixa do Bar (Isolado)</span>
          <span className="ml-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[11px] font-extrabold">
            {transacoes.length}
          </span>
        </button>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder={
              abaAtiva === 'estoque'
                ? "Buscar por produto, obreiro, operador, justificativa de perda..."
                : "Buscar por cliente, CPF ou descrição do pagamento..."
            }
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[44px]"
          />
        </div>

        {abaAtiva === 'estoque' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFiltroTipoEstoque('todos')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filtroTipoEstoque === 'todos'
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipoEstoque('vendas')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filtroTipoEstoque === 'vendas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Apenas Vendas
            </button>
            <button
              onClick={() => setFiltroTipoEstoque('perdas')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filtroTipoEstoque === 'perdas'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
              }`}
            >
              Apenas Perdas
            </button>
            <button
              onClick={() => setFiltroTipoEstoque('entradas')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                filtroTipoEstoque === 'entradas'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
              }`}
            >
              Entradas de Lote
            </button>
          </div>
        )}
      </div>

      {/* Conteúdo da Aba 1: Movimentações de Estoque & Perdas */}
      {abaAtiva === 'estoque' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingEstoque ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              Carregando auditoria de movimentações...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider font-bold border-b border-gray-200">
                    <th className="px-5 py-4">Data/Hora Exata</th>
                    <th className="px-5 py-4">Tipo da Operação</th>
                    <th className="px-5 py-4">Produto & Quantidade</th>
                    <th className="px-5 py-4">Cliente / Destinatário</th>
                    <th className="px-5 py-4">Operador Balcão</th>
                    <th className="px-5 py-4">Forma Pagto / Perda</th>
                    <th className="px-5 py-4 text-right">Valor / Custo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {movimentacoesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">
                        Nenhuma movimentação de estoque encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    movimentacoesFiltradas.map((m) => {
                      const isPerda = m.tipo === 'perda_quebra' || !!m.tipo_perda;
                      const isVenda = m.tipo === 'saida_venda';
                      const isEntrada = m.tipo.includes('entrada');

                      return (
                        <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                          
                          {/* Data e Hora Exata */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono text-gray-900 font-bold bg-gray-100 px-2 py-1 rounded-lg w-fit">
                              <Clock size={13} className="text-gray-500" />
                              {new Date(m.data_hora).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 ml-1">
                              {new Date(m.data_hora).toLocaleDateString('pt-BR')}
                            </div>
                          </td>

                          {/* Tipo */}
                          <td className="px-5 py-3.5">
                            {isPerda ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-900 rounded-full font-bold text-[11px]">
                                <AlertTriangle size={12} className="text-orange-600" /> Perda / Quebra
                              </span>
                            ) : isVenda ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-full font-bold text-[11px]">
                                <ArrowDownRight size={13} className="text-emerald-700" /> Venda / Consumo
                              </span>
                            ) : isEntrada ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 rounded-full font-bold text-[11px]">
                                <ArrowUpRight size={13} className="text-blue-700" /> Entrada de Lote
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px]">
                                {m.tipo.replace('_', ' ')}
                              </span>
                            )}
                          </td>

                          {/* Produto & Quantidade */}
                          <td className="px-5 py-3.5">
                            <div className="font-extrabold text-gray-900 text-sm">
                              {m.quantidade < 0 ? `${Math.abs(m.quantidade)}x` : `${m.quantidade}x`} {m.produto_nome}
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {m.motivo || `Local: ${m.local_origem || '-'} → ${m.local_destino || '-'}`}
                            </div>
                          </td>

                          {/* Cliente */}
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-800 flex items-center gap-1">
                              <User size={13} className="text-blue-600" />
                              <span>{m.cliente_nome || '-'}</span>
                            </div>
                            {m.cliente_documento && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                CIM/CPF: {m.cliente_documento}
                              </div>
                            )}
                          </td>

                          {/* Operador */}
                          <td className="px-5 py-3.5">
                            <span className="font-medium text-gray-700">{m.operador_nome || 'Balcão'}</span>
                          </td>

                          {/* Forma de Pagamento ou Detalhes da Perda */}
                          <td className="px-5 py-3.5">
                            {isPerda ? (
                              <div>
                                <span className="font-bold text-orange-800 uppercase tracking-wide text-[10px] bg-orange-100 px-2 py-0.5 rounded">
                                  {m.tipo_perda || 'Quebra'}
                                </span>
                                <p className="text-[11px] text-gray-500 mt-1 max-w-xs truncate" title={m.justificativa_perda || m.motivo}>
                                  {m.justificativa_perda || m.motivo || 'Sem justificativa'}
                                </p>
                              </div>
                            ) : (
                              getFormaPagamentoBadge(m.forma_pagamento)
                            )}
                          </td>

                          {/* Valor Total ou Prejuízo da Perda */}
                          <td className="px-5 py-3.5 text-right font-mono">
                            {isPerda ? (
                              <div className="text-orange-700 font-extrabold text-sm flex items-center justify-end gap-1">
                                <TrendingDown size={14} />
                                -R$ {(m.custo_total_perda || 0).toFixed(2)}
                              </div>
                            ) : m.valor_total && m.valor_total > 0 ? (
                              <div className="text-emerald-700 font-extrabold text-sm">
                                R$ {m.valor_total.toFixed(2)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
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
      )}

      {/* Conteúdo da Aba 2: Ledger Financeiro (Caixa do Bar) */}
      {abaAtiva === 'financeiro' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loadingFinanceiro ? (
            <div className="p-16 text-center text-gray-400 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              Carregando ledger do Bar...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 uppercase tracking-wider font-bold border-b border-gray-200">
                    <th className="px-5 py-4">Horário Exato</th>
                    <th className="px-5 py-4">Cliente / Irmão</th>
                    <th className="px-5 py-4">Descrição da Ação</th>
                    <th className="px-5 py-4 text-right">Valor Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transacoesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">
                        Nenhuma transação financeira registrada no caixa do Bar.
                      </td>
                    </tr>
                  ) : (
                    transacoesFiltradas.map((t) => {
                      const isCredito = t.tipo.includes('credito') || t.tipo.includes('recarga');
                      return (
                        <tr key={t.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-gray-900 font-mono font-bold bg-gray-100 px-2 py-1 rounded-lg w-fit">
                              <Clock size={13} className="text-gray-500" />
                              {new Date(t.data).toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 ml-1">
                              {new Date(t.data).toLocaleDateString('pt-BR')}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-gray-900 text-sm">{t.cliente_nome}</div>
                            <div className="text-[11px] text-gray-400 font-mono">CPF: {t.cliente_cpf}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-gray-800 text-sm">{t.descricao || 'Operação no Caixa do Bar'}</div>
                            <div className="text-[11px] text-gray-400 uppercase tracking-wider mt-0.5">
                              {t.tipo.replace('_', ' ')}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right font-mono">
                            <div className={`font-black text-sm flex items-center justify-end gap-1 ${isCredito ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {isCredito ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
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
      )}

    </div>
  );
}
