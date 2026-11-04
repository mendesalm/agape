import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import { 
  Building2, 
  Plus, 
  Search, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  Package, 
  ClipboardList, 
  Power, 
  X, 
  RefreshCw,
  Shield,
  Smartphone,
  Store,
  Copy,
  Check,
  Mail,
  Sparkles
} from 'lucide-react';

interface Estabelecimento {
  id: number;
  nome_fantasia: string;
  cnpj?: string;
  logo_url?: string;
  modo_operacao: 'honesty_market' | 'hibrido' | 'restrito';
  ativo: boolean;
  data_cadastro?: string;
  total_produtos: number;
  total_comandas: number;
  total_usuarios: number;
  faturamento_total: number;
  admin_nome?: string;
  admin_email?: string;
}

interface MetricasGlobais {
  total_estabelecimentos: number;
  total_estabelecimentos_ativos: number;
  total_estabelecimentos_bloqueados: number;
  total_produtos_cadastrados: number;
  total_comandas_abertas: number;
  total_clientes_cadastrados: number;
  faturamento_total_ecossistema: number;
}

export function Instancias() {
  const [estabelecimentos, setEstabelecimentos] = useState<Estabelecimento[]>([]);
  const [metricas, setMetricas] = useState<MetricasGlobais | null>(null);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'bloqueados'>('todos');

  // Modais
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false);
  const [estSelecionado, setEstSelecionado] = useState<Estabelecimento | null>(null);

  // Form Nova Instância
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [modoOperacao, setModoOperacao] = useState<'honesty_market' | 'hibrido' | 'restrito'>('honesty_market');
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Modal Sucesso Credenciais
  const [sucessoCredenciais, setSucessoCredenciais] = useState<{ email: string; senha: string; nome: string; bar: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const gerarSenhaAleatoria = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$";
    let s = "";
    for (let i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    setAdminSenha(s);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [resTenants, resMetricas] = await Promise.all([
        api.get('/tenants/'),
        api.get('/tenants/metricas-globais')
      ]);
      setEstabelecimentos(resTenants.data);
      setMetricas(resMetricas.data);
    } catch (error) {
      console.error("Erro ao carregar dados SaaS:", error);
    } finally {
      setLoading(false);
    }
  };

  const alternarStatusTenant = async (id: number, statusAtual: boolean, nome: string) => {
    const acao = statusAtual ? 'SUSPENDER/BLOQUEAR' : 'ATIVAR';
    const aviso = statusAtual 
      ? `Atenção: Ao suspender a instância "${nome}", todos os logins e operações deste bar serão bloqueados imediatamente (Kill-switch HTTP 402). Deseja prosseguir?`
      : `Deseja reativar a instância "${nome}"? O acesso dos operadores será restabelecido.`;

    if (!window.confirm(aviso)) return;

    try {
      await api.patch(`/tenants/${id}/status`, { ativo: !statusAtual });
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || `Erro ao ${acao.toLowerCase()} o estabelecimento.`);
    }
  };

  const handleCriarInstancia = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSalvando(true);
      await api.post('/tenants/', {
        nome_fantasia: nomeFantasia,
        cnpj: cnpj || undefined,
        logo_url: logoUrl || undefined,
        modo_operacao: modoOperacao,
        ativo: true,
        admin_nome: adminNome,
        admin_email: adminEmail,
        admin_senha: adminSenha
      });

      setIsModalNovoOpen(false);
      // Salva para exibir no modal de credenciais imediatas
      setSucessoCredenciais({
        nome: adminNome,
        email: adminEmail,
        senha: adminSenha,
        bar: nomeFantasia
      });
      setCopiado(false);

      // Limpa formulário
      setNomeFantasia('');
      setCnpj('');
      setLogoUrl('');
      setModoOperacao('honesty_market');
      setAdminNome('');
      setAdminEmail('');
      setAdminSenha('');
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao criar instância.");
    } finally {
      setSalvando(false);
    }
  };

  const handleEditarInstancia = async (e: FormEvent) => {
    e.preventDefault();
    if (!estSelecionado) return;
    try {
      setSalvando(true);
      await api.put(`/tenants/${estSelecionado.id}`, {
        nome_fantasia: estSelecionado.nome_fantasia,
        cnpj: estSelecionado.cnpj || undefined,
        logo_url: estSelecionado.logo_url || undefined,
        modo_operacao: estSelecionado.modo_operacao
      });
      setIsModalEditarOpen(false);
      setEstSelecionado(null);
      await carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao atualizar dados.");
    } finally {
      setSalvando(false);
    }
  };

  const estabelecimentosFiltrados = estabelecimentos.filter(est => {
    const matchTexto = est.nome_fantasia.toLowerCase().includes(termoBusca.toLowerCase()) ||
                       (est.cnpj && est.cnpj.includes(termoBusca)) ||
                       (est.admin_email && est.admin_email.toLowerCase().includes(termoBusca.toLowerCase()));
    
    if (filtroStatus === 'ativos') return matchTexto && est.ativo;
    if (filtroStatus === 'bloqueados') return matchTexto && !est.ativo;
    return matchTexto;
  });

  const getModoBadge = (modo: string) => {
    switch (modo) {
      case 'honesty_market':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full">
            <Smartphone size={12} /> Honesty Market
          </span>
        );
      case 'hibrido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold rounded-full">
            <Store size={12} /> Híbrido (KDS + App)
          </span>
        );
      case 'restrito':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold rounded-full">
            <Shield size={12} /> Restrito (Balcão)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="text-indigo-600 w-8 h-8" />
            Gestão de Lojas & Salões de Ágapes (e-Sigma)
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Sincronize Lojas do banco lojas_db, provisione Salões de Ágapes e gerencie os Mestres de Banquetes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={carregarDados}
            className="p-2.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={async () => {
              try {
                const res = await api.post('/esigma/sincronizar-lojas');
                alert(res.data.mensagem);
                await carregarDados();
              } catch (err: any) {
                alert(err.response?.data?.detail || 'Erro ao sincronizar Lojas do lojas_db.');
              }
            }}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            <Sparkles size={16} />
            <span>Importar Lojas do e-Sigma</span>
          </button>

          <button 
            onClick={() => setIsModalNovoOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 transition-all shadow-indigo-500/20"
          >
            <Plus size={18} />
            <span>Provisionar Nova Loja</span>
          </button>
        </div>
      </div>

      {/* Métricas do Ecossistema SaaS */}
      {metricas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Instâncias Ativas</span>
              <div className="text-3xl font-black text-gray-900 mt-1">
                {metricas.total_estabelecimentos_ativos} <span className="text-xs font-normal text-gray-500">/ {metricas.total_estabelecimentos} total</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> {((metricas.total_estabelecimentos_ativos / (metricas.total_estabelecimentos || 1)) * 100).toFixed(0)}% operacionais
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Building2 size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Faturamento Ecossistema</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">
                R$ {metricas.faturamento_total_ecossistema.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-gray-500 font-medium mt-1">
                Volume transacionado em comandas
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Base Global de Clientes</span>
              <div className="text-3xl font-black text-gray-900 mt-1">
                {metricas.total_clientes_cadastrados}
              </div>
              <div className="text-[11px] text-blue-600 font-medium mt-1">
                CPFs compartilhados entre as instâncias
              </div>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Produtos & Comandas</span>
              <div className="text-3xl font-black text-gray-900 mt-1">
                {metricas.total_produtos_cadastrados} <span className="text-xs font-normal text-gray-500">itens</span>
              </div>
              <div className="text-[11px] text-amber-600 font-semibold mt-1">
                {metricas.total_comandas_abertas} comandas abertas agora
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Package size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            placeholder="Buscar por nome do bar, CNPJ ou email..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setFiltroStatus('todos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroStatus === 'todos' ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todos ({estabelecimentos.length})
          </button>
          <button 
            onClick={() => setFiltroStatus('ativos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroStatus === 'ativos' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Ativos ({estabelecimentos.filter(e=>e.ativo).length})
          </button>
          <button 
            onClick={() => setFiltroStatus('bloqueados')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroStatus === 'bloqueados' ? 'bg-rose-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Bloqueados ({estabelecimentos.filter(e=>!e.ativo).length})
          </button>
        </div>
      </div>

      {/* Tabela de Instâncias */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500 tracking-wider">
              <tr>
                <th className="p-4">Instância / Bar</th>
                <th className="p-4">Modo de Operação</th>
                <th className="p-4">Proprietário (Webmaster)</th>
                <th className="p-4 text-center">Itens / Comandas</th>
                <th className="p-4 text-right">Faturamento Total</th>
                <th className="p-4 text-center">Status (SaaS)</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Carregando instâncias do sistema...
                  </td>
                </tr>
              ) : estabelecimentosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Nenhuma instância encontrada para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                estabelecimentosFiltrados.map(est => (
                  <tr key={est.id} className="hover:bg-gray-50/70 transition-colors">
                    
                    {/* Nome & Logo */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {est.logo_url ? (
                          <img src={est.logo_url} alt={est.nome_fantasia} className="w-10 h-10 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black border border-blue-100">
                            {est.nome_fantasia.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-gray-900">{est.nome_fantasia}</div>
                          <div className="text-xs text-gray-400 font-mono">
                            {est.cnpj || 'CNPJ não informado'} • ID #{est.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Modo */}
                    <td className="p-4">
                      {getModoBadge(est.modo_operacao)}
                    </td>

                    {/* Dono */}
                    <td className="p-4">
                      <div className="text-xs font-semibold text-gray-800">{est.admin_nome || 'Webmaster'}</div>
                      <div className="text-xs text-gray-400">{est.admin_email || '---'}</div>
                    </td>

                    {/* Estatísticas */}
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-3 text-xs text-gray-600">
                        <span title="Produtos cadastrados" className="flex items-center gap-1 font-semibold">
                          <Package size={13} className="text-gray-400" /> {est.total_produtos}
                        </span>
                        <span title="Comandas totais" className="flex items-center gap-1 font-semibold">
                          <ClipboardList size={13} className="text-gray-400" /> {est.total_comandas}
                        </span>
                      </div>
                    </td>

                    {/* Faturamento */}
                    <td className="p-4 text-right">
                      <div className="font-black text-gray-900 text-sm">
                        R$ {est.faturamento_total.toFixed(2)}
                      </div>
                    </td>

                    {/* Status e Kill-switch */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => alternarStatusTenant(est.id, est.ativo, est.nome_fantasia)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                          est.ativo 
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800 hover:border-rose-300' 
                            : 'bg-rose-100 text-rose-800 hover:bg-emerald-100 hover:text-emerald-800 hover:border-emerald-300'
                        }`}
                        title={est.ativo ? "Clique para suspender o bar" : "Clique para reativar"}
                      >
                        <Power size={12} />
                        <span>{est.ativo ? 'Ativo' : 'Suspenso'}</span>
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setEstSelecionado(est); setIsModalEditarOpen(true); }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Editar
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: PROVISIONAR NOVO BAR / TENANT */}
      {/* ============================================================== */}
      {isModalNovoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-blue-50/50">
              <div>
                <h3 className="text-lg font-extrabold text-blue-950 flex items-center gap-2">
                  <Building2 className="text-blue-600" size={22} />
                  Provisionar Nova Instância (Bar / Tenant)
                </h3>
                <p className="text-xs text-blue-600/80">Cria a instância com isolamento de dados e gera o usuário Webmaster proprietário.</p>
              </div>
              <button onClick={() => setIsModalNovoOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleCriarInstancia} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="space-y-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">1. Dados do Estabelecimento</span>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Fantasia do Bar *</label>
                  <input 
                    type="text" 
                    required 
                    value={nomeFantasia} 
                    onChange={e => setNomeFantasia(e.target.value)} 
                    placeholder="Ex: Bar do Zé ou Honesty Lounge" 
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CNPJ (Opcional)</label>
                    <input 
                      type="text" 
                      value={cnpj} 
                      onChange={e => setCnpj(e.target.value)} 
                      placeholder="00.000.000/0000-00" 
                      className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Modo de Operação *</label>
                    <select 
                      value={modoOperacao} 
                      onChange={e => setModoOperacao(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="honesty_market">Honesty Market (Livre)</option>
                      <option value="hibrido">Híbrido (App + KDS + Balcão)</option>
                      <option value="restrito">Restrito (Balcão Tradicional)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL do Logotipo (Opcional)</label>
                  <input 
                    type="url" 
                    value={logoUrl} 
                    onChange={e => setLogoUrl(e.target.value)} 
                    placeholder="https://meusite.com/logo.png" 
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">2. Administrador Proprietário (Webmaster)</span>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo do Dono *</label>
                  <input 
                    type="text" 
                    required 
                    value={adminNome} 
                    onChange={e => setAdminNome(e.target.value)} 
                    placeholder="Ex: Carlos Oliveira" 
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail de Login *</label>
                    <input 
                      type="email" 
                      required 
                      value={adminEmail} 
                      onChange={e => setAdminEmail(e.target.value)} 
                      placeholder="carlos@bar.com" 
                      className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-gray-700 uppercase">Senha Inicial *</label>
                      <button 
                        type="button" 
                        onClick={gerarSenhaAleatoria}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Gerar Senha
                      </button>
                    </div>
                    <input 
                      type="text" 
                      required 
                      value={adminSenha} 
                      onChange={e => setAdminSenha(e.target.value)} 
                      placeholder="••••••••" 
                      className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-mono" 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalNovoOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm">
                  {salvando ? 'Provisionando...' : 'Criar Instância'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDITAR INSTÂNCIA */}
      {/* ============================================================== */}
      {isModalEditarOpen && estSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900">Editar Instância #{estSelecionado.id}</h3>
              <button onClick={() => setIsModalEditarOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleEditarInstancia} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Fantasia *</label>
                <input 
                  type="text" 
                  required 
                  value={estSelecionado.nome_fantasia} 
                  onChange={e => setEstSelecionado({ ...estSelecionado, nome_fantasia: e.target.value })} 
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CNPJ</label>
                <input 
                  type="text" 
                  value={estSelecionado.cnpj || ''} 
                  onChange={e => setEstSelecionado({ ...estSelecionado, cnpj: e.target.value })} 
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Modo de Operação</label>
                <select 
                  value={estSelecionado.modo_operacao} 
                  onChange={e => setEstSelecionado({ ...estSelecionado, modo_operacao: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="honesty_market">Honesty Market (Livre)</option>
                  <option value="hibrido">Híbrido (App + KDS + Balcão)</option>
                  <option value="restrito">Restrito (Balcão Tradicional)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">URL do Logotipo</label>
                <input 
                  type="url" 
                  value={estSelecionado.logo_url || ''} 
                  onChange={e => setEstSelecionado({ ...estSelecionado, logo_url: e.target.value })} 
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalEditarOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm">
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CREDENCIAIS DA INSTÂNCIA CRIADA COM SUCESSO */}
      {/* ============================================================== */}
      {sucessoCredenciais && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 bg-emerald-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-extrabold text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-600" size={22} />
                  Bar Provisionado com Sucesso!
                </h3>
                <p className="text-xs text-emerald-700">Acesso liberado para a instância <strong>{sucessoCredenciais.bar}</strong>.</p>
              </div>
              <button onClick={() => setSucessoCredenciais(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 font-mono text-xs">
                <div>
                  <span className="text-gray-400 block font-sans text-[10px] uppercase font-bold">Nome do Administrador</span>
                  <span className="font-bold text-gray-800 text-sm">{sucessoCredenciais.nome}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-sans text-[10px] uppercase font-bold">E-mail de Login</span>
                  <span className="font-bold text-blue-600 text-sm select-all">{sucessoCredenciais.email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-sans text-[10px] uppercase font-bold">Senha de Acesso</span>
                  <span className="font-bold text-emerald-700 text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 select-all">
                    {sucessoCredenciais.senha}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <Mail size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  Uma notificação de boas-vindas com estas credenciais foi disparada pelo serviço de e-mail do sistema.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const texto = `BipFy SaaS - Credenciais de Acesso:\nBar: ${sucessoCredenciais.bar}\nLogin: ${sucessoCredenciais.email}\nSenha: ${sucessoCredenciais.senha}\nURL: ${window.location.origin}/login`;
                    navigator.clipboard.writeText(texto);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 3000);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    copiado 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {copiado ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiado ? 'Credenciais Copiadas!' : 'Copiar Acesso'}</span>
                </button>

                <button 
                  type="button" 
                  onClick={() => setSucessoCredenciais(null)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
