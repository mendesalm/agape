import { useState, useEffect, type FormEvent } from 'react';
import {
  Users, UserPlus, Shield, Search, CheckCircle2, XCircle,
  HeartHandshake, BadgeCheck, QrCode, Sparkles, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { api } from '../services/api';

interface Operador {
  id: number;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  cargo: string;
  tipo_vinculo: string;
  familiar_esigma_id?: number;
  obreiro_responsavel_id?: number;
  ativo: boolean;
}

interface FamiliarDisponivel {
  familiar_id: number;
  nome_familiar: string;
  tipo_relacionamento?: string;
  email?: string;
  telefone?: string;
  obreiro_id: number;
  nome_obreiro: string;
  cim_obreiro?: string;
}

interface ConsumidorSanitizado {
  cliente_id: number;
  nome: string;
  cpf_mascarado: string;
  cim?: string;
  tipo_consumidor: string;
  nome_loja_origem?: string;
  nome_irmao_responsavel?: string;
  identificador_qr: string;
  comanda_aberta_id?: number;
  saldo_carteira: number;
}

export function EquipeAgape() {
  const [abaAtiva, setAbaAtiva] = useState<'operadores' | 'consumidores'>('operadores');

  // Estado: Operadores
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loadingOp, setLoadingOp] = useState(true);
  const [modalNovoOp, setModalNovoOp] = useState(false);

  // Busca de Familiares no lojas_db para preencher Operador
  const [buscaFamiliar, setBuscaFamiliar] = useState('');
  const [familiaresEncontrados, setFamiliaresEncontrados] = useState<FamiliarDisponivel[]>([]);

  // Form Novo Operador
  const [opTipoVinculo, setOpTipoVinculo] = useState<'FAMILIAR_LOJA' | 'CONTRATADO_EXTERNO' | 'OFICIAL_LOJA'>('FAMILIAR_LOJA');
  const [opNome, setOpNome] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opSenha, setOpSenha] = useState('');
  const [opCpf, setOpCpf] = useState('');
  const [opTelefone, setOpTelefone] = useState('');
  const [opCargo, setOpCargo] = useState<'OPERADOR_BALCAO' | 'GARCOM' | 'WEBMASTER'>('OPERADOR_BALCAO');
  const [opFamiliarId, setOpFamiliarId] = useState<number | undefined>(undefined);
  const [opObreiroId, setOpObreiroId] = useState<number | undefined>(undefined);

  // Estado: Reconhecimento por CIM/CPF e Cadastro de Familiar/Convidado Consumidor
  const [termoBuscaCimCpf, setTermoBuscaCimCpf] = useState('');
  const [consumidorEncontrado, setConsumidorEncontrado] = useState<ConsumidorSanitizado | null>(null);
  const [erroBuscaConsumidor, setErroBuscaConsumidor] = useState('');
  const [buscandoConsumidor, setBuscandoConsumidor] = useState(false);

  // Form Cadastro Cliente Não Maçom (Familiar / Convidado)
  const [cliNome, setCliNome] = useState('');
  const [cliCpf, setCliCpf] = useState('');
  const [cliTelefone, setCliTelefone] = useState('');
  const [cliEmail, setCliEmail] = useState('');
  const [cliTipo, setCliTipo] = useState<'FAMILIAR' | 'CONVIDADO_NAO_MACOM'>('FAMILIAR');
  const [cliCimResponsavel, setCliCimResponsavel] = useState('');
  const [salvandoCli, setSalvandoCli] = useState(false);

  useEffect(() => {
    carregarOperadores();
  }, []);

  const carregarOperadores = async () => {
    try {
      setLoadingOp(true);
      const res = await api.get('/esigma/operadores');
      setOperadores(res.data);
    } catch (err) {
      console.error('Erro ao carregar operadores do Ágape:', err);
    } finally {
      setLoadingOp(false);
    }
  };

  const pesquisarFamiliaresNoBanco = async () => {
    try {
      const res = await api.get('/esigma/familiares-disponiveis', {
        params: { busca: buscaFamiliar }
      });
      setFamiliaresEncontrados(res.data);
    } catch (err) {
      console.error('Erro ao buscar familiares:', err);
    }
  };

  const selecionarFamiliarParaOperador = (f: FamiliarDisponivel) => {
    setOpTipoVinculo('FAMILIAR_LOJA');
    setOpNome(f.nome_familiar);
    setOpEmail(f.email || '');
    setOpTelefone(f.telefone || '');
    setOpFamiliarId(f.familiar_id);
    setOpObreiroId(f.obreiro_id);
  };

  const salvarNovoOperador = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/esigma/operadores', {
        nome: opNome,
        email: opEmail,
        senha: opSenha,
        cpf: opCpf || null,
        telefone: opTelefone || null,
        cargo: opCargo,
        tipo_vinculo: opTipoVinculo,
        familiar_esigma_id: opFamiliarId,
        obreiro_responsavel_id: opObreiroId
      });
      setModalNovoOp(false);
      setOpNome('');
      setOpEmail('');
      setOpSenha('');
      setOpCpf('');
      setOpTelefone('');
      setOpFamiliarId(undefined);
      setOpObreiroId(undefined);
      await carregarOperadores();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar operador.');
    }
  };

  const alternarStatusOperador = async (op: Operador) => {
    try {
      await api.patch(`/esigma/operadores/${op.id}/status`, null, {
        params: { ativo: !op.ativo }
      });
      await carregarOperadores();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao alterar status.');
    }
  };

  const buscarPorCimOuCpf = async (e: FormEvent) => {
    e.preventDefault();
    if (!termoBuscaCimCpf.trim()) return;
    setBuscandoConsumidor(true);
    setErroBuscaConsumidor('');
    setConsumidorEncontrado(null);
    try {
      const res = await api.get('/esigma/identificar-consumidor', {
        params: { identificador: termoBuscaCimCpf.trim(), abrir_comanda_se_nao_existir: false }
      });
      setConsumidorEncontrado(res.data);
    } catch (err: any) {
      setErroBuscaConsumidor(err.response?.data?.detail || 'Consumidor não localizado.');
    } finally {
      setBuscandoConsumidor(false);
    }
  };

  const cadastrarConsumidorNaoMacom = async (e: FormEvent) => {
    e.preventDefault();
    setSalvandoCli(true);
    try {
      const res = await api.post('/esigma/clientes-nao-macons', {
        nome: cliNome,
        cpf: cliCpf,
        telefone: cliTelefone || null,
        email: cliEmail || null,
        tipo_consumidor: cliTipo,
        cim_ou_cpf_irmao_responsavel: cliCimResponsavel || null,
        abrir_comanda_imediata: true
      });
      setConsumidorEncontrado(res.data);
      setCliNome('');
      setCliCpf('');
      setCliTelefone('');
      setCliEmail('');
      setCliCimResponsavel('');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar familiar/convidado.');
    } finally {
      setSalvandoCli(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield size={14} /> Segurança & Isolamento Maçônico (lojas_db)
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Operadores do Balcão & Consumidores do Ágape
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gerencie atendentes não maçons (familiares ou garçons contratados) com acesso isolado e reconheça Irmãos por CIM/CPF.
          </p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setAbaAtiva('operadores')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'operadores' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            Operadores do Balcão ({operadores.length})
          </button>
          <button
            onClick={() => setAbaAtiva('consumidores')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              abaAtiva === 'consumidores' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'
            }`}
          >
            Reconhecimento CIM/CPF & Familiares
          </button>
        </div>
      </div>

      {abaAtiva === 'operadores' ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" /> Equipe de Operação do Salão de Ágapes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Operadores com cargo <strong>Balcão / Garçom</strong> acessam apenas vendas e estoque — sem acesso aos dados maçônicos da Loja.
              </p>
            </div>
            <button
              onClick={() => setModalNovoOp(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <UserPlus size={16} /> Cadastrar Operador / Familiar
            </button>
          </div>

          {loadingOp ? (
            <div className="p-12 text-center text-gray-400 text-sm">Carregando operadores...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold uppercase text-gray-500 border-b border-gray-100">
                    <th className="py-3.5 px-6">Nome / E-mail</th>
                    <th className="py-3.5 px-6">Vínculo com a Loja</th>
                    <th className="py-3.5 px-6">Função no Ágape</th>
                    <th className="py-3.5 px-6">Acesso Hoje</th>
                    <th className="py-3.5 px-6 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {operadores.map((op) => (
                    <tr key={op.id} className="hover:bg-gray-50/70">
                      <td className="py-4 px-6">
                        <div className="font-bold text-gray-900">{op.nome}</div>
                        <div className="text-xs text-gray-500">{op.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        {op.tipo_vinculo === 'FAMILIAR_LOJA' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-pink-50 text-pink-700 border border-pink-200">
                            <HeartHandshake size={12} /> Familiar de Maçom
                          </span>
                        ) : op.tipo_vinculo === 'CONTRATADO_EXTERNO' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Contratado Externo (Não Maçom)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <BadgeCheck size={12} /> Oficial da Loja / Sistema
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-700">
                          {op.cargo}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {op.ativo ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                            <CheckCircle2 size={14} /> Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-500">
                            <XCircle size={14} /> Desativado
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {op.cargo !== 'SUPERADMIN' && (
                          <button
                            onClick={() => alternarStatusOperador(op)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              op.ativo
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {op.ativo ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            {op.ativo ? 'Bloquear Turno' : 'Liberar Turno'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Busca Instantânea por CIM ou CPF (obreiros / visitantes / familiares) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                Integração Direta com Tabelas `obreiros` e `visitantes`
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                Reconhecer Consumidor por CIM ou CPF
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Digite o <strong>CIM</strong> ou <strong>CPF</strong> de um Irmão do Quadro ou Visitante para sincronizá-lo automaticamente com o Ágape e gerar o QR Code dele.
              </p>
            </div>

            <form onSubmit={buscarPorCimOuCpf} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={termoBuscaCimCpf}
                  onChange={(e) => setTermoBuscaCimCpf(e.target.value)}
                  placeholder="Digite o CIM ou CPF do Irmão/Familiar..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={buscandoConsumidor}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {buscandoConsumidor ? 'Buscando...' : 'Identificar'}
              </button>
            </form>

            {erroBuscaConsumidor && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                {erroBuscaConsumidor}
              </div>
            )}

            {consumidorEncontrado && (
              <div className="p-5 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-3 rounded-xl shrink-0">
                  <QRCode value={consumidorEncontrado.identificador_qr} size={110} />
                </div>
                <div className="space-y-1.5 text-center sm:text-left">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    {consumidorEncontrado.tipo_consumidor}
                  </span>
                  <h3 className="text-lg font-extrabold">{consumidorEncontrado.nome}</h3>
                  <p className="text-xs text-slate-300 font-mono">
                    {consumidorEncontrado.cim ? `CIM: ${consumidorEncontrado.cim} • ` : ''}
                    DOC: {consumidorEncontrado.cpf_mascarado}
                  </p>
                  {consumidorEncontrado.nome_loja_origem && (
                    <p className="text-xs text-amber-300">Loja de Origem: {consumidorEncontrado.nome_loja_origem}</p>
                  )}
                  {consumidorEncontrado.nome_irmao_responsavel && (
                    <p className="text-xs text-pink-300">Irmão Responsável: {consumidorEncontrado.nome_irmao_responsavel}</p>
                  )}
                  <p className="text-[11px] font-mono text-emerald-400 pt-1">
                    QR Tag: {consumidorEncontrado.identificador_qr}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Coluna 2: Cadastro de Cliente Não Maçom (Familiar de Maçom / Convidado em Sessão Branca) */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600">
                Sessões Brancas, Festas & Cunhadas/Sobrinhos
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                Cadastrar Consumidor Não Maçom no Ágape
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Cadastra familiares ou convidados diretamente em <code className="bg-gray-100 px-1 rounded">agape_clientes</code> sem misturar com o Quadro de Obreiros da Loja.
              </p>
            </div>

            <form onSubmit={cadastrarConsumidorNaoMacom} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Categoria</label>
                  <select
                    value={cliTipo}
                    onChange={(e) => setCliTipo(e.target.value as 'FAMILIAR' | 'CONVIDADO_NAO_MACOM')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="FAMILIAR">Familiar de Maçom (Cunhada/Sobrinho)</option>
                    <option value="CONVIDADO_NAO_MACOM">Convidado Externo (Não Maçom)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CPF do Familiar/Convidado *</label>
                  <input
                    type="text"
                    required
                    value={cliCpf}
                    onChange={(e) => setCliCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={cliNome}
                  onChange={(e) => setCliNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={cliTelefone}
                    onChange={(e) => setCliTelefone(e.target.value)}
                    placeholder="(00) 90000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CIM ou CPF do Irmão Anfitrião</label>
                  <input
                    type="text"
                    value={cliCimResponsavel}
                    onChange={(e) => setCliCimResponsavel(e.target.value)}
                    placeholder="Opcional (vincula ao Irmão)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={salvandoCli}
                className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2"
              >
                <QrCode size={16} />
                {salvandoCli ? 'Cadastrando...' : 'Cadastrar no Ágape & Gerar QR Code'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Operador (Familiar de Maçom ou Contratado Externo) */}
      {modalNovoOp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 bg-indigo-950 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base">Novo Operador do Salão de Ágapes</h3>
                <p className="text-xs text-indigo-200">Acesso estritamente isolado aos recursos do Ágape</p>
              </div>
              <button onClick={() => setModalNovoOp(false)} className="text-indigo-200 hover:text-white text-sm font-bold">✕</button>
            </div>

            <div className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Seletor de Vínculo */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOpTipoVinculo('FAMILIAR_LOJA')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                    opTipoVinculo === 'FAMILIAR_LOJA'
                      ? 'border-pink-500 bg-pink-50 text-pink-800'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Familiar de Maçom
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpTipoVinculo('CONTRATADO_EXTERNO');
                    setOpFamiliarId(undefined);
                    setOpObreiroId(undefined);
                  }}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                    opTipoVinculo === 'CONTRATADO_EXTERNO'
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Garçom / Externo
                </button>
                <button
                  type="button"
                  onClick={() => setOpTipoVinculo('OFICIAL_LOJA')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all ${
                    opTipoVinculo === 'OFICIAL_LOJA'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  Oficial da Loja
                </button>
              </div>

              {/* Se for Familiar de Maçom, permite buscar direto da tabela 'familiares' do lojas_db */}
              {opTipoVinculo === 'FAMILIAR_LOJA' && (
                <div className="p-3.5 rounded-xl bg-pink-50/70 border border-pink-200 space-y-2">
                  <div className="text-xs font-bold text-pink-900 flex items-center gap-1.5">
                    <Sparkles size={14} /> Importar da tabela `familiares` do e-Sigma (Opcional)
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={buscaFamiliar}
                      onChange={(e) => setBuscaFamiliar(e.target.value)}
                      placeholder="Nome da Cunhada/Sobrinho ou nome/CIM do Irmão..."
                      className="flex-1 px-3 py-1.5 bg-white border border-pink-200 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={pesquisarFamiliaresNoBanco}
                      className="px-3 py-1.5 bg-pink-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Buscar
                    </button>
                  </div>
                  {familiaresEncontrados.length > 0 && (
                    <div className="max-h-28 overflow-y-auto divide-y divide-pink-100 bg-white rounded-lg border border-pink-100">
                      {familiaresEncontrados.map((f) => (
                        <button
                          key={f.familiar_id}
                          type="button"
                          onClick={() => selecionarFamiliarParaOperador(f)}
                          className="w-full text-left px-3 py-2 hover:bg-pink-50 text-xs flex justify-between items-center"
                        >
                          <span>
                            <strong>{f.nome_familiar}</strong> ({f.tipo_relacionamento || 'Familiar'})
                          </span>
                          <span className="text-[11px] text-gray-500">Ir. {f.nome_obreiro}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={salvarNovoOperador} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Operador *</label>
                  <input
                    type="text"
                    required
                    value={opNome}
                    onChange={(e) => setOpNome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">CPF (Cria carteira se Familiar)</label>
                    <input
                      type="text"
                      value={opCpf}
                      onChange={(e) => setOpCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={opTelefone}
                      onChange={(e) => setOpTelefone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">E-mail de Login no Ágape *</label>
                    <input
                      type="email"
                      required
                      value={opEmail}
                      onChange={(e) => setOpEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Senha de Acesso *</label>
                    <input
                      type="text"
                      required
                      value={opSenha}
                      onChange={(e) => setOpSenha(e.target.value)}
                      placeholder="Ex: agape2026"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Permissão dentro do Ágape</label>
                  <select
                    value={opCargo}
                    onChange={(e) => setOpCargo(e.target.value as 'OPERADOR_BALCAO' | 'GARCOM' | 'WEBMASTER')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm"
                  >
                    <option value="OPERADOR_BALCAO">OPERADOR_BALCAO — Apenas Balcão Rápido, Comandas e Estoque (Isolado)</option>
                    <option value="GARCOM">GARCOM — Apenas Bipagem de Pedidos e Comandas (Isolado)</option>
                    <option value="WEBMASTER">WEBMASTER — Mestre de Banquetes / Gestor Geral do Ágape da Loja</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalNovoOp(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    Salvar Operador
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
