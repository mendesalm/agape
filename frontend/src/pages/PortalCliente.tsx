import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import {
  User,
  FileText,
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
  Clock,
  Maximize2,
  X,
  Camera,
  Trash2,
  Plus,
  CreditCard,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { ComprovanteTermicoModal, type DadosComprovante } from '../components/ComprovanteTermicoModal';
import { LeitorQrCameraModal } from '../components/LeitorQrCameraModal';

export interface DocumentoIdentificador {
  id: string;
  tipo: 'CNH' | 'CNI' | 'E_GOB_CARD' | 'MILITAR' | 'ENTIDADE_CLASSE' | 'OUTRO';
  rotulo: string;
  codigo: string;
  cadastrado_em: string;
  ativo: boolean;
}

interface ClientePerfil {
  id: number;
  nome: string;
  cpf: string;
  cim?: string | null;
  telefone?: string | null;
  email?: string | null;
  tipo_consumidor: string;
  nome_loja_origem?: string | null;
  grau_maconico?: string | null;
  situacao_gob?: string | null;
  validado_metagob?: boolean | null;
  identificadores_qr?: DocumentoIdentificador[];
  observacao?: string | null;
}

interface CarteiraInfo {
  saldo: number;
  limite_fiado: number;
}

interface DependenteInfo {
  id: number;
  nome: string;
  parentesco: string;
  email?: string | null;
  telefone?: string | null;
  limite_sessao?: number | null;
  autorizacao_pausada: boolean;
  consumo_total: number;
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
  // Cascata: cartões iniciais recolhidos para caber em 100% da tela sem overflow
  const [cartaoAberto, setCartaoAberto] = useState<'dados' | 'carteira' | null>(null);
  const [subAbaDados, setSubAbaDados] = useState<'cadastro' | 'dependentes' | 'identificacao'>('cadastro');
  const [subAbaCarteira, setSubAbaCarteira] = useState<'status' | 'saldo' | 'deposito' | 'pagamento'>('status');
  const [modalQrExpandido, setModalQrExpandido] = useState(false);

  // Estado do Perfil e Carteira
  const [carregando, setCarregando] = useState(true);
  const [cliente, setCliente] = useState<ClientePerfil | null>(null);
  const [carteira, setCarteira] = useState<CarteiraInfo>({ saldo: 0, limite_fiado: 100 });
  const [cartaoAtivo, setCartaoAtivo] = useState<string | null>(null);
  const [comandaAberta, setComandaAberta] = useState<ComandaAbertaInfo | null>(null);

  // Identificador do QR Code da Credencial Digital (aceito no balcão e no leitor 2D)
  const getQrCodeValor = () => {
    if (cartaoAtivo) return cartaoAtivo;
    if (cliente?.cim) return `AGAPE:CLI:${cliente.id}:${cliente.cim}`;
    if (cliente?.id) return `AGAPE:CLI:${cliente.id}`;
    return 'AGAPE:CLIENTE:0';
  };

  // Edição de Contato
  const [telefoneEdit, setTelefoneEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [obsEdit, setObsEdit] = useState('');
  const [salvandoContato, setSalvandoContato] = useState(false);
  const [dependentes, setDependentes] = useState<DependenteInfo[]>([]);
  const [limitesDepEdit, setLimitesDepEdit] = useState<Record<number, string>>({});
  const [salvandoDepId, setSalvandoDepId] = useState<number | null>(null);

  const handleTogglePausaDependente = async (dep: DependenteInfo) => {
    if (!cliente) return;
    try {
      setSalvandoDepId(dep.id);
      const res = await api.patch(`/comandas/cliente/${cliente.id}/dependentes/${dep.id}`, {
        autorizacao_pausada: !dep.autorizacao_pausada
      });
      setDependentes(res.data.dependentes || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar autorização do dependente.');
    } finally {
      setSalvandoDepId(null);
    }
  };

  const handleSalvarLimiteDependente = async (dep: DependenteInfo) => {
    if (!cliente) return;
    const raw = (limitesDepEdit[dep.id] || '').trim().replace(',', '.');
    const valor = raw === '' ? null : Math.max(0, parseFloat(raw) || 0);
    try {
      setSalvandoDepId(dep.id);
      const res = await api.patch(`/comandas/cliente/${cliente.id}/dependentes/${dep.id}`, {
        limite_sessao: valor
      });
      setDependentes(res.data.dependentes || []);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao salvar limite do dependente.');
    } finally {
      setSalvandoDepId(null);
    }
  };
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
  const [metodoRecarga, setMetodoRecarga] = useState<'pix' | 'cartao'>('pix');
  const [mostrarPixRecarga, setMostrarPixRecarga] = useState(false);
  const [chavePixCopia, setChavePixCopia] = useState('');
  const [pixCopiado, setPixCopiado] = useState(false);
  const [processandoRecarga, setProcessandoRecarga] = useState(false);

  // Quitação de Comanda Aberta (Auto-checkout)
  const [formaQuitacao, setFormaQuitacao] = useState<'pix' | 'carteira' | 'cartao_credito'>('pix');
  const [devolverCartaoAuto, setDevolverCartaoAuto] = useState(true);
  const [mostrarPixQuitacao, setMostrarPixQuitacao] = useState(false);
  const [chavePixQuitacao, setChavePixQuitacao] = useState('');
  const [pixQuitacaoCopiado, setPixQuitacaoCopiado] = useState(false);
  const [processandoQuitacao, setProcessandoQuitacao] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);

  // Cartão de Crédito Online (Auto-checkout & Recarga)
  const [cartaoNumero, setCartaoNumero] = useState('');
  const [cartaoNome, setCartaoNome] = useState('');
  const [cartaoValidade, setCartaoValidade] = useState('');
  const [cartaoCvv, setCartaoCvv] = useState('');
  const [salvarCartao, setSalvarCartao] = useState(true);

  const formatarNumeroCartao = (val: string) => {
    const limpo = val.replace(/\D/g, '').slice(0, 16);
    return limpo.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatarValidade = (val: string) => {
    const limpo = val.replace(/\D/g, '').slice(0, 4);
    if (limpo.length >= 3) {
      return `${limpo.slice(0, 2)}/${limpo.slice(2)}`;
    }
    return limpo;
  };

  const detectarBandeira = (num: string) => {
    const digits = num.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'VISA';
    if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(digits)) return 'MASTERCARD';
    if (/^(401178|401179|438935|457631|457632|504175|627780|636297|636368)/.test(digits)) return 'ELO';
    if (/^(34|37)/.test(digits)) return 'AMEX';
    if (/^(606282|3841)/.test(digits)) return 'HIPERCARD';
    return 'CRÉDITO';
  };

  // Seletor de Irmão (para testes e gerência)
  const [modalTrocarCliente, setModalTrocarCliente] = useState(false);
  const [buscaTermo, setBuscaTermo] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<ClientePerfil[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);

  // Vínculo de Múltiplos Documentos com QR Code (CNH, CNI, e-GOB, Militares, OAB)
  const [modalVincularAberto, setModalVincularAberto] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [novoDocTipo, setNovoDocTipo] = useState<'CNH' | 'CNI' | 'E_GOB_CARD' | 'MILITAR' | 'ENTIDADE_CLASSE' | 'OUTRO'>('CNH');
  const [novoDocRotulo, setNovoDocRotulo] = useState('CNH Digital');
  const [novoDocCodigo, setNovoDocCodigo] = useState('');
  const [vinculandoDoc, setVinculandoDoc] = useState(false);
  const [erroVincular, setErroVincular] = useState<string | null>(null);

  const handleVincularDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente?.id) return;
    if (!novoDocCodigo.trim()) {
      setErroVincular('O código ou leitura do QR Code é obrigatório.');
      return;
    }
    try {
      setVinculandoDoc(true);
      setErroVincular(null);
      const res = await api.post(`/comandas/cliente/${cliente.id}/vincular-documento`, {
        tipo: novoDocTipo,
        rotulo: novoDocRotulo.trim() || novoDocTipo,
        codigo: novoDocCodigo.trim()
      });
      setCliente(prev => prev ? { ...prev, identificadores_qr: res.data.identificadores_qr } : prev);
      setMensagemSucesso(`✓ Documento '${novoDocRotulo}' vinculado com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
      setModalVincularAberto(false);
      setNovoDocCodigo('');
    } catch (err: any) {
      setErroVincular(err.response?.data?.detail || 'Erro ao vincular documento.');
    } finally {
      setVinculandoDoc(false);
    }
  };

  const handleDesvincularDocumento = async (docId: string) => {
    if (!cliente?.id) return;
    if (!window.confirm('Deseja realmente desvincular este documento de sua conta?')) return;
    try {
      const res = await api.delete(`/comandas/cliente/${cliente.id}/desvincular-documento/${docId}`);
      setCliente(prev => prev ? { ...prev, identificadores_qr: res.data.identificadores_qr } : prev);
      setMensagemSucesso('✓ Documento desvinculado com sucesso.');
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao desvincular documento.');
    }
  };

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
      setDependentes(dados.dependentes || []);
      const lims: Record<number, string> = {};
      for (const d of dados.dependentes || []) {
        lims[d.id] = d.limite_sessao !== null && d.limite_sessao !== undefined ? String(d.limite_sessao) : '';
      }
      setLimitesDepEdit(lims);

      setTelefoneEdit(dados.cliente?.telefone || '');
      setEmailEdit(dados.cliente?.email || '');
      setObsEdit(dados.cliente?.observacao || '');

      // Se tiver comanda aberta, pré-seleciona a sub-aba de pagamento na Carteira mantendo a visão inicial limpa
      if (dados.comanda_aberta && dados.comanda_aberta.total > 0) {
        setSubAbaCarteira('pagamento');
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

  // Confirmar Recarga Pix ou Cartão
  const handleConfirmarRecarga = async () => {
    if (!cliente) return;
    const valorEfetivo = valorCustomizado ? parseFloat(valorCustomizado) : valorRecarga;
    if (isNaN(valorEfetivo) || valorEfetivo <= 0) {
      alert('Informe um valor de recarga válido.');
      return;
    }

    if (metodoRecarga === 'cartao') {
      const numLimpo = cartaoNumero.replace(/\s+/g, '');
      if (numLimpo.length < 13) {
        alert('Por favor, informe um número de cartão de crédito válido.');
        return;
      }
      if (!cartaoNome.trim()) {
        alert('Por favor, informe o nome impresso no cartão.');
        return;
      }
      if (cartaoValidade.length < 5) {
        alert('Informe a validade no formato MM/AA.');
        return;
      }
      if (cartaoCvv.length < 3) {
        alert('Informe o código de segurança (CVV).');
        return;
      }
    }

    try {
      setProcessandoRecarga(true);
      const res = await api.post('/comandas/carteira/recarga', {
        cliente_id: cliente.id,
        valor: valorEfetivo,
        forma_pagamento: metodoRecarga === 'cartao' ? 'cartao_credito' : 'pix',
        observacao: metodoRecarga === 'cartao'
          ? 'Recarga Online via Cartão de Crédito'
          : 'Recarga Instantânea via Portal do Irmão',
        dados_cartao: metodoRecarga === 'cartao' ? {
          numero: cartaoNumero.replace(/\s+/g, ''),
          nome_titular: cartaoNome.trim().toUpperCase(),
          validade: cartaoValidade,
          cvv: cartaoCvv,
          salvar_cartao: salvarCartao
        } : undefined
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

    if (formaQuitacao === 'cartao_credito') {
      const numLimpo = cartaoNumero.replace(/\s+/g, '');
      if (numLimpo.length < 13) {
        alert('Por favor, informe um número de cartão de crédito válido (13 a 16 dígitos).');
        return;
      }
      if (!cartaoNome.trim()) {
        alert('Por favor, informe o nome impresso no cartão.');
        return;
      }
      if (cartaoValidade.length < 5) {
        alert('Informe a validade no formato MM/AA.');
        return;
      }
      if (cartaoCvv.length < 3) {
        alert('Informe o código de segurança (CVV).');
        return;
      }
    }

    try {
      setProcessandoQuitacao(true);
      await api.post(`/comandas/cliente/${cliente.id}/quitar-comanda-aberta`, {
        forma_pagamento: formaQuitacao,
        devolver_cartao: devolverCartaoAuto,
        dados_cartao: formaQuitacao === 'cartao_credito' ? {
          numero: cartaoNumero.replace(/\s+/g, ''),
          nome_titular: cartaoNome.trim().toUpperCase(),
          validade: cartaoValidade,
          cvv: cartaoCvv,
          salvar_cartao: salvarCartao
        } : undefined
      });
      setMostrarPixQuitacao(false);
      setMensagemSucesso('✓ Comanda da noite quitada com sucesso! Seu cartão foi liberado.');
      setTimeout(() => setMensagemSucesso(null), 5000);
      setCartaoNumero('');
      setCartaoNome('');
      setCartaoValidade('');
      setCartaoCvv('');
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
    <div className="relative h-[calc(100vh-3.5rem)] flex flex-col p-3 sm:p-4 max-w-lg lg:max-w-2xl mx-auto overflow-hidden animate-fadeIn select-none text-slate-100 font-sans gap-2.5">
      {/* Esferas de Iluminação Ambiente */}
      <div className="pointer-events-none absolute -top-14 -left-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 right-0 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />

      {/* Toast de Sucesso */}
      {mensagemSucesso && (
        <div className="relative z-20 shrink-0 px-3.5 py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center gap-2 shadow-xl backdrop-blur-xl text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="truncate">{mensagemSucesso}</span>
        </div>
      )}

      {/* CABEÇALHO COMPACTO DO CLIENTE / IRMÃO */}
      <header className="relative z-10 shrink-0 bg-[#0f131c]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-black text-sm shrink-0 relative">
            {cliente?.nome ? getIniciais(cliente.nome) : 'IR'}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f131c]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm font-black text-white tracking-tight truncate">
                Ir.'. {cliente?.nome || 'Obreiro'}
              </h1>
              {cliente?.cim && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shrink-0">
                  CIM {cliente.cim}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {cliente?.nome_loja_origem || 'Loja Mantenedora'}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setModalTrocarCliente(true);
            handleBuscarClientes('');
          }}
          className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-bold text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          title="Trocar Irmão"
        >
          <User className="w-3.5 h-3.5 text-cyan-400" />
          <span>Trocar</span>
        </button>
      </header>

      {/* CARTÃO EM CASCATA 1: DADOS PESSOAIS */}
      <section
        className={`relative z-10 bg-[#0f131c] border rounded-2xl transition-all overflow-hidden flex flex-col ${
          cartaoAberto === 'dados'
            ? 'flex-1 min-h-0 border-emerald-400/40 shadow-xl'
            : 'shrink-0 border-white/10 hover:border-white/20'
        }`}
      >
        <button
          type="button"
          onClick={() => setCartaoAberto((prev) => (prev === 'dados' ? null : 'dados'))}
          className="w-full shrink-0 px-3.5 py-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Dados Pessoais</span>
                {dependentes.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[9px] font-bold text-cyan-300">
                    {dependentes.length} dep.
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Cadastro • Dependentes • Identificação
              </span>
            </div>
          </div>
          {cartaoAberto === 'dados' ? (
            <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {cartaoAberto === 'dados' && (
          <div className="flex-1 min-h-0 flex flex-col border-t border-white/10">
            {/* Sub-abas em cascata: Cadastro | Dependentes | Identificação */}
            <div className="shrink-0 grid grid-cols-3 gap-1.5 p-2.5 bg-[#0a0e17] border-b border-white/10">
              {[
                { id: 'cadastro' as const, label: 'Cadastro' },
                { id: 'dependentes' as const, label: `Dependentes${dependentes.length ? ` (${dependentes.length})` : ''}` },
                { id: 'identificacao' as const, label: 'Identificação' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubAbaDados(tab.id)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    subAbaDados === tab.id
                      ? 'bg-[#10b981] text-[#022c22] shadow-sm'
                      : 'bg-[#181b25] text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
              {/* SUB-ABA 1.1: CADASTRO (LEITURA E EDIÇÃO) */}
              {subAbaDados === 'cadastro' && (
                <div className="space-y-3">
                  {sucessoContato && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Dados atualizados com sucesso!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={cliente?.nome || ''}
                        className="w-full bg-[#181b25] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-semibold cursor-not-allowed opacity-85"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Loja Mantenedora
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={cliente?.nome_loja_origem || 'Loja Atual'}
                        className="w-full bg-[#181b25] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-300 cursor-not-allowed opacity-85"
                      />
                    </div>

                    {/* CIM e CPF SEPARADOS */}
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        CIM (Obreiro)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={cliente?.cim || 'Não informado'}
                        className="w-full bg-[#181b25] border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono font-bold cursor-not-allowed opacity-90"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        CPF (Documento Federal)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={
                          cliente?.cpf && !cliente.cpf.startsWith('CIM:') && !cliente.cpf.startsWith('CAD:')
                            ? `${cliente.cpf.slice(0, 3)}.***.***-${cliente.cpf.slice(-2)}`
                            : 'Não informado'
                        }
                        className="w-full bg-[#181b25] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono cursor-not-allowed opacity-90"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>WhatsApp / Celular</span>
                      </label>
                      <input
                        type="text"
                        value={telefoneEdit}
                        onChange={(e) => setTelefoneEdit(e.target.value)}
                        placeholder="(62) 99999-9999"
                        className="w-full bg-[#0a0e17] border border-cyan-400/35 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span>E-mail</span>
                      </label>
                      <input
                        type="email"
                        value={emailEdit}
                        onChange={(e) => setEmailEdit(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        className="w-full bg-[#0a0e17] border border-cyan-400/35 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400">
                    Pelo menos um dos dois documentos (CIM ou CPF) é obrigatório para identificação.
                  </p>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Preferências / Restrições
                    </label>
                    <textarea
                      rows={2}
                      value={obsEdit}
                      onChange={(e) => setObsEdit(e.target.value)}
                      placeholder="Ex: Sem glúten, cerveja sem álcool..."
                      className="w-full bg-[#0a0e17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSalvarContato}
                      disabled={salvandoContato}
                      className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
                    >
                      {salvandoContato ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Salvar Alterações</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SUB-ABA 1.2: DEPENDENTES (LEITURA E EDIÇÃO) */}
              {subAbaDados === 'dependentes' && (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-400">
                    Gerencie limites por sessão ou pause a autorização dos dependentes vinculados ao seu cadastro.
                  </p>
                  {dependentes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#181b25] border border-white/10 text-xs text-slate-400 text-center">
                      Nenhum dependente vinculado. Dependentes podem ser adicionados pelo operador na confirmação da comanda.
                    </div>
                  ) : (
                    dependentes.map((dep) => (
                      <div
                        key={dep.id}
                        className={`p-3 rounded-xl bg-[#181b25] border space-y-2 ${
                          dep.autorizacao_pausada ? 'border-rose-500/40 opacity-80' : 'border-white/10'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-white">{dep.nome}</span>
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-[9px] font-bold text-cyan-300">
                                {dep.parentesco}
                              </span>
                              {dep.autorizacao_pausada && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[9px] font-bold text-rose-300">
                                  Pausado
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Consumo: <strong className="text-amber-400">R$ {dep.consumo_total.toFixed(2).replace('.', ',')}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleTogglePausaDependente(dep)}
                            disabled={salvandoDepId === dep.id}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                              dep.autorizacao_pausada
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                : 'bg-rose-500/15 border-rose-400/30 text-rose-300'
                            }`}
                          >
                            {dep.autorizacao_pausada ? 'Reativar' : 'Pausar'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                          <label className="text-[10px] text-slate-400">Limite sessão (R$):</label>
                          <input
                            type="number"
                            min="0"
                            step="5"
                            value={limitesDepEdit[dep.id] ?? ''}
                            onChange={(e) => setLimitesDepEdit((prev) => ({ ...prev, [dep.id]: e.target.value }))}
                            placeholder="Sem limite"
                            className="w-24 px-2 py-1 rounded-lg bg-[#0a0e17] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleSalvarLimiteDependente(dep)}
                            disabled={salvandoDepId === dep.id}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold cursor-pointer"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SUB-ABA 1.3: IDENTIFICAÇÃO (GERAR QR PESSOAL & ATRELAR DOCUMENTOS) */}
              {subAbaDados === 'identificacao' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-[#181b25] border border-emerald-400/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block">QR Code Pessoal de Balcão</span>
                      <span className="text-[10px] text-slate-400">
                        {cartaoAtivo || (cliente?.cim ? `CIM ${cliente.cim}` : `ID #${cliente?.id}`)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalQrExpandido(true)}
                      className="px-3 py-2 rounded-xl bg-[#10b981] text-[#022c22] text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Exibir QR</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-amber-300 block">
                        Documentos com QR Atrelados
                      </span>
                      <span className="text-[10px] text-slate-400">CNH, CNI, e-GOB Card ou Carteira de Classe</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNovoDocTipo('CNH');
                        setNovoDocRotulo('CNH Digital');
                        setNovoDocCodigo('');
                        setErroVincular(null);
                        setModalVincularAberto(true);
                      }}
                      className="px-2.5 py-1.5 bg-[#181b25] hover:bg-white/10 border border-amber-400/40 text-amber-300 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Atrelar</span>
                    </button>
                  </div>

                  {cliente?.identificadores_qr && cliente.identificadores_qr.length > 0 ? (
                    <div className="space-y-2">
                      {cliente.identificadores_qr.map((doc) => (
                        <div
                          key={doc.id || doc.codigo}
                          className="p-2.5 rounded-xl bg-[#181b25] border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-300 shrink-0">
                              <QrCode className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">{doc.rotulo}</span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                                  {doc.tipo}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 truncate block">
                                {doc.codigo.length > 28 ? `${doc.codigo.substring(0, 26)}...` : doc.codigo}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDesvincularDocumento(doc.id || doc.codigo)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg cursor-pointer shrink-0"
                            title="Desvincular"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#181b25]/60 border border-dashed border-white/10 text-center text-[11px] text-slate-400">
                      Nenhum documento externo atrelado. Clique em "Atrelar" para vincular CNH ou e-GOB Card.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* CARTÃO EM CASCATA 2: CARTEIRA (STATUS, SALDO, DEPÓSITO E PAGAMENTO) */}
      <section
        className={`relative z-10 bg-[#0f131c] border rounded-2xl transition-all overflow-hidden flex flex-col ${
          cartaoAberto === 'carteira'
            ? 'flex-1 min-h-0 border-emerald-400/40 shadow-xl'
            : 'shrink-0 border-white/10 hover:border-white/20'
        }`}
      >
        <button
          type="button"
          onClick={() => setCartaoAberto((prev) => (prev === 'carteira' ? null : 'carteira'))}
          className="w-full shrink-0 px-3.5 py-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-white/[0.02] transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-white">Carteira</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono font-bold text-emerald-300 tabular-nums">
                  R$ {carteira.saldo.toFixed(2).replace('.', ',')} • Ativa
                </span>
                {comandaAberta && comandaAberta.total > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[#090d16] text-[9px] font-black">
                    PENDENTE
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Status • Saldo • Depósito • Pagamento
              </span>
            </div>
          </div>
          {cartaoAberto === 'carteira' ? (
            <ChevronUp className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {cartaoAberto === 'carteira' && (
          <div className="flex-1 min-h-0 flex flex-col border-t border-white/10">
            {/* Sub-abas da Carteira: Status | Saldo | Depósito | Pagamento */}
            <div className="shrink-0 grid grid-cols-4 gap-1.5 p-2.5 bg-[#0a0e17] border-b border-white/10">
              {[
                { id: 'status' as const, label: 'Status' },
                { id: 'saldo' as const, label: 'Saldo' },
                { id: 'deposito' as const, label: 'Depósito' },
                { id: 'pagamento' as const, label: 'Pagamento' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubAbaCarteira(tab.id)}
                  className={`py-2 px-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer relative ${
                    subAbaCarteira === tab.id
                      ? 'bg-[#10b981] text-[#022c22] shadow-sm'
                      : 'bg-[#181b25] text-slate-300 hover:text-white border border-white/10'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'pagamento' && comandaAberta && comandaAberta.total > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
              {/* SUB-ABA 2.1: STATUS */}
              {subAbaCarteira === 'status' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#181b25] border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status da Conta</span>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Consumo Ativo
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#181b25] border border-white/10">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Limite Fiado</span>
                      <span className="text-sm font-black font-mono text-white mt-0.5 block">
                        R$ {carteira.limite_fiado.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#181b25] border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Comanda da Noite</span>
                      <span className={`text-base font-black font-mono ${comandaAberta && comandaAberta.total > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {comandaAberta && comandaAberta.total > 0
                          ? `#${comandaAberta.id} • R$ ${comandaAberta.total.toFixed(2).replace('.', ',')}`
                          : 'Nenhuma pendência'}
                      </span>
                    </div>
                    {comandaAberta && comandaAberta.total > 0 ? (
                      <button
                        type="button"
                        onClick={() => setSubAbaCarteira('pagamento')}
                        className="px-3 py-2 rounded-xl bg-amber-400 text-[#090d16] text-xs font-black cursor-pointer shrink-0"
                      >
                        Pagar Agora
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSubAbaCarteira('deposito')}
                        className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer shrink-0"
                      >
                        Depositar
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-ABA 2.2: SALDO E EXTRATO (RENDERIZADO ABAIXO) */}
              {subAbaCarteira === 'saldo' && (
                <div className="p-3 rounded-xl bg-[#181b25] border border-emerald-400/25 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Saldo Disponível</span>
                    <span className={`text-xl font-black font-mono tabular-nums ${carteira.saldo >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      R$ {carteira.saldo.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubAbaCarteira('deposito')}
                    className="px-3 py-2 rounded-xl bg-[#10b981] text-[#022c22] text-xs font-black cursor-pointer"
                  >
                    + Recarregar
                  </button>
                </div>
              )}
      {/* CONTEÚDO DA ABA 1: PAGAMENTOS (QUITAÇÃO DA COMANDA ABERTA / AUTO-CHECKOUT) */}
      {subAbaCarteira === 'pagamento' && (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* PIX */}
                  <button
                    onClick={() => {
                      setFormaQuitacao('pix');
                      handleGerarPixQuitacao();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      formaQuitacao === 'pix'
                        ? 'bg-[#171F33] border-[#10B981] text-white shadow-md ring-1 ring-[#10B981]'
                        : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center text-[#4EDEA3] shrink-0">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Pagar via Pix</span>
                        <span className="text-[11px] text-slate-400">QR Code dinâmico</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#4EDEA3] shrink-0" />
                  </button>

                  {/* CARTÃO DE CRÉDITO */}
                  <button
                    onClick={() => {
                      setFormaQuitacao('cartao_credito');
                      setMostrarPixQuitacao(false);
                      if (!cartaoNome && cliente?.nome) {
                        setCartaoNome(cliente.nome);
                      }
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      formaQuitacao === 'cartao_credito'
                        ? 'bg-[#171F33] border-[#818CF8] text-white shadow-md ring-1 ring-[#818CF8]'
                        : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#6366F1]/20 border border-[#818CF8]/40 flex items-center justify-center text-[#A5B4FC] shrink-0">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Cartão Crédito</span>
                        <span className="text-[11px] text-slate-400">Checkout Online</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#A5B4FC] shrink-0" />
                  </button>

                  {/* SALDO BAR */}
                  <button
                    onClick={() => {
                      if (carteira.saldo < comandaAberta.total) {
                        alert(`Saldo insuficiente na conta bar (R$ ${carteira.saldo.toFixed(2)}). Faça uma recarga ou quite via Pix/Cartão.`);
                        return;
                      }
                      setFormaQuitacao('carteira');
                      setMostrarPixQuitacao(false);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      formaQuitacao === 'carteira'
                        ? 'bg-[#171F33] border-[#38BDF8] text-white shadow-md ring-1 ring-[#38BDF8]'
                        : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                    } ${carteira.saldo < comandaAberta.total ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#7BD0FF] shrink-0">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-sm block">Saldo Bar</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          R$ {carteira.saldo.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-[#7BD0FF] shrink-0" />
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

              {/* Exibição do Formulário de Cartão de Crédito Online */}
              {formaQuitacao === 'cartao_credito' && (
                <div className="bg-[#0B1326] border border-[#818CF8]/40 rounded-2xl p-5 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#A5B4FC] flex items-center gap-2 font-mono">
                      <CreditCard className="w-4 h-4" /> Pagamento com Cartão de Crédito
                    </span>
                    <span className="text-[11px] font-mono text-[#4EDEA3] flex items-center gap-1 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Seguro
                    </span>
                  </div>

                  {/* Simulação Visual do Cartão */}
                  <div className="relative overflow-hidden w-full max-w-sm mx-auto h-44 rounded-2xl p-4 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-[#818CF8]/30 shadow-2xl flex flex-col justify-between text-white font-mono">
                    <div className="flex justify-between items-center">
                      <div className="w-10 h-7 rounded-md bg-amber-400/90 border border-amber-300 shadow-inner flex items-center justify-center">
                        <div className="w-6 h-3 border-t border-b border-amber-700/60" />
                      </div>
                      <span className="text-xs font-black tracking-widest text-[#A5B4FC]">
                        {detectarBandeira(cartaoNumero)}
                      </span>
                    </div>

                    <div className="text-base tracking-[0.2em] font-bold text-slate-200">
                      {cartaoNumero || '•••• •••• •••• ••••'}
                    </div>

                    <div className="flex justify-between items-end text-[10px]">
                      <div>
                        <span className="block text-[8px] text-slate-400 uppercase">Titular</span>
                        <span className="font-bold tracking-wider uppercase truncate max-w-[180px] block text-slate-200">
                          {cartaoNome || 'NOME DO TITULAR'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block text-[8px] text-slate-400 uppercase">Validade</span>
                        <span className="font-bold text-slate-200">{cartaoValidade || 'MM/AA'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Inputs Simétricos do Cartão */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                        Número do Cartão:
                      </label>
                      <input
                        type="text"
                        value={cartaoNumero}
                        onChange={(e) => setCartaoNumero(formatarNumeroCartao(e.target.value))}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[#818CF8]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                        Nome Impresso no Cartão:
                      </label>
                      <input
                        type="text"
                        value={cartaoNome}
                        onChange={(e) => setCartaoNome(e.target.value.toUpperCase())}
                        placeholder="EX: JOAO S SILVA"
                        className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white uppercase outline-none focus:border-[#818CF8]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                          Validade (MM/AA):
                        </label>
                        <input
                          type="text"
                          value={cartaoValidade}
                          onChange={(e) => setCartaoValidade(formatarValidade(e.target.value))}
                          placeholder="MM/AA"
                          maxLength={5}
                          className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[#818CF8]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                          CVV:
                        </label>
                        <input
                          type="password"
                          value={cartaoCvv}
                          onChange={(e) => setCartaoCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[#818CF8]"
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={salvarCartao}
                        onChange={(e) => setSalvarCartao(e.target.checked)}
                        className="w-4 h-4 accent-[#818CF8] rounded"
                      />
                      <span>Salvar este cartão com segurança para futuras compras (Token Asaas)</span>
                    </label>
                  </div>

                  <button
                    onClick={handleEfetivarQuitacao}
                    disabled={processandoQuitacao}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:brightness-110 text-white font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    {processandoQuitacao ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pagar R$ {comandaAberta.total.toFixed(2)} no Cartão de Crédito</span>
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
                  onClick={() => setSubAbaCarteira('deposito')}
                  className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-[#7BD0FF] flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Inserir Créditos Pré-pagos</span>
                </button>
                <button
                  onClick={() => setSubAbaCarteira('saldo')}
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
      {subAbaCarteira === 'deposito' && (
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

          {/* Escolha do Método de Recarga: Pix ou Cartão */}
          <div className="space-y-2 pt-2 border-t border-[#334155]">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block font-mono">
              Forma de Pagamento da Recarga:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMetodoRecarga('pix')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  metodoRecarga === 'pix'
                    ? 'bg-[#171F33] border-[#10B981] text-[#4EDEA3] shadow-md ring-1 ring-[#10B981]'
                    : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#4EDEA3]" />
                <span>Pix Instantâneo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMetodoRecarga('cartao');
                  if (!cartaoNome && cliente?.nome) {
                    setCartaoNome(cliente.nome);
                  }
                }}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  metodoRecarga === 'cartao'
                    ? 'bg-[#171F33] border-[#818CF8] text-[#A5B4FC] shadow-md ring-1 ring-[#818CF8]'
                    : 'bg-[#0B1326] border-[#334155] text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#818CF8]" />
                <span>Cartão de Crédito</span>
              </button>
            </div>
          </div>

          {/* QR Code Pix para Recarga */}
          {metodoRecarga === 'pix' && mostrarPixRecarga && (
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

          {/* Formulário Cartão de Crédito para Recarga */}
          {metodoRecarga === 'cartao' && (
            <div className="bg-[#0B1326] border border-[#818CF8]/40 rounded-2xl p-5 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-[#334155] pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#A5B4FC] flex items-center gap-2 font-mono">
                  <CreditCard className="w-4 h-4" /> Recarga com Cartão de Crédito
                </span>
                <span className="text-[11px] font-mono text-[#4EDEA3] flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Seguro
                </span>
              </div>

              {/* Simulação Visual do Cartão */}
              <div className="relative overflow-hidden w-full max-w-sm mx-auto h-44 rounded-2xl p-4 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 border border-[#818CF8]/30 shadow-2xl flex flex-col justify-between text-white font-mono">
                <div className="flex justify-between items-center">
                  <div className="w-10 h-7 rounded-md bg-amber-400/90 border border-amber-300 shadow-inner flex items-center justify-center">
                    <div className="w-6 h-3 border-t border-b border-amber-700/60" />
                  </div>
                  <span className="text-xs font-black tracking-widest text-[#A5B4FC]">
                    {detectarBandeira(cartaoNumero)}
                  </span>
                </div>

                <div className="text-base tracking-[0.2em] font-bold text-slate-200">
                  {cartaoNumero || '•••• •••• •••• ••••'}
                </div>

                <div className="flex justify-between items-end text-[10px]">
                  <div>
                    <span className="block text-[8px] text-slate-400 uppercase">Titular</span>
                    <span className="font-bold tracking-wider uppercase truncate max-w-[180px] block text-slate-200">
                      {cartaoNome || 'NOME DO TITULAR'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] text-slate-400 uppercase">Validade</span>
                    <span className="font-bold text-slate-200">{cartaoValidade || 'MM/AA'}</span>
                  </div>
                </div>
              </div>

              {/* Inputs Simétricos do Cartão */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                    Número do Cartão:
                  </label>
                  <input
                    type="text"
                    value={cartaoNumero}
                    onChange={(e) => setCartaoNumero(formatarNumeroCartao(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[#818CF8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                    Nome Impresso no Cartão:
                  </label>
                  <input
                    type="text"
                    value={cartaoNome}
                    onChange={(e) => setCartaoNome(e.target.value.toUpperCase())}
                    placeholder="EX: JOAO S SILVA"
                    className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white uppercase outline-none focus:border-[#818CF8]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                      Validade (MM/AA):
                    </label>
                    <input
                      type="text"
                      value={cartaoValidade}
                      onChange={(e) => setCartaoValidade(formatarValidade(e.target.value))}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[#818CF8]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                      CVV:
                    </label>
                    <input
                      type="password"
                      value={cartaoCvv}
                      onChange={(e) => setCartaoCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full bg-[#171F33] border border-[#334155] rounded-xl px-3.5 py-2.5 text-sm font-mono text-white outline-none focus:border-[#818CF8]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={salvarCartao}
                    onChange={(e) => setSalvarCartao(e.target.checked)}
                    className="w-4 h-4 accent-[#818CF8] rounded"
                  />
                  <span>Salvar este cartão com segurança para futuras recargas (Token Asaas)</span>
                </label>
              </div>

              <button
                onClick={handleConfirmarRecarga}
                disabled={processandoRecarga}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:brightness-110 text-white font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                {processandoRecarga ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Recarregar R$ {(valorCustomizado ? parseFloat(valorCustomizado) : valorRecarga).toFixed(2)} no Cartão</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO DA ABA 3: RELATÓRIO (FATURAS E HISTÓRICO DE SESSÕES) */}
      {subAbaCarteira === 'saldo' && (
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
            </div>
          </div>
        )}
      </section>

      {/* ÁREA RESTANTE DA TELA: QR CODE DO CLIENTE OU BARRA COMPACTA PARA EXPANDIR */}
      {cartaoAberto === null ? (
        <section className="relative z-10 flex-1 min-h-0 bg-gradient-to-b from-[#131B2E] via-[#0B1326] to-[#070F1E] border border-emerald-400/30 rounded-3xl p-4 shadow-2xl flex flex-col items-center justify-between text-center overflow-hidden">
          <div className="shrink-0">
            <span className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-emerald-300 block font-mono">
              Credencial Digital • Balcão
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col items-center justify-center py-2">
            <div className="p-3.5 bg-white rounded-2xl shadow-2xl border-2 border-emerald-400/70 inline-flex flex-col items-center">
              <QRCode
                value={getQrCodeValor()}
                size={156}
                bgColor="#FFFFFF"
                fgColor="#070F1E"
                level="H"
              />
              <span className="mt-2 pt-1.5 border-t border-slate-200 w-full text-center font-mono text-[10px] font-black tracking-wider text-[#070F1E]">
                {cartaoAtivo || (cliente?.cim ? `CIM ${cliente.cim}` : `ID ${cliente?.id}`)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Apresente ao operador do bar para identificação imediata
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalQrExpandido(true)}
            className="shrink-0 w-full h-11 px-4 rounded-2xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(16,185,129,0.25)] transition cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Expandir QR Code para Leitura</span>
          </button>
        </section>
      ) : (
        <div className="relative z-10 shrink-0 px-3.5 py-2.5 rounded-2xl bg-[#0f131c] border border-emerald-400/35 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center">
              <QRCode value={getQrCodeValor()} size={24} bgColor="#FFFFFF" fgColor="#070F1E" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-white block truncate">Credencial Digital</span>
              <span className="text-[10px] font-mono text-emerald-300 block truncate">
                {cartaoAtivo || (cliente?.cim ? `CIM ${cliente.cim}` : `ID ${cliente?.id}`)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalQrExpandido(true)}
            className="shrink-0 h-10 px-3.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-[11px] flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Expandir QR</span>
          </button>
        </div>
      )}

      {/* MODAL TELA CHEIA: APRESENTAÇÃO DO QR CODE PARA O LEITOR / BALCÃO */}
      {modalQrExpandido && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#0B1326] border-2 border-[#DDB96B]/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(221,185,107,0.2)] text-center relative">
            <button
              onClick={() => setModalQrExpandido(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#1E293B] text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-4">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#DDB96B] block">
                Leitura Óptica no Balcão
              </span>
              <h3 className="text-lg font-black text-white">
                {cliente?.nome || 'Obreiro'}
              </h3>
              <p className="text-xs text-slate-400">
                Aproxime o QR Code do scanner ou da câmera
              </p>
            </div>

            {/* Bloco Branco de Alto Contraste para Bipagem Instantânea */}
            <div className="my-4 p-6 bg-white rounded-3xl shadow-2xl inline-block border-4 border-[#FDE68A]">
              <QRCode
                value={getQrCodeValor()}
                size={230}
                bgColor="#FFFFFF"
                fgColor="#070F1E"
                level="H"
              />
              <div className="mt-3 pt-2 border-t border-slate-200">
                <span className="font-mono text-xs font-black tracking-widest text-[#070F1E] block">
                  {cartaoAtivo || (cliente?.cim ? `CIM ${cliente.cim}` : `ID ${cliente?.id}`)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setModalQrExpandido(false)}
                className="w-full min-h-[44px] px-4 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Voltar ao Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VINCULAR NOVO DOCUMENTO (CNH, CNI, E-GOB, MILITAR, OAB) */}
      {modalVincularAberto && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0B1326] border border-[#DDB96B]/50 rounded-3xl shadow-2xl p-6 sm:p-7 relative text-left">
            <button
              onClick={() => setModalVincularAberto(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#1E293B] text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 mb-5">
              <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#DDB96B] block">
                Nova Credencial
              </span>
              <h3 className="text-lg font-black text-white">
                Vincular Documento com QR Code
              </h3>
              <p className="text-xs text-slate-400">
                Atrele sua CNH, e-GOB Card ou carteira de classe ao seu cadastro.
              </p>
            </div>

            {erroVincular && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <X className="w-4 h-4 shrink-0" />
                <span>{erroVincular}</span>
              </div>
            )}

            <form onSubmit={handleVincularDocumento} className="space-y-4">
              {/* Seleção do Tipo de Documento em Pílulas Simétricas */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Tipo de Documento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { tipo: 'CNH', label: 'CNH' },
                    { tipo: 'CNI', label: 'CNI' },
                    { tipo: 'E_GOB_CARD', label: 'e-GOB' },
                    { tipo: 'MILITAR', label: 'Militar' },
                    { tipo: 'ENTIDADE_CLASSE', label: 'OAB/CRM' },
                    { tipo: 'OUTRO', label: 'Outro' }
                  ].map(item => (
                    <button
                      key={item.tipo}
                      type="button"
                      onClick={() => {
                        setNovoDocTipo(item.tipo as any);
                        if (item.tipo === 'CNH') setNovoDocRotulo('CNH Digital');
                        else if (item.tipo === 'CNI') setNovoDocRotulo('Nova Carteira de Identidade (CNI)');
                        else if (item.tipo === 'E_GOB_CARD') setNovoDocRotulo('e-GOB Card Oficial');
                        else if (item.tipo === 'MILITAR') setNovoDocRotulo('Carteira Funcional Militar');
                        else if (item.tipo === 'ENTIDADE_CLASSE') setNovoDocRotulo('Carteira de Classe (OAB/CRM)');
                        else setNovoDocRotulo('Cartão de Acesso');
                      }}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        novoDocTipo === item.tipo
                          ? 'bg-[#DDB96B]/20 border-[#DDB96B] text-[#FDE68A] shadow-sm'
                          : 'bg-[#131B2E] border-[#334155] text-slate-400 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rótulo Descritivo */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Nome / Rótulo de Identificação
                </label>
                <input
                  type="text"
                  value={novoDocRotulo}
                  onChange={e => setNovoDocRotulo(e.target.value)}
                  placeholder="Ex: CNH Digital do Serpro"
                  className="w-full min-h-[42px] px-3.5 rounded-xl bg-[#070F1E] border border-[#334155] text-white text-xs outline-none focus:border-[#DDB96B]"
                  required
                />
              </div>

              {/* Código ou Leitura por Câmera */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    Conteúdo / Leitura do QR Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="text-xs font-bold text-[#4EDEA3] hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Ler com Câmera</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={novoDocCodigo}
                    onChange={e => setNovoDocCodigo(e.target.value)}
                    placeholder="Cole ou escaneie o QR Code do documento..."
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#070F1E] border border-[#334155] text-white text-xs font-mono outline-none focus:border-[#DDB96B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="px-3 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 rounded-xl flex items-center justify-center cursor-pointer"
                    title="Abrir scanner de câmera"
                  >
                    <Camera className="w-4 h-4 text-[#DDB96B]" />
                  </button>
                </div>
              </div>

              {/* Botões Finais de Ação */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalVincularAberto(false)}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 font-bold text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={vinculandoDoc}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#DDB96B] to-[#FDE68A] hover:brightness-110 text-[#070F1E] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {vinculandoDoc ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Confirmar Vínculo</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CÂMERA PARA LER O QR CODE DO DOCUMENTO */}
      <LeitorQrCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onScanSuccess={(codigo) => {
          setNovoDocCodigo(codigo.trim());
          setIsCameraModalOpen(false);
          setErroVincular(null);
        }}
        titulo="Escanear QR Code do Documento"
        subtitulo="Aponte para o QR Code da CNH, CNI, e-GOB Card ou Carteira de Classe"
      />


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
