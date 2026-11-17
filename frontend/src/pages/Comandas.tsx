import { useEffect, useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft,
  Plus, 
  CreditCard, 
  ShoppingCart, 
  CheckCircle, 
  X, 
  ClipboardList, 
  Barcode, 
  QrCode, 
  Zap, 
  Check, 
  ArrowRight,
  UserCheck,
  UserPlus,
  RotateCcw,
  Camera,
  RefreshCw,
  BookOpen,
  Search,
  Wine,
  Users,
  Wallet,
  Keyboard
} from 'lucide-react';
import { LeitorQrCameraModal } from '../components/LeitorQrCameraModal';
import { ProdutoGlassThumb } from '../components/ProdutoGlassThumb';

interface ItemComanda {
  id: number;
  produto_id: number;
  produto_nome?: string;
  produto_foto_url?: string;
  quantidade: number;
  valor_unitario: number;
  status?: string;
  observacao?: string;
}

interface Comanda {
  id: number;
  cliente_id?: number;
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
  codigos_barras_alternativos?: string[];
  qr_code_tag?: string;
  marca?: string;
  categoria?: string;
  subcategoria?: string;
  foto_url?: string;
}

export function Comandas() {
  const navigate = useNavigate();
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de Operação (Balcão Rápido vs Gestão de Mesas)
  const [modoBalcaoRapido, setModoBalcaoRapido] = useState(true);

  // Estados do Atendimento Rápido no Balcão
  const [cartaoClienteInput, setCartaoClienteInput] = useState('');
  const [comandaBalcaoAtiva, setComandaBalcaoAtiva] = useState<Comanda | null>(null);
  const [codigoProdutoInput, setCodigoProdutoInput] = useState('');
  const [produtoConferencia, setProdutoConferencia] = useState<Produto | null>(null);
  const [qtdConferencia, setQtdConferencia] = useState(1);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);

  // Leitor de Câmera Móvel
  const [isCameraAberta, setIsCameraAberta] = useState(false);
  const [cameraContexto, setCameraContexto] = useState<'cartao' | 'produto' | 'cad_cartao' | 'cad_doc'>('cartao');

  // Identificação Avançada (1B / 1C / 1D Ágape)
  const [clienteDetalhesAtivo, setClienteDetalhesAtivo] = useState<{
    cliente: { id: number; nome: string; cpf?: string; cim?: string; email?: string; telefone?: string; tipo_consumidor?: string };
    carteira: { saldo: number; limite_fiado: number };
    cartao_ativo?: string | null;
    dependentes: Array<{ id: number; nome: string; parentesco: string; email?: string; telefone?: string }>;
  } | null>(null);
  const [retiranteSelecionado, setRetiranteSelecionado] = useState<{ id: number; nome: string; parentesco: string } | null>(null);
  const [isNumpadAberto, setIsNumpadAberto] = useState(false);
  const [resultadosBuscaCliente, setResultadosBuscaCliente] = useState<Array<{ id: number; nome: string; cpf?: string; cim?: string; tipo_consumidor?: string }>>([]);

  // Modal 1D: Cadastro Rápido (Novo Irmão ou Convidado + E-mail + Vínculo Cartão/Doc QR)
  const [isModalCadastroClienteOpen, setIsModalCadastroClienteOpen] = useState(false);
  const [cadClienteCpfCim, setCadClienteCpfCim] = useState('');
  const [cadClienteNome, setCadClienteNome] = useState('');
  const [cadClienteEmail, setCadClienteEmail] = useState('');
  const [cadClienteTelefone, setCadClienteTelefone] = useState('');
  const [cadClienteTipo, setCadClienteTipo] = useState<'IRMAO_QUADRO' | 'CONVIDADO_NAO_MACOM'>('IRMAO_QUADRO');
  const [cadCartaoGenerico, setCadCartaoGenerico] = useState('');
  const [cadDocumentosQr, setCadDocumentosQr] = useState<Array<{ tipo: string; rotulo: string; codigo: string }>>([]);
  const [salvandoCadastroCliente, setSalvandoCadastroCliente] = useState(false);

  // Modal Cadastro Rápido de Dependente (a partir da 1C)
  const [isModalCadastroDependenteOpen, setIsModalCadastroDependenteOpen] = useState(false);
  const [depNome, setDepNome] = useState('');
  const [depEmail, setDepEmail] = useState('');
  const [depTelefone, setDepTelefone] = useState('');
  const [depParentesco, setDepParentesco] = useState('Esposa');
  const [salvandoDependente, setSalvandoDependente] = useState(false);

  // Refs para focar automaticamente nos inputs de leitor de código
  const inputCartaoRef = useRef<HTMLInputElement>(null);
  const inputProdutoRef = useRef<HTMLInputElement>(null);

  // Estados dos Modais
  const [isModalNovaOpen, setIsModalNovaOpen] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<Comanda | null>(null);

  // Estados do Modal Cardápio de Produtos (Escolha Manual sem Equipamento)
  const [isModalMenuProdutosOpen, setIsModalMenuProdutosOpen] = useState(false);
  const [buscaMenuProduto, setBuscaMenuProduto] = useState('');
  const [categoriaFiltroMenu, setCategoriaFiltroMenu] = useState('todos');

  // Estados dos Cartões Coringa (Visitantes)
  const [isModalAssociarCoringaOpen, setIsModalAssociarCoringaOpen] = useState(false);
  const [isModalDevolverCoringaOpen, setIsModalDevolverCoringaOpen] = useState(false);
  const [coringaCodigo, setCoringaCodigo] = useState('');
  const [coringaNome, setCoringaNome] = useState('');
  const [coringaCpf, setCoringaCpf] = useState('');
  const [coringaTelefone, setCoringaTelefone] = useState('');
  const [coringaEmail, setCoringaEmail] = useState('');
  const [devolverCodigoCartao, setDevolverCodigoCartao] = useState('');

  // Formulário Nova Comanda
  const [nomeCliente, setNomeCliente] = useState('');
  const [identificadorCartao, setIdentificadorCartao] = useState('');

  // Formulário Adicionar Item Manual
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidadeItem, setQuantidadeItem] = useState('1');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [respComandas, respProdutos] = await Promise.all([
        api.get('/comandas/').catch(() => ({ data: [] })),
        api.get('/produtos/?apenas_com_estoque=true').catch(() => ({ data: [] }))
      ]);
      setComandas(Array.isArray(respComandas.data) ? respComandas.data : []);
      setProdutos(Array.isArray(respProdutos.data) ? respProdutos.data : []);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  // Associação de Cartão Coringa Reutilizável
  const handleAssociarCoringa = async (e: FormEvent) => {
    e.preventDefault();
    if (!coringaCodigo.trim() || !coringaCpf.trim() || !coringaNome.trim()) {
      alert("Código do Cartão, CPF e Nome são obrigatórios.");
      return;
    }

    try {
      const res = await api.post('/cartoes/associar-coringa', {
        codigo_cartao: coringaCodigo.trim(),
        cpf: coringaCpf.trim(),
        nome: coringaNome.trim(),
        telefone: coringaTelefone.trim() || undefined,
        email: coringaEmail.trim() || undefined
      });
      setSucessoFeedback(res.data.mensagem || `Cartão ${coringaCodigo} associado a ${coringaNome}!`);
      setTimeout(() => setSucessoFeedback(null), 4000);
      setIsModalAssociarCoringaOpen(false);
      setCoringaCodigo('');
      setCoringaNome('');
      setCoringaCpf('');
      setCoringaTelefone('');
      setCoringaEmail('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao associar cartão coringa.");
    }
  };

  // Devolução do Cartão Coringa no Fim do Dia (Check-out)
  const handleDevolverCoringa = async (e: FormEvent) => {
    e.preventDefault();
    if (!devolverCodigoCartao.trim()) return;

    try {
      const res = await api.post('/cartoes/devolver-coringa', {
        codigo_cartao: devolverCodigoCartao.trim()
      });
      setSucessoFeedback(`Cartão ${devolverCodigoCartao} devolvido com sucesso! Total consumido: R$ ${(res.data.total_consumido || 0).toFixed(2)}`);
      setTimeout(() => setSucessoFeedback(null), 5000);
      setIsModalDevolverCoringaOpen(false);
      setDevolverCodigoCartao('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao devolver cartão coringa.");
    }
  };

  const carregarDetalhesClienteAtivo = async (clienteId?: number | null) => {
    if (!clienteId) {
      setClienteDetalhesAtivo(null);
      return;
    }
    try {
      const res = await api.get(`/comandas/cliente/${clienteId}/detalhes`);
      setClienteDetalhesAtivo(res.data);
    } catch {
      setClienteDetalhesAtivo(null);
    }
  };

  const abrirModalCadastroCliente = (docInicial = '') => {
    setCadClienteCpfCim(docInicial);
    setCadClienteNome('');
    setCadClienteEmail('');
    setCadClienteTelefone('');
    setCadClienteTipo('IRMAO_QUADRO');
    setCadCartaoGenerico('');
    setCadDocumentosQr([]);
    setIsModalCadastroClienteOpen(true);
  };

  const handleBuscarClientesPorNome = async (termo: string) => {
    if (!termo.trim()) {
      setResultadosBuscaCliente([]);
      return;
    }
    try {
      const res = await api.get(`/comandas/clientes/busca?q=${encodeURIComponent(termo.trim())}`);
      setResultadosBuscaCliente(Array.isArray(res.data) ? res.data : []);
    } catch {
      setResultadosBuscaCliente([]);
    }
  };

  const handleNumpadPress = (tecla: string) => {
    if (tecla === 'LIMPAR') {
      setCartaoClienteInput('');
      return;
    }
    if (tecla === 'BACK') {
      setCartaoClienteInput((prev) => prev.slice(0, -1));
      return;
    }
    setCartaoClienteInput((prev) => prev + tecla);
  };

  const handleSalvarCadastroCliente = async (e: FormEvent) => {
    e.preventDefault();
    if (!cadClienteNome.trim() || !cadClienteEmail.trim()) {
      alert('Nome completo e e-mail são obrigatórios.');
      return;
    }
    try {
      setSalvandoCadastroCliente(true);
      const res = await api.post('/comandas/clientes', {
        nome: cadClienteNome.trim(),
        email: cadClienteEmail.trim(),
        telefone: cadClienteTelefone.trim() || null,
        cpf_ou_cim: cadClienteCpfCim.trim() || null,
        tipo_consumidor: cadClienteTipo,
        documentos_qr: cadDocumentosQr,
        codigo_cartao_coringa: cadCartaoGenerico.trim() || null,
      });
      const novoCliente = res.data?.cliente;
      setIsModalCadastroClienteOpen(false);
      if (novoCliente) {
        const identificador = res.data.cartao_ativo || novoCliente.cim || novoCliente.cpf;
        await handleIdentificarClienteBalcao(undefined, identificador);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar novo cliente.');
    } finally {
      setSalvandoCadastroCliente(false);
    }
  };

  const handleSalvarDependente = async (e: FormEvent) => {
    e.preventDefault();
    const titularId = clienteDetalhesAtivo?.cliente?.id;
    if (!titularId) return;
    if (!depNome.trim() || !depEmail.trim()) {
      alert('Nome e e-mail do dependente são obrigatórios.');
      return;
    }
    try {
      setSalvandoDependente(true);
      const res = await api.post(`/comandas/cliente/${titularId}/dependentes`, {
        nome: depNome.trim(),
        email: depEmail.trim(),
        telefone: depTelefone.trim() || null,
        parentesco: depParentesco,
      });
      setClienteDetalhesAtivo(res.data);
      setDepNome('');
      setDepEmail('');
      setDepTelefone('');
      setDepParentesco('Esposa');
      setIsModalCadastroDependenteOpen(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar dependente.');
    } finally {
      setSalvandoDependente(false);
    }
  };

  // 1. Identificação do Cliente no Balcão
  const handleIdentificarClienteBalcao = async (e?: FormEvent, codigoForcado?: string) => {
    if (e) e.preventDefault();
    const termo = (codigoForcado || cartaoClienteInput).trim();
    if (!termo) return;

    try {
      const res = await api.post('/comandas/identificar-cartao', {
        identificador_cartao: termo
      });
      setComandaBalcaoAtiva(res.data);
      setRetiranteSelecionado(null);
      setResultadosBuscaCliente([]);
      setIsNumpadAberto(false);
      await carregarDetalhesClienteAtivo(res.data.cliente_id);
      setSucessoFeedback(`Cliente ativo: ${res.data.nome_cliente || res.data.identificador_cartao}`);
      setTimeout(() => setSucessoFeedback(null), 3000);
      
      setTimeout(() => inputProdutoRef.current?.focus(), 150);
      carregarDados();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Cliente não identificado.';
      if (confirm(`${msg}\n\nDeseja cadastrar "${termo}" como Novo Irmão ou Convidado agora?`)) {
        abrirModalCadastroCliente(termo);
      }
    }
  };

  // 2. Bipagem do Produto no Balcão
  const handleBiparProdutoBalcao = async (e?: FormEvent, codigoForcado?: string) => {
    if (e) e.preventDefault();
    const codigo = (codigoForcado || codigoProdutoInput).trim();
    if (!codigo) return;

    try {
      const res = await api.get(`/produtos/codigo/${encodeURIComponent(codigo)}`);
      setProdutoConferencia(res.data);
      setQtdConferencia(1);
      setCodigoProdutoInput('');
    } catch (err: any) {
      alert(err.response?.data?.detail || `Produto não encontrado para o código: ${codigo}`);
      setCodigoProdutoInput('');
    }
  };

  // 2.1 Seleção Direta do Cardápio / Menu (Sem necessidade de leitor/câmera)
  const handleSelecionarProdutoMenu = (prod: Produto) => {
    setProdutoConferencia(prod);
    setQtdConferencia(1);
    setIsModalMenuProdutosOpen(false);
  };

  const categoriasMenu = [
    { id: 'todos', label: 'Todos' },
    { id: 'cervejas', label: 'Cervejas' },
    { id: 'nao_alcoolicas', label: 'Refrigerantes & Sucos' },
    { id: 'destilados', label: 'Doses & Destilados' },
    { id: 'alimentos', label: 'Petiscos & Snacks' }
  ];

  const produtosDisponiveis = produtos.filter((p) => (p.quantidade_estoque ?? 0) > 0);

  const produtosFiltradosMenu = produtosDisponiveis.filter((p) => {
    if (buscaMenuProduto.trim()) {
      const q = buscaMenuProduto.toLowerCase();
      const matchNome = (p.nome || '').toLowerCase().includes(q);
      const matchMarca = (p.marca || '').toLowerCase().includes(q);
      const matchEan =
        (p.codigo_barras || '').toLowerCase().includes(q) ||
        (p.codigos_barras_alternativos || []).some((c) => c.toLowerCase().includes(q));
      if (!matchNome && !matchMarca && !matchEan) return false;
    }

    if (categoriaFiltroMenu === 'todos') return true;
    const cat = (p.categoria || '').toLowerCase();
    const sub = (p.subcategoria || '').toLowerCase();
    const nome = (p.nome || '').toLowerCase();

    if (categoriaFiltroMenu === 'cervejas') {
      return nome.includes('cerveja') || sub.includes('cerveja') || (cat.includes('bebida') && sub.includes('alcool'));
    }
    if (categoriaFiltroMenu === 'nao_alcoolicas') {
      return sub.includes('nao_alcool') || nome.includes('coca') || nome.includes('sukita') || nome.includes('fanta') || nome.includes('guaran') || nome.includes('agua') || nome.includes('suco') || nome.includes('cha');
    }
    if (categoriaFiltroMenu === 'destilados') {
      return sub.includes('dose') || sub.includes('destilad') || nome.includes('whisky') || nome.includes('gin') || nome.includes('vodka') || nome.includes('cachaca');
    }
    if (categoriaFiltroMenu === 'alimentos') {
      return cat.includes('alimento') || sub.includes('snack') || nome.includes('amendoim') || nome.includes('batata') || nome.includes('torresmo') || nome.includes('petisco');
    }

    return true;
  });

  // 3. Conferência & Lançamento na Conta
  const handleConfirmarVendaBalcao = async () => {
    if (!comandaBalcaoAtiva || !produtoConferencia) return;

    try {
      await api.post(`/comandas/${comandaBalcaoAtiva.id}/itens`, {
        produto_id: produtoConferencia.id,
        quantidade: qtdConferencia,
        observacao: retiranteSelecionado
          ? `Retirado por: ${retiranteSelecionado.nome} (${retiranteSelecionado.parentesco})`
          : undefined
      });

      const res = await api.get(`/comandas/${comandaBalcaoAtiva.id}`);
      setComandaBalcaoAtiva(res.data);
      
      const msg = `${qtdConferencia}x ${produtoConferencia.nome} lançado na conta de ${res.data.nome_cliente || res.data.identificador_cartao}!`;
      setSucessoFeedback(msg);
      setTimeout(() => setSucessoFeedback(null), 4000);

      setProdutoConferencia(null);
      setQtdConferencia(1);
      setTimeout(() => inputProdutoRef.current?.focus(), 100);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao lançar item na comanda.");
    }
  };

  const handleKeyDownBalcao = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && produtoConferencia) {
      e.preventDefault();
      handleConfirmarVendaBalcao();
    }
  };

  const finalizarAtendimentoBalcao = () => {
    setComandaBalcaoAtiva(null);
    setClienteDetalhesAtivo(null);
    setRetiranteSelecionado(null);
    setCartaoClienteInput('');
    setProdutoConferencia(null);
    setQtdConferencia(1);
    setTimeout(() => inputCartaoRef.current?.focus(), 100);
  };

  const abrirNovaComanda = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/comandas/', {
        nome_cliente: nomeCliente,
        identificador_cartao: identificadorCartao
      });
      setIsModalNovaOpen(false);
      setNomeCliente(''); 
      setIdentificadorCartao('');
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
      setProdutoSelecionadoId(''); 
      setQuantidadeItem('1');
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao adicionar item.");
    }
  };

  const fecharComanda = async (comanda_id: number) => {
    if (!window.confirm("Deseja fechar esta conta e registrar o pagamento no financeiro?")) return;
    try {
      await api.patch(`/comandas/${comanda_id}/fechar`);
      if (comandaSelecionada?.id === comanda_id) setComandaSelecionada(null);
      if (comandaBalcaoAtiva?.id === comanda_id) setComandaBalcaoAtiva(null);
      carregarDados();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao fechar comanda.");
    }
  };

  const getProduto = (id: number) => {
    return produtos.find(p => p.id === id);
  };

  const getProdutoNome = (id: number) => {
    const prod = getProduto(id);
    return prod ? prod.nome : `Produto #${id}`;
  };

  const getProdutoFoto = (id: number) => {
    const prod = getProduto(id);
    return prod?.foto_url || null;
  };

  const handleCameraScan = (codigo: string) => {
    setIsCameraAberta(false);
    if (cameraContexto === 'cartao') {
      setCartaoClienteInput(codigo);
      handleIdentificarClienteBalcao(undefined, codigo);
    } else if (cameraContexto === 'cad_cartao') {
      setCadCartaoGenerico(codigo.trim());
    } else if (cameraContexto === 'cad_doc') {
      const limpo = codigo.trim();
      if (limpo) {
        setCadDocumentosQr((prev) =>
          prev.some((d) => d.codigo === limpo)
            ? prev
            : [...prev, { tipo: 'DOCUMENTO_QR', rotulo: `Doc QR (${limpo.slice(0, 10)})`, codigo: limpo }]
        );
      }
    } else {
      setCodigoProdutoInput(codigo);
      handleBiparProdutoBalcao(undefined, codigo);
    }
  };

  return (
    <div 
      className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-lg lg:max-w-5xl mx-auto overflow-hidden animate-fadeIn select-none text-slate-100"
      onKeyDown={handleKeyDownBalcao}
    >
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow do Stitch) */}
      <div className="pointer-events-none absolute -top-14 -left-12 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-1/4 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. TOP HEADER & NAVEGAÇÃO                                      */}
      {/* ============================================================== */}
      <header className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 mb-3">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => navigate('/app')}
            className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
            title="Voltar ao Hub"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Atendimento</span>
              <span className="text-slate-600">/</span>
              <span className="font-semibold text-cyan-400">Balcão & PDV</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight flex items-center gap-2">
              Comandas & Bipagem
            </h1>
          </div>
        </div>

        {/* Ações de Cartões Coringa & Visitantes */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsModalAssociarCoringaOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-400/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <UserPlus size={15} />
            <span>Cartão Coringa</span>
          </button>

          <button
            onClick={() => setIsModalDevolverCoringaOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <RotateCcw size={15} />
            <span>Devolver</span>
          </button>

          <button
            onClick={carregarDados}
            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
            title="Atualizar Dados"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-cyan-400' : ''} />
          </button>
        </div>
      </header>

      {/* FEEDBACK FLUTUANTE */}
      {sucessoFeedback && (
        <div className="relative z-20 mb-3 bg-emerald-500/20 border border-emerald-400/50 backdrop-blur-xl text-emerald-300 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fadeIn">
          <Check size={16} className="text-emerald-400 shrink-0" />
          <span>{sucessoFeedback}</span>
        </div>
      )}

      {/* NAVEGAÇÃO SEGMENTADA DE MODOS (Padrão Stitch) */}
      <nav className="relative z-10 grid grid-cols-2 p-1 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 gap-1 my-2 text-xs font-semibold">
        <button 
          type="button" 
          onClick={() => { 
            setModoBalcaoRapido(true); 
            setTimeout(() => inputCartaoRef.current?.focus(), 150); 
          }}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
            modoBalcaoRapido
              ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap size={15} className="text-amber-400" />
          <span>Balcão Rápido (Auto-Focus)</span>
        </button>

        <button 
          type="button" 
          onClick={() => setModoBalcaoRapido(false)}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
            !modoBalcaoRapido
              ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ClipboardList size={15} />
          <span>Mesas & Comandas ({comandas.length})</span>
        </button>
      </nav>

      {/* ============================================================== */}
      {/* MODO 1: BALCÃO RÁPIDO (Bipagem Operacional Glassmorphism)       */}
      {/* ============================================================== */}
      {modoBalcaoRapido && (
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Lado Esquerdo: Área de Operação e Bipagem */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            
            {/* ETAPA 1: Identificar o Cliente / Destinatário */}
            <section className={`p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border transition-all shadow-xl ${
              comandaBalcaoAtiva 
                ? 'border-emerald-400/40 ring-1 ring-emerald-400/20' 
                : 'border-white/10'
            }`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={15} className="text-cyan-400" />
                  Passo 1: Destinatário da Venda
                </span>
                {comandaBalcaoAtiva && (
                  <span className="px-2.5 py-0.5 bg-emerald-400/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <Check size={12} /> Cliente Ativo
                  </span>
                )}
              </div>

              {!comandaBalcaoAtiva ? (
                <div className="space-y-2.5">
                  <form onSubmit={e => handleIdentificarClienteBalcao(e)} className="flex flex-wrap sm:flex-nowrap gap-2">
                    <div className="relative flex-1 min-w-[180px]">
                      <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        ref={inputCartaoRef}
                        type="text" 
                        value={cartaoClienteInput} 
                        onChange={e => {
                          const v = e.target.value;
                          setCartaoClienteInput(v);
                          if (/[a-zA-Z]/.test(v) && v.trim().length >= 2) {
                            handleBuscarClientesPorNome(v);
                          } else {
                            setResultadosBuscaCliente([]);
                          }
                        }}
                        placeholder="Bipe QR/Cartão ou digite CIM, CPF ou Nome..."
                        className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 font-medium focus:outline-none focus:border-cyan-400/50"
                        autoFocus
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setCameraContexto('cartao');
                        setIsCameraAberta(true);
                      }}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10"
                      title="Ler QR/Cartão com a Câmera"
                    >
                      <Camera size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsNumpadAberto(!isNumpadAberto)}
                      className={`p-2 rounded-xl border transition ${
                        isNumpadAberto
                          ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                          : 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
                      }`}
                      title="Teclado Numérico (CIM / CPF)"
                    >
                      <Keyboard size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirModalCadastroCliente(cartaoClienteInput.trim())}
                      className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-amber-300 text-xs font-bold flex items-center gap-1 transition"
                      title="Cadastrar Novo Irmão ou Convidado"
                    >
                      <UserPlus size={15} />
                      <span className="hidden sm:inline">Novo</span>
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 hover:from-cyan-500/40 hover:to-blue-600/40 border border-cyan-400/40 text-cyan-300 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition"
                    >
                      <span>Identificar</span>
                      <ArrowRight size={14} />
                    </button>
                  </form>

                  {/* Resultados da busca por nome */}
                  {resultadosBuscaCliente.length > 0 && (
                    <div className="rounded-xl bg-[#070C18] border border-white/10 divide-y divide-white/5 max-h-36 overflow-y-auto">
                      {resultadosBuscaCliente.map((cli) => (
                        <button
                          key={cli.id}
                          type="button"
                          onClick={() => handleIdentificarClienteBalcao(undefined, cli.cim || cli.cpf || String(cli.id))}
                          className="w-full px-3 py-2 text-left hover:bg-white/[0.06] flex items-center justify-between text-xs transition"
                        >
                          <span className="font-bold text-white">{cli.nome}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {cli.cim ? `CIM ${cli.cim}` : cli.cpf}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Numpad In-Place (1B) */}
                  {isNumpadAberto && (
                    <div className="p-2.5 rounded-2xl bg-[#070C18] border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                        <span>Digite o CIM (5–7 dígitos) ou CPF (11 dígitos)</span>
                        <span className="font-mono text-emerald-400">
                          {cartaoClienteInput.replace(/\D/g, '').length <= 7 ? 'CIM' : 'CPF'} ({cartaoClienteInput.replace(/\D/g, '').length} dígitos)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {['1','2','3','4','5','6','7','8','9','LIMPAR','0','BACK'].map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleNumpadPress(k)}
                            className={`py-2.5 rounded-xl font-bold text-xs transition active:scale-95 ${
                              k === 'LIMPAR'
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-400/20'
                                : k === 'BACK'
                                ? 'bg-white/10 text-slate-300 border border-white/10'
                                : 'bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 text-sm'
                            }`}
                          >
                            {k === 'BACK' ? '⌫' : k}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-3 bg-white/[0.04] p-3 rounded-2xl border border-emerald-400/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400/60 flex items-center justify-center text-emerald-300 font-black text-base shrink-0">
                        {(comandaBalcaoAtiva.nome_cliente || 'CL')
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm sm:text-base text-white">
                            {comandaBalcaoAtiva.nome_cliente || 'Cliente Identificado'}
                          </h3>
                          {clienteDetalhesAtivo?.cliente?.tipo_consumidor && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[9px] font-bold uppercase text-amber-300">
                              {clienteDetalhesAtivo.cliente.tipo_consumidor.includes('IRMAO')
                                ? 'Irmão'
                                : clienteDetalhesAtivo.cliente.tipo_consumidor === 'FAMILIAR'
                                ? 'Dependente'
                                : 'Convidado'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Cartão: <span className="font-mono text-cyan-300 font-semibold">{comandaBalcaoAtiva.identificador_cartao || `#${comandaBalcaoAtiva.id}`}</span>
                          {clienteDetalhesAtivo?.cliente?.cim && ` • CIM ${clienteDetalhesAtivo.cliente.cim}`}
                          {` • Comanda #${comandaBalcaoAtiva.id}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {clienteDetalhesAtivo && (
                        <div className="text-right">
                          <div className="text-[9px] text-slate-400 uppercase font-bold flex items-center justify-end gap-1">
                            <Wallet size={10} className="text-emerald-400" />
                            Saldo Carteira
                          </div>
                          <div className="font-black text-sm text-emerald-400 tabular-nums">
                            R$ {Number(clienteDetalhesAtivo.carteira?.saldo || 0).toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className="text-[9px] text-slate-400 uppercase font-bold">Acumulado</div>
                        <div className="font-black text-sm sm:text-base text-amber-400 tabular-nums">
                          R$ {(comandaBalcaoAtiva.total || 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <button 
                        onClick={finalizarAtendimentoBalcao}
                        className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 rounded-xl text-[10px] font-semibold transition"
                      >
                        Trocar
                      </button>
                    </div>
                  </div>

                  {/* Dependentes Autorizados (1C) */}
                  {clienteDetalhesAtivo && (
                    <div className="px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
                          <Users size={12} className="text-cyan-400" />
                          Retirando:
                        </span>
                        <button
                          type="button"
                          onClick={() => setRetiranteSelecionado(null)}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                            !retiranteSelecionado
                              ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                              : 'bg-white/[0.05] border border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          Titular
                        </button>
                        {(clienteDetalhesAtivo.dependentes || []).map((dep) => (
                          <button
                            key={dep.id}
                            type="button"
                            onClick={() =>
                              setRetiranteSelecionado(
                                retiranteSelecionado?.id === dep.id
                                  ? null
                                  : { id: dep.id, nome: dep.nome, parentesco: dep.parentesco }
                              )
                            }
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                              retiranteSelecionado?.id === dep.id
                                ? 'bg-cyan-500/25 border border-cyan-400/60 text-cyan-200'
                                : 'bg-white/[0.05] border border-white/10 text-slate-300 hover:border-cyan-400/30'
                            }`}
                          >
                            {dep.nome} ({dep.parentesco})
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsModalCadastroDependenteOpen(true)}
                        className="px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1 transition"
                        title="Cadastrar novo dependente autorizado para este titular"
                      >
                        <Plus size={11} />
                        Dependente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* ETAPA 2: Bipagem do Produto e Conferência */}
            <section className={`p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border transition-all shadow-xl flex-1 flex flex-col justify-between ${
              !comandaBalcaoAtiva 
                ? 'opacity-50 pointer-events-none border-white/5' 
                : 'border-cyan-400/30'
            }`}>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Barcode size={15} className="text-amber-400" />
                    Passo 2: Bipar Produto ou Escolher do Menu
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!comandaBalcaoAtiva}
                      onClick={() => setIsModalMenuProdutosOpen(true)}
                      className="text-[10px] text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 transition disabled:opacity-40"
                      title="Abrir cardápio visual de produtos"
                    >
                      <BookOpen size={11} />
                      <span>Cardápio</span>
                    </button>
                    <span className="text-[9px] text-cyan-300 bg-cyan-400/10 px-2 py-0.5 rounded-full font-bold">
                      FEFO Auto
                    </span>
                  </div>
                </div>

                <form onSubmit={e => handleBiparProdutoBalcao(e)} className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      ref={inputProdutoRef}
                      type="text" 
                      value={codigoProdutoInput} 
                      onChange={e => setCodigoProdutoInput(e.target.value)}
                      placeholder="Bipe o código de barras ou tag QR da cerveja..."
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs sm:text-sm text-cyan-300 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400/50"
                      disabled={!comandaBalcaoAtiva}
                    />
                  </div>
                  <button 
                    type="button"
                    disabled={!comandaBalcaoAtiva}
                    onClick={() => {
                      setCameraContexto('produto');
                      setIsCameraAberta(true);
                    }}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 disabled:opacity-40"
                    title="Escanear com a Câmera"
                  >
                    <Camera size={18} />
                  </button>
                  <button 
                    type="button"
                    disabled={!comandaBalcaoAtiva}
                    onClick={() => setIsModalMenuProdutosOpen(true)}
                    className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 text-xs font-bold transition disabled:opacity-40 shadow-sm"
                    title="Escolher produto do cardápio visual"
                  >
                    <BookOpen size={16} />
                    <span className="hidden sm:inline">Menu</span>
                  </button>
                  <button 
                    type="submit" 
                    disabled={!comandaBalcaoAtiva}
                    className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-xl font-bold text-xs shadow-sm disabled:opacity-40"
                  >
                    Buscar
                  </button>
                </form>
              </div>

              {/* Card de Conferência na Frente do Cliente */}
              {produtoConferencia ? (
                <div className="p-3.5 bg-gradient-to-r from-amber-500/15 via-white/[0.04] to-transparent border border-amber-400/40 rounded-2xl space-y-3 animate-fadeIn my-1 shadow-lg">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProdutoGlassThumb
                        fotoUrl={produtoConferencia.foto_url}
                        nome={produtoConferencia.nome}
                        categoria={produtoConferencia.categoria}
                        subcategoria={produtoConferencia.subcategoria}
                        tamanho="sm"
                        aspectRatio="square"
                        containerClassName="w-14 h-14 p-1 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.2 rounded-full inline-block">
                          Conferir Item
                        </span>
                        <h3 className="text-sm font-black text-white truncate mt-0.5">{produtoConferencia.nome}</h3>
                        <p className="text-[10px] text-slate-400">
                          Unit: <strong className="text-white">R$ {produtoConferencia.preco_venda.toFixed(2).replace('.', ',')}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Subtotal</span>
                      <div className="text-lg font-black text-amber-400 tabular-nums">
                        R$ {(produtoConferencia.preco_venda * qtdConferencia).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-300">Qtd:</span>
                      <div className="flex items-center border border-white/15 rounded-xl bg-white/[0.06] overflow-hidden">
                        <button 
                          type="button" 
                          onClick={() => setQtdConferencia(Math.max(1, qtdConferencia - 1))}
                          className="px-2.5 py-1 hover:bg-white/10 text-xs font-bold text-slate-200"
                        >-</button>
                        <span className="px-3 py-1 font-bold text-xs text-white tabular-nums">{qtdConferencia}</span>
                        <button 
                          type="button" 
                          onClick={() => setQtdConferencia(qtdConferencia + 1)}
                          className="px-2.5 py-1 hover:bg-white/10 text-xs font-bold text-slate-200"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setProdutoConferencia(null)}
                        className="px-3 py-1.5 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button" 
                        onClick={handleConfirmarVendaBalcao}
                        className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                      >
                        <span>Confirmar [Enter]</span>
                        <Check size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 border border-dashed border-white/10 rounded-2xl text-center text-slate-500 my-auto flex flex-col items-center justify-center">
                  <Barcode className="w-8 h-8 mx-auto mb-1.5 text-slate-600" />
                  <p className="text-xs font-medium text-slate-400 mb-3">Bipe a embalagem ou escolha diretamente do cardápio</p>
                  <button
                    type="button"
                    disabled={!comandaBalcaoAtiva}
                    onClick={() => setIsModalMenuProdutosOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <BookOpen size={16} />
                    <span>Escolher do Menu / Cardápio</span>
                  </button>
                </div>
              )}
            </section>

          </div>

          {/* Lado Direito: Histórico da Comanda do Cliente em Tempo Real */}
          <div className="lg:col-span-5 p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <div>
                  <h3 className="font-bold text-white text-sm">Extrato em Tempo Real</h3>
                  <p className="text-[10px] text-slate-400">Itens consumidos na comanda ativa</p>
                </div>
                {comandaBalcaoAtiva && (
                  <button 
                    onClick={() => fecharComanda(comandaBalcaoAtiva.id)}
                    className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-bold transition"
                  >
                    Encerrar Conta
                  </button>
                )}
              </div>

              <div className="overflow-y-auto max-h-[260px] space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {!comandaBalcaoAtiva ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 text-center py-12">
                    <CreditCard className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="text-xs font-medium">Nenhum cliente ativo no momento.</p>
                    <p className="text-[10px] text-slate-600">Bipe o cartão na etapa 1 para abrir a conta.</p>
                  </div>
                ) : comandaBalcaoAtiva.itens.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-slate-500 text-center py-12">
                    <ShoppingCart className="w-10 h-10 text-slate-600 mb-2" />
                    <p className="text-xs font-medium">Comanda vazia.</p>
                    <p className="text-[10px] text-slate-600">Bipe produtos para registrar os consumos.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5 text-[9px] text-slate-400 px-1 pb-1">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-amber-400" /> Solicitado</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-blue-500" /> Balcão</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-cyan-400" /> Mesa</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-emerald-400" /> Pago</span>
                    </div>
                    {comandaBalcaoAtiva.itens.map((item, idx) => {
                      const foto = item.produto_foto_url || getProdutoFoto(item.produto_id);
                      const statusCor =
                        comandaBalcaoAtiva.status === 'FECHADA'
                          ? 'bg-emerald-400'
                          : (item.observacao || '').toLowerCase().includes('mesa')
                          ? 'bg-cyan-400'
                          : (item.observacao || '').toLowerCase().includes('solicitado')
                          ? 'bg-amber-400'
                          : 'bg-blue-500';
                      const statusTitulo =
                        comandaBalcaoAtiva.status === 'FECHADA'
                          ? 'Finalizado (Entregue e Pago)'
                          : (item.observacao || '').toLowerCase().includes('mesa')
                          ? 'Entregue na Mesa'
                          : (item.observacao || '').toLowerCase().includes('solicitado')
                          ? 'Solicitado'
                          : 'Entregue no Balcão';

                      return (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white/[0.04] border border-white/5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ProdutoGlassThumb
                              fotoUrl={foto}
                              nome={item.produto_nome || getProdutoNome(item.produto_id)}
                              tamanho="sm"
                              aspectRatio="square"
                              containerClassName="w-9 h-9 p-0.5 shrink-0 rounded-lg"
                            />
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate">
                                {item.quantidade}x {item.produto_nome || getProdutoNome(item.produto_id)}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                R$ {item.valor_unitario.toFixed(2).replace('.', ',')} cada
                                {item.observacao ? ` • ${item.observacao}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-[3px] ${statusCor}`}
                              title={statusTitulo}
                            />
                            <span className="font-black text-amber-400 text-xs tabular-nums">
                              R$ {(item.quantidade * item.valor_unitario).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {comandaBalcaoAtiva && (
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                <span className="font-bold text-slate-400 text-xs">Total Acumulado:</span>
                <span className="font-black text-lg text-amber-400 tabular-nums">
                  R$ {(comandaBalcaoAtiva.total || 0).toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO 2: VISÃO GERAL DE MESAS E COMANDAS                        */}
      {/* ============================================================== */}
      {!modoBalcaoRapido && (
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4">
          
          {/* Coluna Esquerda: Lista de Comandas */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl min-h-[380px]">
            <div>
              <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                <h2 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <CreditCard size={16} className="text-cyan-400" />
                  Contas & Mesas Abertas
                </h2>
                <button 
                  onClick={() => setIsModalNovaOpen(true)}
                  className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition"
                >
                  <Plus size={14} /> Abrir Conta
                </button>
              </div>

              <div className="overflow-y-auto max-h-[300px] space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {loading ? (
                  <div className="text-center text-slate-400 text-xs py-10 animate-pulse">Carregando comandas...</div>
                ) : comandas.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-10">Nenhuma comanda aberta no momento.</div>
                ) : (
                  comandas.map(comanda => (
                    <div 
                      key={comanda.id}
                      onClick={() => setComandaSelecionada(comanda)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        comandaSelecionada?.id === comanda.id 
                          ? 'bg-cyan-400/15 border-cyan-400/50 shadow-md shadow-cyan-500/10' 
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2">
                          <CreditCard className="text-cyan-400" size={15} />
                          <span className="font-bold text-xs text-white">
                            {comanda.identificador_cartao || `Mesa #${comanda.id}`}
                          </span>
                        </div>
                        <span className={`px-2 py-0.2 text-[9px] font-bold rounded-full border ${
                          comanda.status === 'ABERTA' 
                            ? 'bg-emerald-400/15 border-emerald-400/30 text-emerald-300' 
                            : 'bg-white/10 border-white/20 text-slate-400'
                        }`}>
                          {comanda.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] text-slate-400 leading-tight">
                          Cliente: <strong className="text-slate-200">{comanda.nome_cliente || 'Anônimo'}</strong> <br/>
                          Abertura: {new Date(comanda.data_abertura).toLocaleTimeString()}
                        </div>
                        <div className="text-sm font-black text-amber-400 tabular-nums">
                          R$ {(comanda.total || 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Detalhes da Comanda Selecionada */}
          <div className="w-full lg:w-1/2 flex flex-col justify-between p-3.5 sm:p-4 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl min-h-[380px]">
            {comandaSelecionada ? (
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-black text-white">
                        {comandaSelecionada.identificador_cartao || `Mesa #${comandaSelecionada.id}`}
                      </h3>
                      <p className="text-[10px] text-slate-400">{comandaSelecionada.nome_cliente || 'Cliente Balcão'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Total da Conta</span>
                      <div className="text-base font-black text-amber-400 tabular-nums">
                        R$ {(comandaSelecionada.total || 0).toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                  </div>

                  {comandaSelecionada.status === 'ABERTA' && (
                    <form onSubmit={adicionarItemManual} className="flex gap-1.5 mb-3 p-1.5 rounded-xl bg-white/[0.04] border border-white/10">
                      <select 
                        required
                        value={produtoSelecionadoId} 
                        onChange={e => setProdutoSelecionadoId(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-[#0B1324] text-white border border-white/10 focus:outline-none"
                      >
                        <option value="" disabled className="text-slate-500">Selecione um Produto...</option>
                        {produtosDisponiveis.map(p => (
                          <option key={p.id} value={p.id} className="text-white bg-[#0B1324]">
                            {p.nome} - R$ {p.preco_venda.toFixed(2).replace('.', ',')}
                          </option>
                        ))}
                      </select>
                      <input 
                        type="number" 
                        min="1" 
                        required 
                        value={quantidadeItem} 
                        onChange={e => setQuantidadeItem(e.target.value)} 
                        className="w-12 px-2 py-1.5 rounded-lg text-xs text-center bg-[#0B1324] text-white border border-white/10 font-bold" 
                      />
                      <button type="submit" className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-lg font-bold text-xs">
                        Lançar
                      </button>
                    </form>
                  )}

                  <div className="overflow-y-auto max-h-[220px] rounded-xl border border-white/10 space-y-1 p-1 bg-white/[0.02] scrollbar-thin scrollbar-thumb-slate-800">
                    {comandaSelecionada.itens.length === 0 ? (
                      <p className="text-center text-slate-500 text-xs py-4">Nenhum item consumido ainda.</p>
                    ) : (
                      comandaSelecionada.itens.map((it, i) => {
                        const foto = it.produto_foto_url || getProdutoFoto(it.produto_id);
                        return (
                          <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-white/[0.03]">
                            <div className="flex items-center gap-2 min-w-0">
                              <ProdutoGlassThumb
                                fotoUrl={foto}
                                nome={it.produto_nome || getProdutoNome(it.produto_id)}
                                tamanho="sm"
                                aspectRatio="square"
                                containerClassName="w-7 h-7 p-0.5 shrink-0 rounded-md"
                              />
                              <span className="font-medium text-xs text-slate-200 truncate">
                                {it.quantidade}x {it.produto_nome || getProdutoNome(it.produto_id)}
                              </span>
                            </div>
                            <span className="font-bold text-amber-400 text-xs tabular-nums ml-2 shrink-0">
                              R$ {(it.quantidade * it.valor_unitario).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {comandaSelecionada.status === 'ABERTA' && (
                  <button 
                    onClick={() => fecharComanda(comandaSelecionada.id)}
                    className="w-full mt-3 py-2 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-400/30 text-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCircle size={15} /> Encerrar Comanda e Registrar Receita
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 my-auto text-center py-10">
                <ClipboardList className="w-10 h-10 text-slate-600 mb-2" />
                <p className="text-xs font-medium">Selecione uma comanda ao lado para visualizar os detalhes.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAIS (PADRÃO STITCH GLASSMORPHISM)                           */}
      {/* ============================================================== */}

      {/* Modal Nova Comanda */}
      {isModalNovaOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-cyan-400/40 rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold flex items-center gap-2 text-cyan-300">
                <Plus size={18} /> Abrir Nova Conta / Mesa
              </h3>
              <button onClick={() => setIsModalNovaOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={abrirNovaComanda} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Identificador (Nº Mesa ou Cartão)</label>
                <input 
                  type="text" 
                  required 
                  value={identificadorCartao} 
                  onChange={e => setIdentificadorCartao(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white outline-none focus:border-cyan-400" 
                  placeholder="Ex: MESA-04 ou CARTAO-88" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Cliente (Opcional)</label>
                <input 
                  type="text" 
                  value={nomeCliente} 
                  onChange={e => setNomeCliente(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white outline-none focus:border-cyan-400" 
                  placeholder="Ex: Ir. João Silva" 
                />
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalNovaOpen(false)} className="px-3 py-1.5 bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-xl text-xs font-bold">Abrir Conta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Associar Cartão Coringa (Visitantes) */}
      {isModalAssociarCoringaOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-cyan-400/40 rounded-3xl p-6 w-full max-w-md space-y-3.5 text-white shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 text-cyan-300">
                  <UserPlus size={18} />
                  Entregar Cartão Coringa Reutilizável
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Cliente/Visitante sem cadastro no app que usará cartão temporário do bar.</p>
              </div>
              <button onClick={() => setIsModalAssociarCoringaOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAssociarCoringa} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Código do Cartão *</label>
                <input 
                  type="text" 
                  required 
                  value={coringaCodigo} 
                  onChange={e => setCoringaCodigo(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-cyan-400/30 text-cyan-300 font-mono font-bold text-xs" 
                  placeholder="Ex: CARD-001 ou bipe a tag RFID/QR"
                  autoFocus 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">CPF do Cliente * (Obrigatório para multitenant)</label>
                <input 
                  type="text" 
                  required 
                  value={coringaCpf} 
                  onChange={e => setCoringaCpf(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs" 
                  placeholder="000.000.000-00" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Nome Completo *</label>
                <input 
                  type="text" 
                  required 
                  value={coringaNome} 
                  onChange={e => setCoringaNome(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs" 
                  placeholder="Nome do visitante" 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Telefone (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={coringaTelefone} 
                    onChange={e => setCoringaTelefone(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">E-mail</label>
                  <input 
                    type="email" 
                    value={coringaEmail} 
                    onChange={e => setCoringaEmail(e.target.value)} 
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-xs" 
                    placeholder="email@exemplo.com" 
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalAssociarCoringaOpen(false)} className="px-3 py-1.5 bg-white/10 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 rounded-xl text-xs font-bold">
                  Associar e Ativar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Devolver Cartão Coringa (Check-out) */}
      {isModalDevolverCoringaOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-amber-400/40 rounded-3xl p-6 w-full max-w-sm space-y-3.5 text-white shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-white/10">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2 text-amber-300">
                  <RotateCcw size={18} />
                  Devolução de Cartão
                </h3>
                <p className="text-[10px] text-slate-400">Libera o cartão para a gaveta mantendo auditoria.</p>
              </div>
              <button onClick={() => setIsModalDevolverCoringaOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDevolverCoringa} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Código do Cartão</label>
                <input 
                  type="text" 
                  required 
                  value={devolverCodigoCartao} 
                  onChange={e => setDevolverCodigoCartao(e.target.value)} 
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-amber-400/30 text-amber-300 font-mono font-bold text-xs" 
                  placeholder="Ex: CARD-001"
                  autoFocus 
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalDevolverCoringaOpen(false)} className="px-3 py-1.5 bg-white/10 text-slate-300 rounded-xl text-xs font-semibold">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold">
                  Confirmar Devolução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leitor de Câmera Modal */}
      {isCameraAberta && (
        <LeitorQrCameraModal 
          isOpen={isCameraAberta}
          onClose={() => setIsCameraAberta(false)}
          onScanSuccess={handleCameraScan}
          titulo={cameraContexto === 'cartao' ? 'Ler Cartão ou QR Code do Cliente' : 'Bipar Código de Barras / QR da Embalagem'}
          subtitulo="Aponte a câmera para o QR Code do cartão ou para a lata/garrafa"
        />
      )}

      {/* Modal: Escolher Produto do Cardápio / Menu (Sem Equipamento) */}
      {isModalMenuProdutosOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#0a1120] border border-white/15 shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">Cardápio do Bar — Selecionar Produto</h2>
                  <p className="text-xs text-slate-400">Toque no produto para lançar diretamente na conferência do balcão</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalMenuProdutosOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra de Busca e Filtros de Categoria */}
            <div className="p-3 sm:p-4 border-b border-white/10 bg-slate-900/40 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={buscaMenuProduto}
                  onChange={(e) => setBuscaMenuProduto(e.target.value)}
                  placeholder="Buscar produto por nome, marca ou EAN..."
                  className="w-full pl-10 pr-8 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50"
                  autoFocus
                />
                {buscaMenuProduto && (
                  <button
                    onClick={() => setBuscaMenuProduto('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categorias Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar text-[11px] font-bold">
                {categoriasMenu.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaFiltroMenu(cat.id)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                      categoriaFiltroMenu === cat.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/25'
                        : 'bg-white/[0.06] hover:bg-white/10 text-slate-300 border border-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de Produtos com ProdutoGlassThumb */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
              {produtosFiltradosMenu.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <Wine size={38} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-semibold">Nenhum produto encontrado</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {produtosDisponiveis.length === 0 
                      ? 'Não há produtos com estoque disponível neste bar.' 
                      : 'Tente buscar com outro termo ou selecione outro filtro de categoria.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {produtosFiltradosMenu.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleSelecionarProdutoMenu(prod)}
                      className="group relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] hover:from-white/[0.14] hover:to-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-amber-400/50 p-2.5 text-left transition-all duration-200 flex flex-col justify-between shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 active:scale-95"
                    >
                      <div>
                        <ProdutoGlassThumb
                          fotoUrl={prod.foto_url}
                          nome={prod.nome}
                          categoria={prod.categoria}
                          subcategoria={prod.subcategoria}
                          tamanho="full"
                          aspectRatio="square"
                          containerClassName="mb-2"
                        >
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-white/15 text-[9px] font-bold text-emerald-300 z-10">
                            {prod.quantidade_gondola ?? prod.quantidade_estoque} un
                          </span>
                        </ProdutoGlassThumb>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 line-clamp-1">
                          {prod.marca || prod.categoria || 'Bar'}
                        </span>
                        <h3 className="text-xs font-bold text-white line-clamp-2 mt-0.5 group-hover:text-amber-300 transition-colors">
                          {prod.nome}
                        </h3>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs sm:text-sm font-black text-amber-400 tabular-nums">
                          R$ {prod.preco_venda.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-300 font-bold group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
                          Escolher
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-3 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
              <span>Exibindo <strong>{produtosFiltradosMenu.length}</strong> produtos disponíveis</span>
              <button
                onClick={() => setIsModalMenuProdutosOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1D: Cadastro Rápido (Novo Irmão ou Convidado + E-mail + Vínculo Cartão/Doc QR) */}
      {isModalCadastroClienteOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSalvarCadastroCliente}
            className="w-full max-w-md rounded-3xl bg-[#0B1324] border border-emerald-400/30 p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <UserPlus size={17} className="text-emerald-400" />
                  Novo Cliente (E-Sigma ∴ Ágape)
                </h3>
                <p className="text-[11px] text-slate-400">Cadastro rápido de Novo Irmão ou Convidado</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalCadastroClienteOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  CPF ou CIM
                </label>
                <input
                  type="text"
                  value={cadClienteCpfCim}
                  onChange={(e) => setCadClienteCpfCim(e.target.value)}
                  placeholder="Digite o CIM (5–7 dígitos) ou CPF"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={cadClienteNome}
                  onChange={(e) => setCadClienteNome(e.target.value)}
                  placeholder="Ex: Marcos Vinicius de Oliveira"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    E-mail * (Obrigatório)
                  </label>
                  <input
                    type="email"
                    required
                    value={cadClienteEmail}
                    onChange={(e) => setCadClienteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    WhatsApp / Telefone
                  </label>
                  <input
                    type="text"
                    value={cadClienteTelefone}
                    onChange={(e) => setCadClienteTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Vínculo do Cliente / Obreiro
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCadClienteTipo('IRMAO_QUADRO')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      cadClienteTipo === 'IRMAO_QUADRO'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-400'
                    }`}
                  >
                    Novo Irmão
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadClienteTipo('CONVIDADO_NAO_MACOM')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      cadClienteTipo === 'CONVIDADO_NAO_MACOM'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-white/[0.04] border-white/10 text-slate-400'
                    }`}
                  >
                    Convidado
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Dependentes (esposa e filhos) são cadastrados diretamente na ficha do Irmão titular.
                </p>
              </div>

              {/* Vincular Cartão Genérico / Documento com QR Code */}
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 block">
                  Vincular Cartão / Documento QR Code
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraContexto('cad_cartao');
                      setIsCameraAberta(true);
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1"
                  >
                    <CreditCard size={13} className="text-emerald-400" />
                    + Ler Cartão Genérico
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraContexto('cad_doc');
                      setIsCameraAberta(true);
                    }}
                    className="py-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1"
                  >
                    <QrCode size={13} className="text-cyan-400" />
                    + Ler Doc. c/ QR Code
                  </button>
                </div>

                <input
                  type="text"
                  value={cadCartaoGenerico}
                  onChange={(e) => setCadCartaoGenerico(e.target.value)}
                  placeholder="Ou digite o código do cartão genérico (opcional)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/10 text-[11px] text-white font-mono focus:outline-none"
                />

                {(cadCartaoGenerico || cadDocumentosQr.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {cadCartaoGenerico && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-[10px] text-emerald-300 font-mono">
                        Cartão: {cadCartaoGenerico}
                        <button type="button" onClick={() => setCadCartaoGenerico('')} className="hover:text-white">×</button>
                      </span>
                    )}
                    {cadDocumentosQr.map((d) => (
                      <span
                        key={d.codigo}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-[10px] text-cyan-200 font-mono"
                      >
                        {d.rotulo}
                        <button
                          type="button"
                          onClick={() => setCadDocumentosQr((prev) => prev.filter((x) => x.codigo !== d.codigo))}
                          className="hover:text-white"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsModalCadastroClienteOpen(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoCadastroCliente}
                className="flex-1 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-black hover:bg-emerald-300 transition disabled:opacity-50"
              >
                {salvandoCadastroCliente ? 'Salvando...' : 'Cadastrar e Abrir Comanda →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Cadastro Rápido de Dependente (a partir da 1C) */}
      {isModalCadastroDependenteOpen && clienteDetalhesAtivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSalvarDependente}
            className="w-full max-w-sm rounded-3xl bg-[#0B1324] border border-cyan-400/30 p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Users size={16} className="text-cyan-400" />
                  Cadastrar Dependente
                </h3>
                <p className="text-[11px] text-slate-400">
                  Vinculado a <strong className="text-white">{clienteDetalhesAtivo.cliente.nome}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalCadastroDependenteOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={depNome}
                  onChange={(e) => setDepNome(e.target.value)}
                  placeholder="Ex: Mariana Silveira"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Parentesco
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Esposa', 'Filho', 'Filha'].map((par) => (
                    <button
                      key={par}
                      type="button"
                      onClick={() => setDepParentesco(par)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition ${
                        depParentesco === par
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-white/[0.04] border-white/10 text-slate-400'
                      }`}
                    >
                      {par}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  E-mail * (Obrigatório)
                </label>
                <input
                  type="email"
                  required
                  value={depEmail}
                  onChange={(e) => setDepEmail(e.target.value)}
                  placeholder="dependente@exemplo.com"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  WhatsApp / Telefone
                </label>
                <input
                  type="text"
                  value={depTelefone}
                  onChange={(e) => setDepTelefone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400/50"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsModalCadastroDependenteOpen(false)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoDependente}
                className="flex-1 py-2 rounded-xl bg-cyan-400 text-slate-950 text-xs font-black hover:bg-cyan-300 transition disabled:opacity-50"
              >
                {salvandoDependente ? 'Salvando...' : 'Salvar Dependente'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
