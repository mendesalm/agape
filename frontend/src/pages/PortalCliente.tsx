import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  CreditCard,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Receipt,
  Search,
  Sparkles,
  RefreshCw,
  Wallet,
  Phone,
  Mail,
  ShieldCheck,
  ArrowRight,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { ComprovanteTermicoModal, type DadosComprovante } from '../components/ComprovanteTermicoModal';

interface ClientePerfil {
  id: number;
  nome: string;
  cpf: string;
  cim?: string | null;
  telefone?: string | null;
  email?: string | null;
  tipo_consumidor: string;
  nome_loja_origem?: string | null;
  observacao?: string | null;
}

interface CarteiraInfo {
  saldo: number;
  limite_fiado: number;
}

interface ItemComandaAberta {
  id: number;
  produto_id: number;
  nome_produto: string;
  quantidade: number;
  valor_unitario: number;
  subtotal: number;
  observacao?: string | null;
}

interface ComandaAbertaInfo {
  id: number;
  identificador_cartao?: string | null;
  data_abertura?: string | null;
  total: number;
  itens: ItemComandaAberta[];
}

interface FaturaHistorico {
  id: number;
  identificador_cartao?: string | null;
  data_abertura: string;
  data_fechamento?: string | null;
  status: string;
  forma_pagamento?: string | null;
  total: number;
  itens: Array<{
    id: number;
    produto_id: number;
    nome_produto?: string;
    quantidade: number;
    valor_unitario: number;
  }>;
}

export const PortalCliente: React.FC = () => {
  // Aba ativa: 'cadastro' | 'relatorio' | 'credito' | 'pagamentos'
  const [abaAtiva, setAbaAtiva] = useState<'cadastro' | 'relatorio' | 'credito' | 'pagamentos'>('pagamentos');

  // Estado do Perfil e Carteira
  const [carregando, setCarregando] = useState(true);
  const [cliente, setCliente] = useState<ClientePerfil | null>(null);
  const [carteira, setCarteira] = useState<CarteiraInfo>({ saldo: 0, limite_fiado: 100 });
  const [cartaoAtivo, setCartaoAtivo] = useState<string | null>(null);
  const [comandaAberta, setComandaAberta] = useState<ComandaAbertaInfo | null>(null);

  // Edição de Contato
  const [telefoneEdit, setTelefoneEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [obsEdit, setObsEdit] = useState('');
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [sucessoContato, setSucessoContato] = useState(false);

  // Faturas e Histórico
  const [faturas, setFaturas] = useState<FaturaHistorico[]>([]);
  const [carregandoFaturas, setCarregandoFaturas] = useState(false);
  const [faturaExpandida, setFaturaExpandida] = useState<number | null>(null);
  const [comprovanteModal, setComprovanteModal] = useState<DadosComprovante | null>(null);
  const [modalComprovanteAberto, setModalComprovanteAberto] = useState(false);

  // Inserção de Créditos (Pix Recarga)
  const [valorRecarga, setValorRecarga] = useState<number>(50);
  const [valorCustomizado, setValorCustomizado] = useState<string>('');
  const [mostrarPixRecarga, setMostrarPixRecarga] = useState(false);
  const [chavePixCopia, setChavePixCopia] = useState('');
  const [pixCopiado, setPixCopiado] = useState(false);
  const [processandoRecarga, setProcessandoRecarga] = useState(false);

  // Quitação de Comanda Aberta (Auto-checkout)
  const [formaQuitacao, setFormaQuitacao] = useState<'pix' | 'carteira'>('pix');
  const [devolverCartaoAuto, setDevolverCartaoAuto] = useState(true);
  const [mostrarPixQuitacao, setMostrarPixQuitacao] = useState(false);
  const [chavePixQuitacao, setChavePixQuitacao] = useState('');
  const [pixQuitacaoCopiado, setPixQuitacaoCopiado] = useState(false);
  const [processandoQuitacao, setProcessandoQuitacao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Seletor de Irmão (para testes e gerência)
  const [modalTrocarCliente, setModalTrocarCliente] = useState(false);
  const [buscaTermo, setBuscaTermo] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<ClientePerfil[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  // Carrega Perfil do Cliente Inicial
  const carregarPerfil = async (clienteIdAlvo?: number) => {
    try {
      setCarregando(true);
      const url = clienteIdAlvo
        ? `/comandas/cliente/${clienteIdAlvo}/detalhes`
        : '/comandas/cliente/meu-perfil';
      const res = await api.get(url);
      const dados = res.data;

      setCliente(dados.cliente);
      setCarteira(dados.carteira);
      setCartaoAtivo(dados.cartao_ativo);
      setComandaAberta(dados.comanda_aberta);

      setTelefoneEdit(dados.cliente?.telefone || '');
      setEmailEdit(dados.cliente?.email || '');
      setObsEdit(dados.cliente?.observacao || '');

      // Se tiver comanda aberta, foca na aba pagamentos; caso contrário, crédito ou relatório
      if (dados.comanda_aberta && dados.comanda_aberta.total > 0) {
        setAbaAtiva('pagamentos');
      }

      if (dados.cliente?.id) {
        carregarFaturas(dados.cliente.id);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil do cliente:', err);
    } finally {
      setCarregando(false);
    }
  };

  const carregarFaturas = async (clienteId: number) => {
    try {
      setCarregandoFaturas(true);
      const res = await api.get(`/comandas/cliente/${clienteId}`);
      setFaturas(res.data || []);
    } catch (err) {
      console.error('Erro ao listar faturas:', err);
    } finally {
      setCarregandoFaturas(false);
    }
  };

  useEffect(() => {
    carregarPerfil();
  }, []);

  // Salvar atualização de contato
  const handleSalvarContato = async () => {
    if (!cliente) return;
    try {
      setSalvandoContato(true);
      const res = await api.patch(`/comandas/cliente/${cliente.id}/perfil`, {
        telefone: telefoneEdit,
        email: emailEdit,
        observacao: obsEdit
      });
      setCliente(prev => prev ? { ...prev, ...res.data } : null);
      setSucessoContato(true);
      setTimeout(() => setSucessoContato(false), 3500);
    } catch (err) {
      console.error('Erro ao atualizar contato:', err);
      alert('Falha ao atualizar dados de contato.');
    } finally {
      setSalvandoContato(false);
    }
  };

  // Gerar QR Code Pix para Recarga
  const handleGerarPixRecarga = (valorFinal: number) => {
    const mockPayload = `00020126580014br.gov.bcb.pix0136agape-recarga-${cliente?.id || '0'}-${Date.now()}520400005303986540${(valorFinal).toFixed(2)}5802BR5915AGAPE BAR LOJA6008BRASILIA62070503***6304E091`;
    setChavePixCopia(mockPayload);
    setMostrarPixRecarga(true);
    setPixCopiado(false);
  };

  // Confirmar Recarga Pix (simulado/imediato)
  const handleConfirmarRecarga = async () => {
    if (!cliente) return;
    const valorEfetivo = valorCustomizado ? parseFloat(valorCustomizado) : valorRecarga;
    if (isNaN(valorEfetivo) || valorEfetivo <= 0) {
      alert('Informe um valor de recarga válido.');
      return;
    }
    try {
      setProcessandoRecarga(true);
      const res = await api.post('/comandas/carteira/recarga', {
        cliente_id: cliente.id,
        valor: valorEfetivo,
        forma_pagamento: 'pix',
        observacao: 'Recarga Instantânea via Portal do Irmão'
      });
      setCarteira({
        saldo: res.data.saldo_atual,
        limite_fiado: res.data.limite_fiado
      });
      setMostrarPixRecarga(false);
      setValorCustomizado('');
      setMensagemSucesso(`Crédito de R$ ${valorEfetivo.toFixed(2)} creditado com sucesso em sua conta do Bar!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error('Erro ao efetuar recarga:', err);
      alert('Falha ao processar recarga.');
    } finally {
      setProcessandoRecarga(false);
    }
  };

  // Gerar Pix para Quitação da Comanda Aberta
  const handleGerarPixQuitacao = () => {
    if (!comandaAberta) return;
    const mockPayload = `00020126580014br.gov.bcb.pix0136agape-quitar-${comandaAberta.id}-${Date.now()}520400005303986540${comandaAberta.total.toFixed(2)}5802BR5915AGAPE QUITACAO6008BRASILIA62070503***6304E882`;
    setChavePixQuitacao(mockPayload);
    setMostrarPixQuitacao(true);
    setPixQuitacaoCopiado(false);
  };

  // Efetuar Quitação da Comanda Aberta
  const handleEfetivarQuitacao = async () => {
    if (!cliente || !comandaAberta) return;
    try {
      setProcessandoQuitacao(true);
      await api.post(`/comandas/cliente/${cliente.id}/quitar-comanda-aberta`, {
        forma_pagamento: formaQuitacao,
        devolver_cartao: devolverCartaoAuto
      });
      setMostrarPixQuitacao(false);
      setMensagemSucesso('✓ Comanda da noite quitada com sucesso! Seu cartão foi liberado.');
      setTimeout(() => setMensagemSucesso(null), 5000);
      // Recarrega perfil completo
      await carregarPerfil(cliente.id);
    } catch (err: any) {
      console.error('Erro ao quitar comanda:', err);
      const msg = err.response?.data?.detail || 'Erro ao quitar comanda.';
      alert(msg);
    } finally {
      setProcessandoQuitacao(false);
    }
  };

  // Abrir Comprovante Térmico
  const handleVerComprovante = async (comandaId: number) => {
    try {
      const res = await api.get(`/comandas/${comandaId}/comprovante-termico`);
      setComprovanteModal(res.data);
      setModalComprovanteAberto(true);
    } catch (err) {
      console.error('Erro ao buscar comprovante:', err);
      alert('Não foi possível gerar a via térmica para esta comanda.');
    }
  };

  // Pesquisar outros clientes para troca
  const handleBuscarClientes = async (termo: string) => {
    setBuscaTermo(termo);
    try {
      setBuscandoClientes(true);
      const res = await api.get(`/comandas/clientes/busca?q=${encodeURIComponent(termo)}`);
      setClientesEncontrados(res.data || []);
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setBuscandoClientes(false);
    }
  };

  const selecionarCliente = async (c: ClientePerfil) => {
    setModalTrocarCliente(false);
    await carregarPerfil(c.id);
  };

  // Iniciais do Irmão
  const getIniciais = (nome: string) => {
    const partes = nome.trim().split(' ');
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  if (carregando) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-slate-400 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-[#10B981]" />
        <span className="font-mono text-xs uppercase tracking-widest text-[#10B981]">
          Sincronizando Portal do Obreiro...
        </span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5 pb-24 text-slate-100 font-sans">
      {/* Toast de Sucesso */}
      {mensagemSucesso && (
        <div className="p-4 rounded-xl bg-[#10B981]/20 border border-[#10B981] text-[#4EDEA3] flex items-center gap-3 animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{mensagemSucesso}</span>
        </div>
      )}

      {/* HEADER TÁTIL DO CLIENTE / IRMÃO */}
      <section className="bg-[#131B2E] border border-[#334155] rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Tipográfico ou Foto */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#0B1326] border-2 border-[#10B981]/60 flex items-center justify-center text-[#4EDEA3] font-bold text-2xl shadow-inner shrink-0 relative">
              {cliente?.nome ? getIniciais(cliente.nome) : 'IR'}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-[#131B2E]" title="Ativo no Bar" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Ir.'. {cliente?.nome || 'Obreiro'}
                </h1>
                {cliente?.cim && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#1E293B] border border-[#38BDF8]/40 text-[#7BD0FF]">
                    CIM: {cliente.cim}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{cliente?.nome_loja_origem || 'Loja Maçônica Mantenedora'}</span>
                <span>•</span>
                <span className="text-[#10B981] font-semibold">Conta Ágape Ativa</span>
              </p>
            </div>
          </div>

          {/* Botão de Alternar Irmão (Para Testes ou Gerente) */}
          <button
            onClick={() => {
              setModalTrocarCliente(true);
              handleBuscarClientes('');
            }}
            className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Trocar Irmão</span>
          </button>
        </div>

        {/* BARRA HERO: TELEMETRIA TÁTIL DE SALDO & CARTÃO */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-[#334155]">
          {/* Card Saldo em Carteira */}
          <div className="bg-[#0B1326]/70 border border-[#334155] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Saldo na Conta Bar
              </span>
              <span
                className={`text-xl font-bold font-mono ${
                  carteira.saldo >= 0 ? 'text-[#4EDEA3]' : 'text-[#FFB95F]'
                }`}
              >
                R$ {carteira.saldo.toFixed(2)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center text-[#4EDEA3]">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Card Cartão Físico */}
          <div className="bg-[#0B1326]/70 border border-[#334155] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Cartão Físico Ativo
              </span>
              <span className="text-sm font-bold font-mono text-white">
                {cartaoAtivo ? cartaoAtivo : 'Nenhum vinculado'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 border border-[#38BDF8]/30 flex items-center justify-center text-[#7BD0FF]">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          {/* Card Comanda da Noite */}
          <div className="bg-[#0B1326]/70 border border-[#334155] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Consumo da Noite
              </span>
              <span
                className={`text-sm font-bold font-mono ${
                  comandaAberta && comandaAberta.total > 0
                    ? 'text-[#FFB95F]'
                    : 'text-slate-400'
                }`}
              >
                {comandaAberta ? `R$ ${comandaAberta.total.toFixed(2)}` : 'R$ 0,00'}
              </span>
            </div>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                comandaAberta && comandaAberta.total > 0
                  ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#FFB95F]'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              <Receipt className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* OS 4 SUB-MENUS DO NÍVEL CLIENTE: NAVEGAÇÃO SIMÉTRICA EM 4 TILES */}
      <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setAbaAtiva('pagamentos')}
          className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
            abaAtiva === 'pagamentos'
              ? 'bg-[#171F33] border-[#10B981] text-[#4EDEA3] shadow-lg shadow-[#10B981]/10'
              : 'bg-[#131B2E] border-[#334155] text-slate-400 hover:text-slate-200'
          }`}
        >
          {comandaAberta && comandaAberta.total > 0 && (
            <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-[#F59E0B] text-[#0B1326] font-mono text-[9px] font-black animate-pulse">
              PENDENTE
            </span>
          )}
          <CheckCircle2 className="w-5 h-5" />
          <span>Pagamentos</span>
        </button>

        <button
          onClick={() => setAbaAtiva('credito')}
          className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
            abaAtiva === 'credito'
              ? 'bg-[#171F33] border-[#38BDF8] text-[#7BD0FF] shadow-lg shadow-[#38BDF8]/10'
              : 'bg-[#131B2E] border-[#334155] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span>Crédito</span>
        </button>

        <button
          onClick={() => setAbaAtiva('relatorio')}
          className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
            abaAtiva === 'relatorio'
              ? 'bg-[#171F33] border-[#F59E0B] text-[#FFB95F] shadow-lg shadow-[#F59E0B]/10'
              : 'bg-[#131B2E] border-[#334155] text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Relatório (Faturas)</span>
        </button>

        <button
          onClick={() => setAbaAtiva('cadastro')}
          className={`p-3 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
            abaAtiva === 'cadastro'
              ? 'bg-[#171F33] border-slate-300 text-white shadow-lg'
              : 'bg-[#131B2E] border-[#334155] text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Cadastro</span>
        </button>
      </nav>

      {/* CONTEÚDO DA ABA 1: PAGAMENTOS (QUITAÇÃO DA COMANDA ABERTA / AUTO-CHECKOUT) */}
      {abaAtiva === 'pagamentos' && (
        <div className="space-y-4 animate-fade-in">
          {comandaAberta && comandaAberta.total > 0 ? (
            <div className="bg-[#131B2E] border border-[#F59E0B]/40 rounded-2xl p-5 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#334155] pb-4">
                <div>
                  <span className="text-xs uppercase tracking-widest font-mono text-[#FFB95F] font-bold block">
                    Comanda da Noite Aberta • #{comandaAberta.id}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-0.5">
                    Itens Lançados no Balcão
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Total a Pagar</span>
                  <span className="text-2xl font-black font-mono text-[#4EDEA3]">
                    R$ {comandaAberta.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Lista dos Itens na Comanda Aberta */}
              <div className="space-y-2">
                {comandaAberta.itens.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#0B1326]/60 border border-[#334155]/60 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center font-mono font-bold text-xs text-[#7BD0FF]">
                        {item.quantidade}x
                      </span>
                      <div>
                        <span className="font-semibold text-white block">{item.nome_produto}</span>
                        <span className="text-xs text-slate-400 font-mono">
                          R$ {item.valor_unitario.toFixed(2)} un.
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[#4EDEA3]">
                      R$ {item.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Seleção de Forma de Quitação */}
              <div className="pt-2 border-t border-[#334155] space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Escolha como deseja quitar agora:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setFormaQuitacao('pix');
                      handleGerarPixQuitacao();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      formaQuitacao === 'pix'
                        ? 'bg-[#171F33] border-[#10B981] text-white shadow-md'
                        : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#4EDEA3]">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Pagar via Pix</span>
                        <span className="text-[11px] text-slate-400">QR Code dinâmico no celular</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#4EDEA3]" />
                  </button>

                  <button
                    onClick={() => {
                      if (carteira.saldo < comandaAberta.total) {
                        alert(`Saldo insuficiente na conta bar (R$ ${carteira.saldo.toFixed(2)}). Faça uma recarga ou quite via Pix.`);
                        return;
                      }
                      setFormaQuitacao('carteira');
                      setMostrarPixQuitacao(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      formaQuitacao === 'carteira'
                        ? 'bg-[#171F33] border-[#38BDF8] text-white shadow-md'
                        : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                    } ${carteira.saldo < comandaAberta.total ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#7BD0FF]">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Debitar do Saldo Bar</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Disponível: R$ {carteira.saldo.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7BD0FF]" />
                  </button>
                </div>
              </div>

              {/* Checkbox Devolver Cartão */}
              {cartaoAtivo && (
                <label className="flex items-center gap-3 p-3 rounded-xl bg-[#0B1326] border border-[#334155] cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={devolverCartaoAuto}
                    onChange={(e) => setDevolverCartaoAuto(e.target.checked)}
                    className="w-4 h-4 accent-[#10B981] rounded"
                  />
                  <span>
                    <strong>Liberar e Devolver Cartão ({cartaoAtivo}):</strong> Devolverei o cartão físico no gaveteiro de saída do templo ao ir embora.
                  </span>
                </label>
              )}

              {/* Exibição do QR Code Pix da Quitação */}
              {mostrarPixQuitacao && formaQuitacao === 'pix' && (
                <div className="bg-[#0B1326] border border-[#10B981]/50 rounded-xl p-5 text-center space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4EDEA3] block">
                    Escaneie ou copie a chave Pix para quitar a comanda
                  </span>

                  <div className="w-48 h-48 mx-auto bg-white p-3 rounded-xl border-4 border-[#10B981] flex items-center justify-center shadow-lg">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(chavePixQuitacao)}`}
                      alt="QR Code Pix Quitação"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="max-w-md mx-auto flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={chavePixQuitacao}
                      className="w-full bg-[#171F33] border border-[#334155] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(chavePixQuitacao);
                        setPixQuitacaoCopiado(true);
                        setTimeout(() => setPixQuitacaoCopiado(false), 2000);
                      }}
                      className="px-3 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-[#4EDEA3] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {pixQuitacaoCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{pixQuitacaoCopiado ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>

                  <button
                    onClick={handleEfetivarQuitacao}
                    disabled={processandoQuitacao}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-[#0B1326] font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    {processandoQuitacao ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirmar Pagamento & Quitar Comanda</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Botão de Quitar via Carteira */}
              {formaQuitacao === 'carteira' && (
                <button
                  onClick={handleEfetivarQuitacao}
                  disabled={processandoQuitacao || carteira.saldo < comandaAberta.total}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:brightness-110 text-[#0B1326] font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {processandoQuitacao ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      <span>Debitar R$ {comandaAberta.total.toFixed(2)} do Saldo Bar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            /* Sem pendências */
            <div className="bg-[#131B2E] border border-[#10B981]/40 rounded-2xl p-8 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 mx-auto flex items-center justify-center text-[#4EDEA3]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Tudo 100% Quitado!
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Você não possui nenhuma comanda em aberto no Bar nesta noite. Seus consumos anteriores estão devidamente liquidados.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setAbaAtiva('credito')}
                  className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-[#7BD0FF] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Inserir Créditos Pré-pagos</span>
                </button>
                <button
                  onClick={() => setAbaAtiva('relatorio')}
                  className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-slate-300 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Faturas Anteriores</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 2: CRÉDITO (INSERÇÃO DE SALDOS VIA PIX) */}
      {abaAtiva === 'credito' && (
        <div className="bg-[#131B2E] border border-[#334155] rounded-2xl p-5 shadow-xl space-y-5 animate-fade-in">
          <div className="border-b border-[#334155] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-[#7BD0FF] font-bold block">
                Conta Corrente Ágape
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Inserção de Saldos Pré-pagos
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Saldo Disponível</span>
              <span className="text-2xl font-black font-mono text-[#4EDEA3]">
                R$ {carteira.saldo.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0B1326] border border-[#38BDF8]/30 text-xs text-slate-300 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#38BDF8] shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block mb-0.5">Consumo Instantâneo no Salão:</strong>
              Com saldo pré-pago em sua conta do Bar, seus pedidos são descontados automaticamente ao bipar seu cartão, permitindo que você aproveite o banquete sem pegar filas no caixa ao final da sessão!
            </div>
          </div>

          {/* Atalhos de Valores Táteis */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Selecione o valor da recarga:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[20, 50, 100, 200].map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setValorRecarga(v);
                    setValorCustomizado('');
                    handleGerarPixRecarga(v);
                  }}
                  className={`p-4 rounded-xl border font-mono font-bold text-base transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    valorRecarga === v && !valorCustomizado
                      ? 'bg-[#171F33] border-[#10B981] text-[#4EDEA3] shadow-md shadow-[#10B981]/10'
                      : 'bg-[#0B1326] border-[#334155] text-slate-300 hover:text-white'
                  }`}
                >
                  <span>R$ {v.toFixed(2)}</span>
                  <span className="text-[10px] font-sans uppercase tracking-wider text-slate-500 font-normal">
                    Recarga Rápida
                  </span>
                </button>
              ))}
            </div>

            {/* Valor Personalizado */}
            <div className="pt-2 flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                  R$
                </span>
                <input
                  type="number"
                  step="5"
                  placeholder="Outro valor..."
                  value={valorCustomizado}
                  onChange={(e) => {
                    setValorCustomizado(e.target.value);
                    const parsed = parseFloat(e.target.value);
                    if (!isNaN(parsed) && parsed > 0) {
                      handleGerarPixRecarga(parsed);
                    }
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#0B1326] border border-[#334155] text-white font-mono text-sm focus:outline-none focus:border-[#38BDF8]"
                />
              </div>
            </div>
          </div>

          {/* QR Code Pix para Recarga */}
          {mostrarPixRecarga && (
            <div className="bg-[#0B1326] border border-[#38BDF8]/40 rounded-xl p-5 text-center space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7BD0FF]">
                  QR Code Pix para Recarga de R$ {(valorCustomizado ? parseFloat(valorCustomizado) : valorRecarga).toFixed(2)}
                </span>
                <span className="text-[11px] font-mono text-[#F59E0B] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ⏱ 05:00
                </span>
              </div>

              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-xl border-4 border-[#38BDF8] flex items-center justify-center shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(chavePixCopia)}`}
                  alt="QR Code Pix"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="max-w-md mx-auto flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={chavePixCopia}
                  className="w-full bg-[#171F33] border border-[#334155] rounded-lg px-3 py-2 text-xs font-mono text-slate-300 truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(chavePixCopia);
                    setPixCopiado(true);
                    setTimeout(() => setPixCopiado(false), 2000);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-[#7BD0FF] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {pixCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{pixCopiado ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <button
                onClick={handleConfirmarRecarga}
                disabled={processandoRecarga}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-[#0B1326] font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                {processandoRecarga ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirmar Pagamento & Inserir Crédito</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: RELATÓRIO (FATURAS E HISTÓRICO DE SESSÕES) */}
      {abaAtiva === 'relatorio' && (
        <div className="bg-[#131B2E] border border-[#334155] rounded-2xl p-5 shadow-xl space-y-5 animate-fade-in">
          <div className="border-b border-[#334155] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-[#FFB95F] font-bold block">
                Histórico & Auditoria
              </span>
              <h2 className="text-xl font-bold text-white mt-0.5">
                Relatório de Faturas do Bar
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {faturas.length} faturas encontradas
            </span>
          </div>

          {carregandoFaturas ? (
            <div className="py-12 text-center text-slate-400 text-xs font-mono">
              Carregando histórico de comandas...
            </div>
          ) : faturas.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <FileText className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-sm">Nenhuma fatura registrada para este perfil.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {faturas.map((fat) => {
                const aberta = faturaExpandida === fat.id;
                const isPendente = fat.status === 'ABERTA';

                return (
                  <div
                    key={fat.id}
                    className="bg-[#0B1326] border border-[#334155] rounded-xl overflow-hidden transition-all"
                  >
                    <div
                      onClick={() => setFaturaExpandida(aberta ? null : fat.id)}
                      className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#171F33] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isPendente
                              ? 'bg-[#F59E0B]/20 text-[#FFB95F] border border-[#F59E0B]/40'
                              : 'bg-[#10B981]/20 text-[#4EDEA3] border border-[#10B981]/40'
                          }`}
                        >
                          #{fat.id}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">
                              {fat.data_abertura ? new Date(fat.data_abertura).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'Data N/D'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                                isPendente
                                  ? 'bg-[#F59E0B]/20 text-[#FFB95F]'
                                  : 'bg-[#10B981]/20 text-[#4EDEA3]'
                              }`}
                            >
                              {isPendente ? 'EM ABERTO' : 'PAGA'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono block mt-0.5">
                            Forma: {fat.forma_pagamento ? fat.forma_pagamento.toUpperCase() : 'PENDENTE'} • {fat.itens?.length || 0} itens
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold font-mono text-white">
                          R$ {fat.total.toFixed(2)}
                        </span>
                        {aberta ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Detalhes Expansíveis da Fatura */}
                    {aberta && (
                      <div className="p-4 border-t border-[#334155] bg-[#131B2E]/60 space-y-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Detalhamento do Consumo:
                        </span>
                        <div className="space-y-1.5">
                          {fat.itens?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#0B1326]/50"
                            >
                              <span className="text-slate-200">
                                <span className="font-mono text-[#7BD0FF] font-bold mr-1.5">{item.quantidade}x</span>
                                {item.nome_produto || `Produto #${item.produto_id}`}
                              </span>
                              <span className="font-mono text-slate-300">
                                R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerComprovante(fat.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-[#38BDF8]" />
                            <span>Ver Cupom Térmico</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 4: CADASTRO (MEUS DADOS & WHATSAPP) */}
      {abaAtiva === 'cadastro' && (
        <div className="bg-[#131B2E] border border-[#334155] rounded-2xl p-5 shadow-xl space-y-5 animate-fade-in">
          <div className="border-b border-[#334155] pb-4">
            <span className="text-xs uppercase tracking-widest font-mono text-slate-400 font-bold block">
              Dados Cadastrais
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Identificação & Preferências do Irmão
            </h2>
          </div>

          {sucessoContato && (
            <div className="p-3 rounded-xl bg-[#10B981]/20 border border-[#10B981] text-[#4EDEA3] text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Dados de contato e preferências atualizados com sucesso!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Nome do Irmão / Consumidor
              </label>
              <input
                type="text"
                readOnly
                value={cliente?.nome || ''}
                className="w-full bg-[#0B1326] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-slate-300 font-semibold cursor-not-allowed opacity-80"
              />
            </div>

            {/* CIM */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                CIM Maçônico
              </label>
              <input
                type="text"
                readOnly
                value={cliente?.cim || 'Não informado'}
                className="w-full bg-[#0B1326] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-slate-300 font-mono cursor-not-allowed opacity-80"
              />
            </div>

            {/* CPF Protegido */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                CPF / Documento
              </label>
              <input
                type="text"
                readOnly
                value={cliente?.cpf ? `${cliente.cpf.slice(0, 3)}.***.***-${cliente.cpf.slice(-2)}` : 'Não informado'}
                className="w-full bg-[#0B1326] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-slate-300 font-mono cursor-not-allowed opacity-80"
              />
            </div>

            {/* Loja de Origem */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Oficina / Loja Mantenedora
              </label>
              <input
                type="text"
                readOnly
                value={cliente?.nome_loja_origem || 'Loja Atual'}
                className="w-full bg-[#0B1326] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-slate-300 cursor-not-allowed opacity-80"
              />
            </div>

            {/* WhatsApp / Telefone Editável */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#7BD0FF] block mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp / Celular (para Extratos)</span>
              </label>
              <input
                type="text"
                value={telefoneEdit}
                onChange={(e) => setTelefoneEdit(e.target.value)}
                placeholder="(62) 99999-9999"
                className="w-full bg-[#0B1326] border border-[#38BDF8]/40 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#38BDF8]"
              />
            </div>

            {/* E-mail Editável */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#7BD0FF] block mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>E-mail para Faturas Digitais</span>
              </label>
              <input
                type="email"
                value={emailEdit}
                onChange={(e) => setEmailEdit(e.target.value)}
                placeholder="seuemail@exemplo.com"
                className="w-full bg-[#0B1326] border border-[#38BDF8]/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#38BDF8]"
              />
            </div>
          </div>

          {/* Preferências / Observações */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Preferências de Consumo / Restrições Alimentares
            </label>
            <textarea
              rows={3}
              value={obsEdit}
              onChange={(e) => setObsEdit(e.target.value)}
              placeholder="Ex: Sem glúten, cerveja sem álcool, preferência por chopp gelado..."
              className="w-full bg-[#0B1326] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#10B981]"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSalvarContato}
              disabled={salvandoContato}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:brightness-110 text-[#0B1326] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 shadow-lg"
            >
              {salvandoContato ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Salvar Alterações de Contato</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE TROCA DE CLIENTE (UTILITÁRIO PARA TESTES E GERENTE) */}
      {modalTrocarCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#131B2E] border border-[#334155] rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#334155] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#38BDF8]" />
                <span>Selecionar Irmão / Cliente</span>
              </h3>
              <button
                onClick={() => setModalTrocarCliente(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por Nome, CIM ou CPF..."
                value={buscaTermo}
                onChange={(e) => handleBuscarClientes(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1326] border border-[#334155] text-white text-sm focus:outline-none focus:border-[#38BDF8]"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {buscandoClientes ? (
                <div className="text-center py-6 text-slate-400 text-xs">Pesquisando...</div>
              ) : clientesEncontrados.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">Nenhum irmão localizado.</div>
              ) : (
                clientesEncontrados.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selecionarCliente(c)}
                    className="w-full p-3 rounded-xl bg-[#0B1326] hover:bg-[#1E293B] border border-[#334155] text-left transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-white text-sm block">Ir.'. {c.nome}</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {c.cim ? `CIM ${c.cim}` : c.cpf}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#38BDF8]" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPROVANTE TÉRMICO */}
      <ComprovanteTermicoModal
        isOpen={modalComprovanteAberto}
        comprovante={comprovanteModal}
        onClose={() => setModalComprovanteAberto(false)}
        clienteId={cliente?.id}
      />
    </div>
  );
};
export default PortalCliente;
