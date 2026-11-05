import { useEffect, useState, useRef, type FormEvent } from 'react';
import { api } from '../services/api';
import { 
  Plus, 
  CreditCard, 
  X, 
  ClipboardList, 
  Barcode, 
  Zap, 
  Check, 
  RotateCcw, 
  Camera, 
  Smartphone,
  Trash2,
  Search,
  Minus,
  User,
  CreditCard as CardIcon
} from 'lucide-react';
import { LeitorQrCameraModal } from '../components/LeitorQrCameraModal';
import { ComprovanteTermicoModal, type DadosComprovante } from '../components/ComprovanteTermicoModal';
import { FecharComandaModal } from '../components/FecharComandaModal';
import { RecargaBarModal } from '../components/RecargaBarModal';
import { PdvMobileScannerModal } from '../components/PdvMobileScannerModal';

interface ItemComanda {
  id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  status?: string;
}

interface Comanda {
  id: number;
  cliente_id?: number;
  operador_id?: number;
  forma_pagamento?: string;
  nome_cliente?: string;
  identificador_cartao?: string;
  status: 'ABERTA' | 'FECHADA' | 'CANCELADA';
  data_abertura: string;
  total?: number;
  itens: ItemComanda[];
}

interface Produto {
  id: number;
  nome: string;
  preco_venda: number;
  quantidade_gondola?: number;
  quantidade_estoque: number;
  codigo_barras?: string;
  qr_code_tag?: string;
  marca?: string;
}

export function Comandas() {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);

  // Modo de Operação (Balcão Rápido vs Gestão de Mesas)
  const [modoBalcaoRapido, setModoBalcaoRapido] = useState(true);

  // Estados da Câmera Scanner e Modo PDV Mobile Contínuo
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'cartao_balcao' | 'produto_balcao' | 'coringa_associar' | 'coringa_devolver' | 'nova_comanda'>('cartao_balcao');
  const [isPdvMobileModalOpen, setIsPdvMobileModalOpen] = useState(false);

  // Estados do Fluxo Cascateado no Balcão
  const [cartaoClienteInput, setCartaoClienteInput] = useState('');
  const [comandaBalcaoAtiva, setComandaBalcaoAtiva] = useState<Comanda | null>(null);
  const [codigoProdutoInput, setCodigoProdutoInput] = useState('');
  const [produtoConferencia, setProdutoConferencia] = useState<Produto | null>(null);
  const [qtdConferencia, setQtdConferencia] = useState(1);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);
  const [processandoAcao, setProcessandoAcao] = useState(false);

  // Refs de foco
  const inputCartaoRef = useRef<HTMLInputElement>(null);
  const inputProdutoRef = useRef<HTMLInputElement>(null);

  // Estados dos Modais de Fechamento, Térmica e Recarga
  const [isModalFecharOpen, setIsModalFecharOpen] = useState(false);
  const [comandaParaFechar, setComandaParaFechar] = useState<Comanda | null>(null);
  const [comprovanteAtual, setComprovanteAtual] = useState<DadosComprovante | null>(null);
  const [isModalTermicoOpen, setIsModalTermicoOpen] = useState(false);
  const [isModalRecargaOpen, setIsModalRecargaOpen] = useState(false);
  const [clienteRecarga, setClienteRecarga] = useState<{ id: number; nome: string; saldo?: number } | null>(null);

  // Modal Cartões de Visitante (Coringa)
  const [isModalCoringaAberto, setIsModalCoringaAberto] = useState(false);
  const [coringaAba, setCoringaAba] = useState<'ENTREGAR' | 'DEVOLVER'>('ENTREGAR');
  const [coringaCodigo, setCoringaCodigo] = useState('');
  const [coringaNome, setCoringaNome] = useState('');
  const [coringaCpf, setCoringaCpf] = useState('');
  const [devolverCodigoCartao, setDevolverCodigoCartao] = useState('');

  // Modal Mesas (Nova Comanda)
  const [isModalNovaOpen, setIsModalNovaOpen] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<Comanda | null>(null);
  const [nomeCliente, setNomeCliente] = useState('');
  const [identificadorCartao, setIdentificadorCartao] = useState('');
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadeItem, setQuantidadeItem] = useState('1');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [respComandas, respProdutos] = await Promise.all([
        api.get('/comandas/'),
        api.get('/produtos/')
      ]);
      setComandas(respComandas.data);
      setProdutos(respProdutos.data);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    }
  };

  /**
   * Câmera: Leitura de QR Code
   */
  const handleLeituraCamera = async (codigoLido: string) => {
    setIsCameraScannerOpen(false);
    if (!codigoLido) return;

    if (cameraTarget === 'cartao_balcao') {
      await processarIdentificacaoCliente(codigoLido.trim());
    } else if (cameraTarget === 'produto_balcao') {
      await processarBuscaProduto(codigoLido.trim());
    } else if (cameraTarget === 'coringa_associar') {
      setCoringaCodigo(codigoLido.trim());
    } else if (cameraTarget === 'coringa_devolver') {
      setDevolverCodigoCartao(codigoLido.trim());
    } else if (cameraTarget === 'nova_comanda') {
      setIdentificadorCartao(codigoLido.trim());
    }
  };

  /**
   * ETAPA 1: Identificar Cliente
   */
  const processarIdentificacaoCliente = async (identificador: string) => {
    if (!identificador.trim()) return;
    setProcessandoAcao(true);
    try {
      const res = await api.post('/comandas/identificar-cartao', {
        identificador_cartao: identificador.trim()
      });
      setComandaBalcaoAtiva(res.data);
      setCartaoClienteInput('');
      setSucessoFeedback(`Cliente identificado: ${res.data.nome_cliente || res.data.identificador_cartao}`);
      setTimeout(() => setSucessoFeedback(null), 3000);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao identificar cliente pelo QR Code / CPF informado.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleIdentificarClienteSubmit = (e: FormEvent) => {
    e.preventDefault();
    processarIdentificacaoCliente(cartaoClienteInput);
  };

  /**
   * ETAPA 2: Buscar Produto para Conferência
   */
  const processarBuscaProduto = async (codigo: string) => {
    if (!codigo.trim()) return;
    setProcessandoAcao(true);
    try {
      const res = await api.get(`/produtos/codigo/${encodeURIComponent(codigo.trim())}`);
      setProdutoConferencia(res.data);
      setQtdConferencia(1);
      setCodigoProdutoInput('');
    } catch (err: any) {
      alert(err.response?.data?.detail || `Produto não encontrado para o código: ${codigo}`);
      setCodigoProdutoInput('');
    } finally {
      setProcessandoAcao(false);
    }
  };

  const handleBiparProdutoSubmit = (e: FormEvent) => {
    e.preventDefault();
    processarBuscaProduto(codigoProdutoInput);
  };

  /**
   * CONFIRMAÇÃO EXPLÍCITA: Adicionar Item na Comanda
   */
  const handleConfirmarInclusaoItem = async () => {
    if (!comandaBalcaoAtiva || !produtoConferencia) return;

    setProcessandoAcao(true);
    try {
      await api.post(`/comandas/${comandaBalcaoAtiva.id}/itens`, {
        produto_id: produtoConferencia.id,
        quantidade: qtdConferencia
      });

      // Recarrega a comanda ativa para refletir os itens e o saldo
      const res = await api.get(`/comandas/${comandaBalcaoAtiva.id}`);
      setComandaBalcaoAtiva(res.data);

      setSucessoFeedback(`+${qtdConferencia}x ${produtoConferencia.nome} adicionado ao pedido!`);
      setTimeout(() => setSucessoFeedback(null), 3500);

      // Limpa a conferência após adição confirmada
      setProdutoConferencia(null);
      setQtdConferencia(1);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao adicionar item à comanda.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  /**
   * Estornar/Remover Item da Comanda
   */
  const handleRemoverItem = async (itemId: number) => {
    if (!comandaBalcaoAtiva) return;
    if (!confirm("Deseja realmente remover este item da comanda? O estoque será devolvido à gôndola.")) return;

    setProcessandoAcao(true);
    try {
      const res = await api.delete(`/comandas/${comandaBalcaoAtiva.id}/itens/${itemId}`);
      setComandaBalcaoAtiva(res.data);
      setSucessoFeedback("Item estornado com sucesso!");
      setTimeout(() => setSucessoFeedback(null), 3000);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao estornar item.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  /**
   * Reiniciar atendimento
   */
  const handleTrocarCliente = () => {
    setComandaBalcaoAtiva(null);
    setProdutoConferencia(null);
    setQtdConferencia(1);
    setCartaoClienteInput('');
    setCodigoProdutoInput('');
  };

  /**
   * ETAPA 3: Fechamento Deliberado
   */
  const abrirModalFechamento = (comanda: Comanda) => {
    setComandaParaFechar(comanda);
    setIsModalFecharOpen(true);
  };

  const handleFechamentoSucesso = (comprovante: DadosComprovante) => {
    setComprovanteAtual(comprovante);
    setIsModalTermicoOpen(true);
    setSucessoFeedback(`Comanda #${comprovante.comanda_id} encerrada com sucesso! Emitindo comprovante térmico...`);
    if (comandaBalcaoAtiva?.id === comprovante.comanda_id) {
      setComandaBalcaoAtiva(null);
    }
    if (comandaSelecionada?.id === comprovante.comanda_id) {
      setComandaSelecionada(null);
    }
    carregarDados();
    setTimeout(() => setSucessoFeedback(null), 4000);
  };

  const abrirRecargaCliente = (clienteId: number, nome: string, saldo?: number) => {
    setClienteRecarga({ id: clienteId, nome, saldo });
    setIsModalRecargaOpen(true);
  };

  const getProdutoNome = (id: number) => {
    const prod = produtos.find(p => p.id === id);
    return prod ? prod.nome : `Produto #${id}`;
  };

  // Funções de Cartão Coringa (Visitantes)
  const handleAssociarCoringa = async (e: FormEvent) => {
    e.preventDefault();
    if (!coringaCodigo.trim() || !coringaCpf.trim() || !coringaNome.trim()) {
      alert("Código do Cartão, CPF e Nome são obrigatórios.");
      return;
    }
    try {
      const res = await api.post('/cartoes/associar-coringa', {
        codigo_cartao: coringaCodigo.trim(),
        cliente_cpf: coringaCpf.trim(),
        cliente_nome: coringaNome.trim()
      });
      setSucessoFeedback(res.data.mensagem || `Cartão ${coringaCodigo} associado!`);
      setTimeout(() => setSucessoFeedback(null), 4000);
      setIsModalCoringaAberto(false);
      setCoringaCodigo(''); setCoringaNome(''); setCoringaCpf('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao associar cartão.");
    }
  };

  const handleDevolverCoringa = async (e: FormEvent) => {
    e.preventDefault();
    if (!devolverCodigoCartao.trim()) return;
    try {
      const res = await api.post('/cartoes/devolver-coringa', {
        codigo_cartao: devolverCodigoCartao.trim()
      });
      setSucessoFeedback(`Cartão ${devolverCodigoCartao} devolvido com sucesso! Total consumido: R$ ${(res.data.total_consumido || 0).toFixed(2)}`);
      setTimeout(() => setSucessoFeedback(null), 5000);
      setIsModalCoringaAberto(false);
      setDevolverCodigoCartao('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao devolver cartão.");
    }
  };

  // Funções de Mesas Tradicionais
  const abrirNovaComanda = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/comandas/', {
        nome_cliente: nomeCliente,
        identificador_cartao: identificadorCartao
      });
      setIsModalNovaOpen(false);
      setNomeCliente(''); setIdentificadorCartao('');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao abrir comanda.");
    }
  };

  const adicionarItemManual = async (e: FormEvent) => {
    e.preventDefault();
    if (!comandaSelecionada) return;
    try {
      await api.post(`/comandas/${comandaSelecionada.id}/itens`, {
        produto_id: parseInt(produtoSelecionadoId),
        quantidade: parseInt(quantidadeItem)
      });
      const resp = await api.get(`/comandas/${comandaSelecionada.id}`);
      setComandaSelecionada(resp.data);
      setProdutoSelecionadoId(''); setQuantidadeItem('1');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao adicionar item.");
    }
  };

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      
      {/* ============================================================== */}
      {/* 1. CABEÇALHO SIMÉTRICO E CONTROLE DE MODO                      */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#DDB96B]/20 pb-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FDE68A] flex items-center gap-2">
            <ClipboardList className="text-[#DDB96B] w-6 h-6" />
            Atendimento & Comandas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Fluxo cascateado de balcão ou gestão de mesas
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Segmented Control Simétrico */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0A1428] border border-[#DDB96B]/25 w-full sm:w-64">
            <button
              onClick={() => setModoBalcaoRapido(true)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modoBalcaoRapido
                  ? 'bg-[#DDB96B] text-[#070F1E] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Zap size={14} />
              <span>Balcão</span>
            </button>
            <button
              onClick={() => setModoBalcaoRapido(false)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !modoBalcaoRapido
                  ? 'bg-[#DDB96B] text-[#070F1E] shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ClipboardList size={14} />
              <span>Mesas</span>
            </button>
          </div>

          {/* Botão Secundário para Cartões Coringa */}
          <button
            onClick={() => setIsModalCoringaAberto(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#0A1428] border border-slate-700 hover:border-[#DDB96B]/40 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            title="Gerenciar cartões coringa para visitantes"
          >
            <CardIcon size={14} />
            <span className="hidden sm:inline">Visitantes</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK FLUTUANTE */}
      {sucessoFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fadeIn">
          <Check size={16} /> {sucessoFeedback}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MODO BALCÃO: FLUXO CASCATEADO EM 3 ETAPAS                  */}
      {/* ============================================================== */}
      {modoBalcaoRapido && (
        <div className="space-y-4">
          
          {/* INDICADOR VISUAL DE CASCATA */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-xs font-bold py-1">
            <div className={`p-2 rounded-lg border transition-colors ${
              !comandaBalcaoAtiva
                ? 'bg-[#DDB96B]/15 border-[#DDB96B] text-[#FDE68A]'
                : 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400'
            }`}>
              1. Cliente
            </div>
            <div className={`p-2 rounded-lg border transition-colors ${
              comandaBalcaoAtiva && !produtoConferencia
                ? 'bg-[#DDB96B]/15 border-[#DDB96B] text-[#FDE68A]'
                : comandaBalcaoAtiva?.itens?.length
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-400'
                : 'bg-[#0A1428]/50 border-slate-800 text-slate-500'
            }`}>
              2. Produtos
            </div>
            <div className={`p-2 rounded-lg border transition-colors ${
              comandaBalcaoAtiva?.itens?.length
                ? 'bg-blue-950/40 border-blue-600/40 text-blue-400'
                : 'bg-[#0A1428]/50 border-slate-800 text-slate-500'
            }`}>
              3. Cobrança
            </div>
          </div>

          {/* ========================================================== */}
          {/* ETAPA 1: SE NENHUM CLIENTE SELECIONADO                     */}
          {/* ========================================================== */}
          {!comandaBalcaoAtiva ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0A1428] border border-[#DDB96B]/25 space-y-5 shadow-lg">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold text-[#DDB96B] uppercase tracking-widest block">
                  Etapa Inicial
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  Quem é o destinatário desta venda?
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Aponte a câmera para o QR Code do Irmão/Cartão ou digite CPF/CIM abaixo.
                </p>
              </div>

              {/* Botões de Ação Simétricos para Câmera / Celular */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setCameraTarget('cartao_balcao'); setIsCameraScannerOpen(true); }}
                  className="min-h-[50px] px-4 py-3 bg-[#0E1C36] hover:bg-[#13274c] border border-[#DDB96B]/40 text-[#FDE68A] rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Camera size={18} className="text-[#DDB96B]" />
                  <span>Ler QR Code do Cliente (Câmera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdvMobileModalOpen(true)}
                  className="min-h-[50px] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Smartphone size={18} />
                  <span>Modo PDV Celular Contínuo</span>
                </button>
              </div>

              {/* Divisor Visual */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0A1428] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
                  ou busque manualmente
                </span>
              </div>

              {/* Formulário de Identificação Simétrico */}
              <form onSubmit={handleIdentificarClienteSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      ref={inputCartaoRef}
                      type="text"
                      value={cartaoClienteInput}
                      onChange={e => setCartaoClienteInput(e.target.value)}
                      placeholder="Digite o CPF, CIM ou número do cartão..."
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-[#070F1E] border border-slate-700 focus:border-[#DDB96B] text-white text-sm outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={processandoAcao || !cartaoClienteInput.trim()}
                    className="min-h-[48px] px-6 py-2.5 bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>Localizar</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ========================================================== */
            /* ETAPA 2: CLIENTE IDENTIFICADO ➔ LANÇAR PRODUTOS           */
            /* ========================================================== */
            <div className="space-y-4">
              
              {/* CARD RESUMO DO CLIENTE SELECIONADO */}
              <div className="p-4 rounded-2xl bg-[#0A1428] border border-emerald-600/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                        Cliente Ativo
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Comanda #{comandaBalcaoAtiva.id}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
                      {comandaBalcaoAtiva.nome_cliente || 'Consumidor Identificado'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Acumulado</span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {(comandaBalcaoAtiva.total || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleTrocarCliente}
                    className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Trocar</span>
                  </button>
                </div>
              </div>

              {/* CARD DE ADIÇÃO DE PRODUTOS */}
              <div className="p-5 rounded-2xl bg-[#0A1428] border border-[#DDB96B]/20 space-y-4 shadow-md">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <Barcode size={18} className="text-[#DDB96B]" />
                      Adicionar Itens ao Pedido
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Aponte a câmera para a lata/garrafa ou digite o código
                    </p>
                  </div>
                </div>

                {/* Grade Simétrica para Bipagem */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setCameraTarget('produto_balcao'); setIsCameraScannerOpen(true); }}
                    className="min-h-[48px] px-4 py-2.5 bg-[#0E1C36] hover:bg-[#13274c] border border-blue-500/40 text-blue-300 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Camera size={18} className="text-blue-400" />
                    <span>Bipar Produto (Câmera)</span>
                  </button>

                  <form onSubmit={handleBiparProdutoSubmit} className="flex gap-2">
                    <input
                      ref={inputProdutoRef}
                      type="text"
                      value={codigoProdutoInput}
                      onChange={e => setCodigoProdutoInput(e.target.value)}
                      placeholder="Código de barras ou QR tag..."
                      className="min-h-[48px] flex-1 px-3.5 py-2 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm outline-none focus:border-[#DDB96B]"
                    />
                    <button
                      type="submit"
                      disabled={!codigoProdutoInput.trim()}
                      className="min-h-[48px] px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-40"
                    >
                      Buscar
                    </button>
                  </form>
                </div>

                {/* CARD DE CONFERÊNCIA EXPLÍCITA DO PRODUTO (NADA É ADICIONADO SEM O CLIQUE) */}
                {produtoConferencia && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0E1C36] border-2 border-[#DDB96B] space-y-4 animate-slideUp">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#DDB96B] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#DDB96B]/15 border border-[#DDB96B]/30">
                          Confirmar Inclusão
                        </span>
                        <h4 className="text-lg sm:text-xl font-black text-white mt-1">
                          {produtoConferencia.nome}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {produtoConferencia.marca ? `Marca: ${produtoConferencia.marca} • ` : ''}
                          Unitário: R$ {produtoConferencia.preco_venda.toFixed(2)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-semibold block">Subtotal</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-400">
                          R$ {(produtoConferencia.preco_venda * qtdConferencia).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Seletor Simétrico de Quantidade */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-[#070F1E] border border-slate-800">
                      <span className="text-xs font-bold text-slate-300 ml-2">Quantidade:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQtdConferencia(prev => Math.max(1, prev - 1))}
                          className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="min-w-[36px] text-center text-lg font-bold text-white">
                          {qtdConferencia}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQtdConferencia(prev => prev + 1)}
                          className="min-h-[44px] min-w-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center cursor-pointer"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Botões Simétricos de Confirmação Deliberada */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleConfirmarInclusaoItem}
                        disabled={processandoAcao}
                        className="min-h-[50px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                      >
                        <Check size={18} />
                        <span>Confirmar e Adicionar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setProdutoConferencia(null); setQtdConferencia(1); }}
                        className="min-h-[50px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                      >
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* LISTA DE ITENS LANÇADOS NA COMANDA ATIVA */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0A1428] border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Itens no Pedido ({comandaBalcaoAtiva.itens?.length || 0})
                  </h4>
                </div>

                {!comandaBalcaoAtiva.itens?.length ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    Nenhum item adicionado ainda. Bipe o código do produto acima.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {comandaBalcaoAtiva.itens.map(item => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {item.produto_nome || getProdutoNome(item.produto_id)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {item.quantidade}x R$ {item.valor_unitario.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-slate-200">
                            R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoverItem(item.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Remover item da comanda"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ========================================================== */}
              {/* ETAPA 3: BARRA DE FECHAMENTO DELIBERADO                   */}
              {/* ========================================================== */}
              {comandaBalcaoAtiva && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0E1C36] to-[#0A1428] border border-[#DDB96B]/30 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xl">
                  <div>
                    <span className="text-xs text-slate-400 uppercase font-semibold">Total a Cobrar</span>
                    <div className="text-2xl sm:text-3xl font-black text-[#FDE68A]">
                      R$ {(comandaBalcaoAtiva.total || 0).toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirModalFechamento(comandaBalcaoAtiva)}
                    className="w-full sm:w-auto min-h-[50px] px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                  >
                    <CreditCard size={20} />
                    <span>Cobrar e Finalizar Venda</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MODO MESAS: GESTÃO TRADICIONAL                             */}
      {/* ============================================================== */}
      {!modoBalcaoRapido && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Comandas Abertas em Mesas
            </h3>
            <button
              onClick={() => setIsModalNovaOpen(true)}
              className="min-h-[40px] px-4 py-2 bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Abrir Comanda / Mesa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {comandas.filter(c => c.status === 'ABERTA').map(c => (
              <div key={c.id} className="p-4 rounded-xl bg-[#0A1428] border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-[#DDB96B] font-bold font-mono">
                      Mesa / {c.identificador_cartao || `#${c.id}`}
                    </span>
                    <h4 className="text-base font-bold text-white mt-0.5 truncate max-w-[180px]">
                      {c.nome_cliente || 'Consumidor'}
                    </h4>
                  </div>
                  <span className="text-lg font-black text-emerald-400">
                    R$ {(c.total || 0).toFixed(2)}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  {c.itens?.length || 0} {c.itens?.length === 1 ? 'item' : 'itens'}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => { setComandaSelecionada(c); }}
                    className="min-h-[38px] px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Ver Itens
                  </button>
                  <button
                    onClick={() => abrirModalFechamento(c)}
                    className="min-h-[38px] px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL SIMÉTRICO DE CARTÕES CORINGA (VISITANTES)                */}
      {/* ============================================================== */}
      {isModalCoringaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A1428] border border-[#DDB96B]/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CardIcon size={18} className="text-[#DDB96B]" />
                Cartões Físicos de Visitante
              </h3>
              <button
                onClick={() => setIsModalCoringaAberto(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Abas Simétricas */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#070F1E] border border-slate-800">
              <button
                type="button"
                onClick={() => setCoringaAba('ENTREGAR')}
                className={`min-h-[38px] rounded-lg text-xs font-bold transition-all ${
                  coringaAba === 'ENTREGAR' ? 'bg-[#DDB96B] text-[#070F1E]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Entregar Cartão
              </button>
              <button
                type="button"
                onClick={() => setCoringaAba('DEVOLVER')}
                className={`min-h-[38px] rounded-lg text-xs font-bold transition-all ${
                  coringaAba === 'DEVOLVER' ? 'bg-[#DDB96B] text-[#070F1E]' : 'text-slate-400 hover:text-white'
                }`}
              >
                Devolver Cartão
              </button>
            </div>

            {coringaAba === 'ENTREGAR' ? (
              <form onSubmit={handleAssociarCoringa} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Código do Cartão Coringa *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={coringaCodigo}
                      onChange={e => setCoringaCodigo(e.target.value)}
                      placeholder="Ex: CARTAO-01"
                      className="min-h-[44px] flex-1 px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { setCameraTarget('coringa_associar'); setIsCameraScannerOpen(true); }}
                      className="min-h-[44px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">CPF do Visitante *</label>
                  <input
                    type="text"
                    required
                    value={coringaCpf}
                    onChange={e => setCoringaCpf(e.target.value)}
                    placeholder="Somente números"
                    className="min-h-[44px] w-full px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={coringaNome}
                    onChange={e => setCoringaNome(e.target.value)}
                    placeholder="Nome do visitante ou convidado"
                    className="min-h-[44px] w-full px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[48px] bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] font-bold rounded-xl text-sm"
                >
                  Confirmar Entrega
                </button>
              </form>
            ) : (
              <form onSubmit={handleDevolverCoringa} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Código do Cartão a Devolver *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={devolverCodigoCartao}
                      onChange={e => setDevolverCodigoCartao(e.target.value)}
                      placeholder="Ex: CARTAO-01"
                      className="min-h-[44px] flex-1 px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => { setCameraTarget('coringa_devolver'); setIsCameraScannerOpen(true); }}
                      className="min-h-[44px] px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl"
                    >
                      <Camera size={18} />
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[48px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm"
                >
                  Concluir Devolução
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAIS DO SISTEMA                                              */}
      {/* ============================================================== */}

      {/* Leitor Câmera Simples */}
      <LeitorQrCameraModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleLeituraCamera}
        titulo={
          cameraTarget === 'cartao_balcao'
            ? 'Escanear QR Code do Irmão / Cartão'
            : 'Escanear Código da Embalagem / Lata'
        }
      />

      {/* Scanner Contínuo Mobile */}
      <PdvMobileScannerModal
        aberto={isPdvMobileModalOpen}
        aoFechar={() => setIsPdvMobileModalOpen(false)}
        aoSolicitarFechamento={(comanda) => {
          setIsPdvMobileModalOpen(false);
          abrirModalFechamento(comanda);
        }}
        aoAtualizarDadosGerais={carregarDados}
      />

      {/* Fechar Comanda */}
      {isModalFecharOpen && comandaParaFechar && (
        <FecharComandaModal
          isOpen={isModalFecharOpen}
          onClose={() => setIsModalFecharOpen(false)}
          comandaId={comandaParaFechar.id}
          totalComanda={comandaParaFechar.total || 0}
          clienteId={comandaParaFechar.cliente_id}
          clienteNome={comandaParaFechar.nome_cliente}
          onSuccess={handleFechamentoSucesso}
          onAbrirRecarga={() => {
            if (comandaParaFechar.cliente_id) {
              abrirRecargaCliente(comandaParaFechar.cliente_id, comandaParaFechar.nome_cliente || 'Obreiro');
            }
          }}
        />
      )}

      {/* Comprovante Térmico */}
      {isModalTermicoOpen && comprovanteAtual && (
        <ComprovanteTermicoModal
          isOpen={isModalTermicoOpen}
          onClose={() => setIsModalTermicoOpen(false)}
          comprovante={comprovanteAtual}
          clienteId={comandaParaFechar?.cliente_id || comandaSelecionada?.cliente_id}
        />
      )}

      {/* Recarga do Bar */}
      {isModalRecargaOpen && clienteRecarga && (
        <RecargaBarModal
          isOpen={isModalRecargaOpen}
          onClose={() => setIsModalRecargaOpen(false)}
          clienteId={clienteRecarga.id}
          clienteNome={clienteRecarga.nome}
          saldoAtual={clienteRecarga.saldo}
          onSuccess={(novoSaldo) => {
            setSucessoFeedback(`Recarga efetuada! Novo saldo no bar: R$ ${novoSaldo.toFixed(2)}`);
            carregarDados();
            setTimeout(() => setSucessoFeedback(null), 4000);
          }}
        />
      )}

      {/* Modal Mesas: Nova Comanda */}
      {isModalNovaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0A1428] border border-[#DDB96B]/30 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Abrir Nova Comanda / Mesa</h3>
              <button onClick={() => setIsModalNovaOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={abrirNovaComanda} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Identificador da Mesa / Cartão *</label>
                <input
                  type="text"
                  required
                  value={identificadorCartao}
                  onChange={e => setIdentificadorCartao(e.target.value)}
                  placeholder="Ex: Mesa 04 ou Cartão 12"
                  className="min-h-[44px] w-full px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Cliente (Opcional)</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={e => setNomeCliente(e.target.value)}
                  placeholder="Nome do Irmão ou Convidado"
                  className="min-h-[44px] w-full px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] font-bold rounded-xl text-sm"
              >
                Criar Comanda
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Mesas: Detalhes da Comanda */}
      {comandaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0A1428] border border-[#DDB96B]/30 rounded-2xl p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {comandaSelecionada.nome_cliente || `Mesa ${comandaSelecionada.identificador_cartao}`}
                </h3>
                <p className="text-xs text-slate-400 font-mono">Comanda #{comandaSelecionada.id}</p>
              </div>
              <button onClick={() => setComandaSelecionada(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            {/* Adicionar item manual */}
            <form onSubmit={adicionarItemManual} className="flex gap-2">
              <select
                value={produtoSelecionadoId}
                onChange={e => setProdutoSelecionadoId(e.target.value)}
                required
                className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
              >
                <option value="">Selecione um produto...</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco_venda.toFixed(2)}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantidadeItem}
                onChange={e => setQuantidadeItem(e.target.value)}
                className="w-20 min-h-[44px] px-2 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm text-center"
              />
              <button
                type="submit"
                className="px-4 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm"
              >
                +
              </button>
            </form>

            {/* Itens */}
            <div className="divide-y divide-slate-800 max-h-60 overflow-y-auto">
              {comandaSelecionada.itens?.map(item => (
                <div key={item.id} className="py-2 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-white">{item.produto_nome || getProdutoNome(item.produto_id)}</p>
                    <p className="text-xs text-slate-400">{item.quantidade}x R$ {item.valor_unitario.toFixed(2)}</p>
                  </div>
                  <span className="font-bold text-emerald-400">R$ {(item.quantidade * item.valor_unitario).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-xs text-slate-400 block">Total</span>
                <span className="text-xl font-black text-[#FDE68A]">R$ {(comandaSelecionada.total || 0).toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  const c = comandaSelecionada;
                  setComandaSelecionada(null);
                  abrirModalFechamento(c);
                }}
                className="min-h-[44px] px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm"
              >
                Fechar Comanda
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
