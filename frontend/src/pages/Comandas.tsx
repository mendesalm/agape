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
  UserPlus, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  Clock
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

  // 🏛️ Navegação Interna do Salão (Os 3 Pilares Operacionais)
  // 'HUB' = Painel Inicial com 3 Blocos Simétricos
  // 'CADASTRO' = 1. Cadastrar Cliente & Entregar Cartão
  // 'CONSUMO' = 2. Lançar Consumo na Comanda (Bipagem da noite)
  // 'PAGAMENTOS' = 3. Pagamentos Pendentes & Check-out
  // 'MESAS' = Visão alternativa de Mesas Físicas
  const [visaoSalao, setVisaoSalao] = useState<'HUB' | 'CADASTRO' | 'CONSUMO' | 'PAGAMENTOS' | 'MESAS'>('HUB');

  // Estados da Câmera Scanner e Modo PDV Mobile Contínuo
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'cartao_balcao' | 'produto_balcao' | 'coringa_cadastro'>('cartao_balcao');
  const [isPdvMobileModalOpen, setIsPdvMobileModalOpen] = useState(false);

  // Estados do Fluxo de Consumo
  const [cartaoClienteInput, setCartaoClienteInput] = useState('');
  const [comandaBalcaoAtiva, setComandaBalcaoAtiva] = useState<Comanda | null>(null);
  const [codigoProdutoInput, setCodigoProdutoInput] = useState('');
  const [produtoConferencia, setProdutoConferencia] = useState<Produto | null>(null);
  const [qtdConferencia, setQtdConferencia] = useState(1);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);
  const [processandoAcao, setProcessandoAcao] = useState(false);

  // Estados de Cadastro & Entrega de Cartão
  const [cadNome, setCadNome] = useState('');
  const [cadCpf, setCadCpf] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadTelefone, setCadTelefone] = useState('');
  const [cadCartaoCodigo, setCadCartaoCodigo] = useState('');

  // Estados de Pagamentos Pendentes & Filtro
  const [buscaPagamento, setBuscaPagamento] = useState('');

  // Estados dos Modais de Fechamento, Térmica e Recarga
  const [isModalFecharOpen, setIsModalFecharOpen] = useState(false);
  const [comandaParaFechar, setComandaParaFechar] = useState<Comanda | null>(null);
  const [comprovanteAtual, setComprovanteAtual] = useState<DadosComprovante | null>(null);
  const [isModalTermicoOpen, setIsModalTermicoOpen] = useState(false);
  const [isModalRecargaOpen, setIsModalRecargaOpen] = useState(false);
  const [clienteRecarga, setClienteRecarga] = useState<{ id: number; nome: string; saldo?: number } | null>(null);

  // Modal Mesas (Nova Comanda e Detalhes)
  const [isModalNovaOpen, setIsModalNovaOpen] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<Comanda | null>(null);
  const [nomeClienteMesa, setNomeClienteMesa] = useState('');
  const [identificadorCartaoMesa, setIdentificadorCartaoMesa] = useState('');
  const [produtoMesaId, setProdutoMesaId] = useState('');
  const [quantidadeMesa, setQuantidadeMesa] = useState('1');

  const inputCartaoRef = useRef<HTMLInputElement>(null);
  const inputProdutoRef = useRef<HTMLInputElement>(null);

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
    } else if (cameraTarget === 'coringa_cadastro') {
      setCadCartaoCodigo(codigoLido.trim());
    }
  };

  /**
   * PILAR 1: Cadastrar Cliente & Entregar Cartão
   */
  const handleCadastrarClienteEEntregarCartao = async (e: FormEvent) => {
    e.preventDefault();
    if (!cadNome.trim() || !cadCpf.trim() || !cadCartaoCodigo.trim()) {
      alert("Nome completo, CPF e Código do Cartão são obrigatórios.");
      return;
    }

    setProcessandoAcao(true);
    try {
      await api.post('/cartoes/associar-coringa', {
        codigo_cartao: cadCartaoCodigo.trim(),
        cliente_cpf: cadCpf.trim(),
        cliente_nome: cadNome.trim(),
        cliente_email: cadEmail.trim() || undefined,
        cliente_telefone: cadTelefone.trim() || undefined
      });

      setSucessoFeedback(`Cartão ${cadCartaoCodigo} entregue com sucesso a ${cadNome}!`);
      setTimeout(() => setSucessoFeedback(null), 4000);

      // Limpa os campos
      setCadNome('');
      setCadCpf('');
      setCadEmail('');
      setCadTelefone('');
      setCadCartaoCodigo('');

      // Atualiza e retorna ao Hub do Salão
      await carregarDados();
      setVisaoSalao('HUB');
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao cadastrar cliente e associar cartão.");
    } finally {
      setProcessandoAcao(false);
    }
  };

  /**
   * PILAR 2: Identificar Cliente para Consumo
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
      setSucessoFeedback(`Cliente ativo: ${res.data.nome_cliente || res.data.identificador_cartao}`);
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
   * PILAR 2: Buscar Produto para Conferência
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
   * PILAR 2: Confirmação Explícita de Adição do Item
   */
  const handleConfirmarInclusaoItem = async () => {
    if (!comandaBalcaoAtiva || !produtoConferencia) return;

    setProcessandoAcao(true);
    try {
      await api.post(`/comandas/${comandaBalcaoAtiva.id}/itens`, {
        produto_id: produtoConferencia.id,
        quantidade: qtdConferencia
      });

      const res = await api.get(`/comandas/${comandaBalcaoAtiva.id}`);
      setComandaBalcaoAtiva(res.data);

      setSucessoFeedback(`+${qtdConferencia}x ${produtoConferencia.nome} lançado no pedido!`);
      setTimeout(() => setSucessoFeedback(null), 3500);

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
   * PILAR 2: Estornar/Remover Item da Comanda
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
   * PILAR 3: Fechamento Deliberado & Check-out
   */
  const abrirModalFechamento = (comanda: Comanda) => {
    setComandaParaFechar(comanda);
    setIsModalFecharOpen(true);
  };

  const handleFechamentoSucesso = (comprovante: DadosComprovante) => {
    setComprovanteAtual(comprovante);
    setIsModalTermicoOpen(true);
    setSucessoFeedback(`Comanda #${comprovante.comanda_id} quitada com sucesso! Emitindo comprovante térmico...`);
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

  // Funções de Mesas Tradicionais
  const abrirNovaComanda = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/comandas/', {
        nome_cliente: nomeClienteMesa,
        identificador_cartao: identificadorCartaoMesa
      });
      setIsModalNovaOpen(false);
      setNomeClienteMesa(''); setIdentificadorCartaoMesa('');
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
        produto_id: parseInt(produtoMesaId),
        quantidade: parseInt(quantidadeMesa)
      });
      const resp = await api.get(`/comandas/${comandaSelecionada.id}`);
      setComandaSelecionada(resp.data);
      setProdutoMesaId(''); setQuantidadeMesa('1');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao adicionar item.");
    }
  };

  // Comandas Abertas na Noite (Pendentes de Pagamento)
  const comandasAbertas = comandas.filter(c => c.status === 'ABERTA');
  const comandasFiltradas = comandasAbertas.filter(c => {
    if (!buscaPagamento.trim()) return true;
    const termo = buscaPagamento.toLowerCase();
    return (
      (c.nome_cliente && c.nome_cliente.toLowerCase().includes(termo)) ||
      (c.identificador_cartao && c.identificador_cartao.toLowerCase().includes(termo)) ||
      String(c.id).includes(termo)
    );
  });

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden text-slate-100">
      
      {/* FEEDBACK FLUTUANTE */}
      {sucessoFeedback && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fadeIn">
          <Check size={16} /> {sucessoFeedback}
        </div>
      )}

      {/* ============================================================== */}
      {/* 🏛️ 1. VISÃO HUB: O PAINEL INICIAL DO SALÃO (3 GRANDES PILARES)  */}
      {/* ============================================================== */}
      {visaoSalao === 'HUB' && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Cabeçalho do Salão */}
          <div className="border-b border-[#DDB96B]/20 pb-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#FDE68A] flex items-center gap-2">
              <Zap className="text-[#DDB96B] w-6 h-6" />
              Salão de Banquetes & Ágape
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha uma das 3 etapas operacionais do evento:
            </p>
          </div>

          {/* OS 3 PILARES SIMÉTRICOS DO ATENDIMENTO */}
          <div className="grid grid-cols-1 gap-3.5">
            
            {/* PILAR 1: Cadastrar Cliente & Entregar Cartão */}
            <button
              onClick={() => setVisaoSalao('CADASTRO')}
              className="p-5 rounded-2xl bg-[#0A1428] hover:bg-[#0E1C36] border border-[#DDB96B]/30 hover:border-[#DDB96B]/60 transition-all text-left flex items-center justify-between group shadow-lg active:scale-99 cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-[#DDB96B]/15 border border-[#DDB96B]/35 text-[#FDE68A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus size={24} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#DDB96B] block">
                    Recepção / Entrada
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#FDE68A] transition-colors truncate">
                    1. Cadastrar Cliente & Entregar Cartão
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Novos irmãos, visitantes e distribuição do cartão genérico
                  </p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-[#FDE68A] group-hover:translate-x-1 transition-all shrink-0 ml-2" size={20} />
            </button>

            {/* PILAR 2: Lançar Consumo na Comanda */}
            <button
              onClick={() => setVisaoSalao('CONSUMO')}
              className="p-5 rounded-2xl bg-[#0A1428] hover:bg-[#0E1C36] border border-emerald-500/30 hover:border-emerald-500/60 transition-all text-left flex items-center justify-between group shadow-lg active:scale-99 cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Barcode size={24} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                    Operação do Bar & Balcão
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                    2. Lançar Consumo na Comanda
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Bipagem ágil durante a sessão com confirmação explícita
                  </p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" size={20} />
            </button>

            {/* PILAR 3: Pagamentos Pendentes & Check-out */}
            <button
              onClick={() => setVisaoSalao('PAGAMENTOS')}
              className="p-5 rounded-2xl bg-[#0A1428] hover:bg-[#0E1C36] border border-blue-500/30 hover:border-blue-500/60 transition-all text-left flex items-center justify-between group shadow-lg active:scale-99 cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-13 h-13 rounded-2xl bg-blue-950/60 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CreditCard size={24} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                      Saída / Encerramento
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                      {comandasAbertas.length} {comandasAbertas.length === 1 ? 'pendente' : 'pendentes'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                    3. Pagamentos Pendentes & Check-out
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Acerto final da noite com devolução e liberação do cartão genérico
                  </p>
                </div>
              </div>
              <ChevronRight className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" size={20} />
            </button>

          </div>

          {/* Atalho Discreto para Gestão de Mesas Físicas */}
          <div className="pt-2 text-center">
            <button
              onClick={() => setVisaoSalao('MESAS')}
              className="text-xs text-slate-400 hover:text-[#FDE68A] flex items-center justify-center gap-1.5 mx-auto py-2 transition-colors cursor-pointer"
            >
              <ClipboardList size={14} />
              <span>Deseja alternar para a Gestão de Mesas Físicas?</span>
            </button>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* 👤 2. VISÃO: CADASTRAR CLIENTE & ENTREGAR CARTÃO (PILAR 1)      */}
      {/* ============================================================== */}
      {visaoSalao === 'CADASTRO' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-[#DDB96B]/20 pb-3">
            <button
              onClick={() => setVisaoSalao('HUB')}
              className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Salão</span>
            </button>
            <span className="text-xs font-bold text-[#FDE68A]">Etapa 1 de 3</span>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-[#0A1428] border border-[#DDB96B]/30 space-y-4 shadow-xl">
            <div>
              <span className="text-[10px] font-bold text-[#DDB96B] uppercase tracking-widest block">
                Recepção & Boas-Vindas
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                Cadastrar Cliente & Entregar Cartão
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Cadastre o irmão ou visitante e vincule o cartão genérico para consumo pós-pago.
              </p>
            </div>

            <form onSubmit={handleCadastrarClienteEEntregarCartao} className="space-y-3.5 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={cadNome}
                  onChange={e => setCadNome(e.target.value)}
                  placeholder="Nome do irmão, visitante ou familiar"
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#070F1E] border border-slate-700 focus:border-[#DDB96B] text-white text-sm outline-none"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    CPF ou CIM *
                  </label>
                  <input
                    type="text"
                    required
                    value={cadCpf}
                    onChange={e => setCadCpf(e.target.value)}
                    placeholder="Digite o CPF ou CIM"
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#070F1E] border border-slate-700 focus:border-[#DDB96B] text-white text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Telefone / WhatsApp (Opcional)
                  </label>
                  <input
                    type="text"
                    value={cadTelefone}
                    onChange={e => setCadTelefone(e.target.value)}
                    placeholder="(XX) 9XXXX-XXXX"
                    className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#070F1E] border border-slate-700 focus:border-[#DDB96B] text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  E-mail (Opcional)
                </label>
                <input
                  type="email"
                  value={cadEmail}
                  onChange={e => setCadEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full min-h-[48px] px-3.5 rounded-xl bg-[#070F1E] border border-slate-700 focus:border-[#DDB96B] text-white text-sm outline-none"
                />
              </div>

              {/* Campo do Cartão Genérico com Botão de Câmera */}
              <div className="pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-amber-300 block mb-1">
                  Código do Cartão Genérico a Entregar *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={cadCartaoCodigo}
                    onChange={e => setCadCartaoCodigo(e.target.value)}
                    placeholder="Ex: CARTAO-01 ou bipar pela câmera..."
                    className="flex-1 min-h-[48px] px-3.5 rounded-xl bg-[#070F1E] border border-amber-500/40 text-amber-200 text-sm font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => { setCameraTarget('coringa_cadastro'); setIsCameraScannerOpen(true); }}
                    className="min-h-[48px] px-4 bg-[#0E1C36] hover:bg-[#13274c] border border-amber-500/40 text-amber-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Abrir câmera para escanear cartão genérico"
                  >
                    <Camera size={18} />
                    <span className="hidden sm:inline">Câmera</span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={processandoAcao}
                  className="w-full min-h-[50px] bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  <span>Confirmar Cadastro & Entregar Cartão</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* 🍺 3. VISÃO: LANÇAR CONSUMO NA COMANDA (PILAR 2)                */}
      {/* ============================================================== */}
      {visaoSalao === 'CONSUMO' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-[#DDB96B]/20 pb-3">
            <button
              onClick={() => { setComandaBalcaoAtiva(null); setVisaoSalao('HUB'); }}
              className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Salão</span>
            </button>
            <span className="text-xs font-bold text-emerald-400">Etapa 2 de 3</span>
          </div>

          {/* FLUXO CASCATEADO: PASSO 1 (IDENTIFICAR CLIENTE) OU PASSO 2 (BIPAR PRODUTOS) */}
          {!comandaBalcaoAtiva ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-[#0A1428] border border-emerald-500/30 space-y-5 shadow-lg">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                  Identificação do Destinatário
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                  Quem está consumindo agora?
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Aponte a câmera para o QR Code do Irmão / Cartão ou busque por CPF/CIM.
                </p>
              </div>

              {/* Botões Simétricos para Câmera / Scanner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setCameraTarget('cartao_balcao'); setIsCameraScannerOpen(true); }}
                  className="min-h-[50px] px-4 py-3 bg-[#0E1C36] hover:bg-[#13274c] border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Camera size={18} className="text-emerald-400" />
                  <span>Ler QR Code do Cliente (Câmera)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPdvMobileModalOpen(true)}
                  className="min-h-[50px] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Smartphone size={18} />
                  <span>Modo Scanner Contínuo Mobile</span>
                </button>
              </div>

              {/* Divisor */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-[#0A1428] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
                  ou digite manualmente
                </span>
              </div>

              {/* Busca Manual */}
              <form onSubmit={handleIdentificarClienteSubmit} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                      ref={inputCartaoRef}
                      type="text"
                      value={cartaoClienteInput}
                      onChange={e => setCartaoClienteInput(e.target.value)}
                      placeholder="CPF, CIM ou código do cartão..."
                      className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-[#070F1E] border border-slate-700 focus:border-emerald-500 text-white text-sm outline-none transition-colors"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={processandoAcao || !cartaoClienteInput.trim()}
                    className="min-h-[48px] px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span>Localizar</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* CLIENTE SELECIONADO: BIPAGEM & ACÚMULO NO PEDIDO */
            <div className="space-y-4">
              
              {/* Card Resumo do Cliente Ativo */}
              <div className="p-4 rounded-2xl bg-[#0A1428] border border-emerald-600/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                    <User size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/50">
                        Consumo Ativo
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        Comanda #{comandaBalcaoAtiva.id}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white truncate mt-0.5">
                      {comandaBalcaoAtiva.nome_cliente || 'Consumidor'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Consumido</span>
                    <span className="text-xl font-black text-emerald-400">
                      R$ {(comandaBalcaoAtiva.total || 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setComandaBalcaoAtiva(null); setProdutoConferencia(null); }}
                    className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Trocar</span>
                  </button>
                </div>
              </div>

              {/* Bipagem do Produto */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setCameraTarget('produto_balcao'); setIsCameraScannerOpen(true); }}
                    className="min-h-[48px] px-4 py-2.5 bg-[#0E1C36] hover:bg-[#13274c] border border-blue-500/40 text-blue-300 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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

                {/* Card de Conferência com Confirmação Deliberada */}
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

                    {/* Quantidade */}
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
                        className="min-h-[50px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm flex items-center justify-center cursor-pointer"
                      >
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista dos Itens Já Adicionados nesta Comanda */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0A1428] border border-slate-800 space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Itens Acumulados no Pedido ({comandaBalcaoAtiva.itens?.length || 0})
                </h4>

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
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
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

              {/* Botão de Conclusão do Atendimento Atual */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setComandaBalcaoAtiva(null);
                    setProdutoConferencia(null);
                    setVisaoSalao('HUB');
                  }}
                  className="w-full min-h-[50px] px-6 py-3 rounded-xl bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] font-extrabold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <CheckCircle2 size={18} />
                  <span>Concluir Atendimento e Liberar Balcão</span>
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 💳 4. VISÃO: PAGAMENTOS PENDENTES & CHECK-OUT (PILAR 3)          */}
      {/* ============================================================== */}
      {visaoSalao === 'PAGAMENTOS' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-[#DDB96B]/20 pb-3">
            <button
              onClick={() => setVisaoSalao('HUB')}
              className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Salão</span>
            </button>
            <span className="text-xs font-bold text-blue-400">Etapa 3 de 3</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">
              Encerramento & Check-out
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              Pagamentos Pendentes da Noite
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Selecione a comanda para receber o pagamento e devolver/liberar o cartão genérico.
            </p>
          </div>

          {/* Busca Rápida de Comanda */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              value={buscaPagamento}
              onChange={e => setBuscaPagamento(e.target.value)}
              placeholder="Buscar por nome do irmão, número do cartão ou mesa..."
              className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-xl bg-[#0A1428] border border-slate-700 focus:border-blue-500 text-white text-sm outline-none"
            />
          </div>

          {/* Lista das Comandas Abertas */}
          {!comandasFiltradas.length ? (
            <div className="p-8 text-center bg-[#0A1428] rounded-2xl border border-slate-800 space-y-2">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400" />
              <h3 className="font-bold text-white text-base">Tudo liquidado!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há pagamentos pendentes no momento. Todas as comandas estão quitadas.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {comandasFiltradas.map(c => (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#0A1428] border border-blue-500/30 space-y-3.5 shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-amber-300 bg-amber-950/40 border border-amber-600/30 px-2 py-0.5 rounded-full">
                        {c.identificador_cartao || `Mesa #${c.id}`}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                        <Clock size={12} />
                        {c.data_abertura ? new Date(c.data_abertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <h4 className="text-base sm:text-lg font-bold text-white mt-1.5 truncate">
                      {c.nome_cliente || 'Consumidor'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {c.itens?.length || 0} {c.itens?.length === 1 ? 'item consumido' : 'itens consumidos'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                      <span className="text-xl font-black text-emerald-400">
                        R$ {(c.total || 0).toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalFechamento(c)}
                      className="min-h-[46px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <CreditCard size={16} />
                      <span>Receber / Check-out</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* 📋 5. VISÃO: GESTÃO DE MESAS FÍSICAS                          */}
      {/* ============================================================== */}
      {visaoSalao === 'MESAS' && (
        <div className="space-y-4 animate-fadeIn">
          
          <div className="flex items-center justify-between border-b border-[#DDB96B]/20 pb-3">
            <button
              onClick={() => setVisaoSalao('HUB')}
              className="min-h-[40px] px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao Salão</span>
            </button>

            <button
              onClick={() => setIsModalNovaOpen(true)}
              className="min-h-[40px] px-4 py-2 bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>Nova Comanda / Mesa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {comandasAbertas.map(c => (
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
                  {c.itens?.length || 0} itens lançados
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
            : cameraTarget === 'produto_balcao'
            ? 'Escanear Código da Embalagem / Lata'
            : 'Escanear Código do Cartão Genérico'
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

      {/* Fechar Comanda com Devolução Integrada do Cartão */}
      {isModalFecharOpen && comandaParaFechar && (
        <FecharComandaModal
          isOpen={isModalFecharOpen}
          onClose={() => setIsModalFecharOpen(false)}
          comandaId={comandaParaFechar.id}
          totalComanda={comandaParaFechar.total || 0}
          clienteId={comandaParaFechar.cliente_id}
          clienteNome={comandaParaFechar.nome_cliente}
          identificadorCartao={comandaParaFechar.identificador_cartao}
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
              <button onClick={() => setIsModalNovaOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={abrirNovaComanda} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Identificador da Mesa / Cartão *</label>
                <input
                  type="text"
                  required
                  value={identificadorCartaoMesa}
                  onChange={e => setIdentificadorCartaoMesa(e.target.value)}
                  placeholder="Ex: Mesa 04 ou Cartão 12"
                  className="min-h-[44px] w-full px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nome do Cliente (Opcional)</label>
                <input
                  type="text"
                  value={nomeClienteMesa}
                  onChange={e => setNomeClienteMesa(e.target.value)}
                  placeholder="Nome do Irmão ou Convidado"
                  className="min-h-[44px] w-full px-3 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[48px] bg-[#DDB96B] hover:bg-[#FDE68A] text-[#070F1E] font-bold rounded-xl text-sm cursor-pointer"
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
              <button onClick={() => setComandaSelecionada(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={adicionarItemManual} className="flex gap-2">
              <select
                value={produtoMesaId}
                onChange={e => setProdutoMesaId(e.target.value)}
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
                value={quantidadeMesa}
                onChange={e => setQuantidadeMesa(e.target.value)}
                className="w-20 min-h-[44px] px-2 rounded-xl bg-[#070F1E] border border-slate-700 text-white text-sm text-center"
              />
              <button
                type="submit"
                className="px-4 min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm cursor-pointer"
              >
                +
              </button>
            </form>

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
                className="min-h-[44px] px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm cursor-pointer"
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
