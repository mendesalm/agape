import { useEffect, useState, useRef, type FormEvent } from 'react';
import { api } from '../services/api';
import {
  QrCode,
  ScanBarcode,
  Keyboard,
  Camera,
  UserPlus,
  Users,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Search,
  Plus,
  Minus,
  UtensilsCrossed,
  Receipt,
  CreditCard,
  X,
  ShoppingBag,
  Sparkles,
  BadgeCheck,
  Radio,
  RotateCcw,
  ClipboardList,
} from 'lucide-react';
import { LeitorQrCameraModal } from '../components/LeitorQrCameraModal';
import { ProdutoGlassThumb } from '../components/ProdutoGlassThumb';
import { FecharComandaModal } from '../components/FecharComandaModal';
import { ComprovanteTermicoModal, type DadosComprovante } from '../components/ComprovanteTermicoModal';

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

type AbaStitch = 'comanda' | 'cardapio' | 'historico' | 'fechamento';
type ModoIdentificacao = 'qr' | 'manual';

export function Comandas() {
  const userStr = localStorage.getItem('bipfy_user') || localStorage.getItem('barix_user') || localStorage.getItem('@Barix:user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const lojaNome = localStorage.getItem('@Barix:ambito_titulo') || userObj?.loja_atual?.nome_fantasia || 'Loja João Pedro Junqueira';

  const [abaAtiva, setAbaAtiva] = useState<AbaStitch>('comanda');
  const [modoIdentificacao, setModoIdentificacao] = useState<ModoIdentificacao>('qr');
  const [modoCadastro1D, setModoCadastro1D] = useState(false);

  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucessoFeedback, setSucessoFeedback] = useState<string | null>(null);

  // Cliente / Comanda ativa
  const [cartaoClienteInput, setCartaoClienteInput] = useState('');
  const [comandaBalcaoAtiva, setComandaBalcaoAtiva] = useState<Comanda | null>(null);
  const [clienteDetalhesAtivo, setClienteDetalhesAtivo] = useState<{
    cliente: { id: number; nome: string; cpf?: string; cim?: string; email?: string; telefone?: string; tipo_consumidor?: string };
    carteira: { saldo: number; limite_fiado: number };
    cartao_ativo?: string | null;
    dependentes: Array<{ id: number; nome: string; parentesco: string; email?: string; telefone?: string; autorizacao_pausada?: boolean; limite_sessao?: number | null }>;
  } | null>(null);
  const [retiranteSelecionado, setRetiranteSelecionado] = useState<{ id: number; nome: string; parentesco: string } | null>(null);
  const [resultadosBuscaCliente, setResultadosBuscaCliente] = useState<Array<{ id: number; nome: string; cpf?: string; cim?: string }>>([]);
  const [isModalComandasAbertas, setIsModalComandasAbertas] = useState(false);

  // Câmera
  const [isCameraAberta, setIsCameraAberta] = useState(false);
  const [cameraContexto, setCameraContexto] = useState<'cartao' | 'produto' | 'cad_cartao' | 'cad_doc'>('cartao');

  // 1D: Cadastro Novo Cliente
  const [cadClienteCim, setCadClienteCim] = useState('');
  const [cadClienteCpf, setCadClienteCpf] = useState('');
  const [cadClienteNome, setCadClienteNome] = useState('');
  const [cadClienteEmail, setCadClienteEmail] = useState('');
  const [cadClienteTelefone, setCadClienteTelefone] = useState('');
  const [cadClienteTipo, setCadClienteTipo] = useState<'IRMAO_QUADRO' | 'CONVIDADO_NAO_MACOM'>('IRMAO_QUADRO');
  const [cadCartaoGenerico, setCadCartaoGenerico] = useState('');
  const [cadDocumentosQr, setCadDocumentosQr] = useState<Array<{ tipo: string; rotulo: string; codigo: string }>>([]);
  const [salvandoCadastroCliente, setSalvandoCadastroCliente] = useState(false);

  // Cadastro Rápido Dependente (1C)
  const [isModalCadastroDependenteOpen, setIsModalCadastroDependenteOpen] = useState(false);
  const [depNome, setDepNome] = useState('');
  const [depEmail, setDepEmail] = useState('');
  const [depTelefone, setDepTelefone] = useState('');
  const [depParentesco, setDepParentesco] = useState('Esposa');
  const [salvandoDependente, setSalvandoDependente] = useState(false);

  // Tela 2: Cardápio & Bandeja
  const [buscaMenuProduto, setBuscaMenuProduto] = useState('');
  const [categoriaFiltroMenu, setCategoriaFiltroMenu] = useState('todos');
  const [bandeja, setBandeja] = useState<Record<number, number>>({});
  const [enviandoBandeja, setEnviandoBandeja] = useState(false);

  // Tela 4: Fechamento & Comprovante
  const [isModalFecharOpen, setIsModalFecharOpen] = useState(false);
  const [comprovanteAtual, setComprovanteAtual] = useState<DadosComprovante | null>(null);
  const [isModalComprovanteOpen, setIsModalComprovanteOpen] = useState(false);

  // Devolver Cartão Coringa
  const [isModalDevolverCoringaOpen, setIsModalDevolverCoringaOpen] = useState(false);
  const [devolverCodigoCartao, setDevolverCodigoCartao] = useState('');

  const inputCartaoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [respComandas, respProdutos] = await Promise.all([
        api.get('/comandas/').catch(() => ({ data: [] })),
        api.get('/produtos/?apenas_com_estoque=true').catch(() => ({ data: [] })),
      ]);
      const lista = Array.isArray(respComandas.data) ? respComandas.data : [];
      setComandas(lista);
      setProdutos(Array.isArray(respProdutos.data) ? respProdutos.data : []);
      if (comandaBalcaoAtiva) {
        const atual = lista.find((c: Comanda) => c.id === comandaBalcaoAtiva.id);
        if (atual) setComandaBalcaoAtiva(atual);
      }
    } finally {
      setLoading(false);
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

  const handleIdentificarClienteBalcao = async (e?: FormEvent, codigoForcado?: string) => {
    if (e) e.preventDefault();
    const termo = (codigoForcado || cartaoClienteInput).trim();
    if (!termo) return;

    try {
      const res = await api.post('/comandas/identificar-cartao', { identificador_cartao: termo });
      setComandaBalcaoAtiva(res.data);
      setRetiranteSelecionado(null);
      setResultadosBuscaCliente([]);
      setModoCadastro1D(false);
      await carregarDetalhesClienteAtivo(res.data.cliente_id);
      setSucessoFeedback(`Cliente identificado: ${res.data.nome_cliente || res.data.identificador_cartao}`);
      setTimeout(() => setSucessoFeedback(null), 3000);
      carregarDados();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Cliente não identificado.';
      if (confirm(`${msg}\n\nDeseja cadastrar "${termo}" como Novo Irmão ou Convidado agora?`)) {
        abrirTelaCadastro1D(termo);
      }
    }
  };

  const formatarCpfInput = (valor: string) => {
    const digitos = valor.replace(/\D/g, '').slice(0, 11);
    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
  };

  const abrirTelaCadastro1D = (docInicial = '') => {
    const digitos = docInicial.replace(/\D/g, '');
    if (digitos.length === 11) {
      setCadClienteCpf(formatarCpfInput(digitos));
      setCadClienteCim('');
    } else if (digitos.length >= 4 && digitos.length <= 8) {
      setCadClienteCim(digitos);
      setCadClienteCpf('');
    } else {
      setCadClienteCim('');
      setCadClienteCpf('');
    }
    setCadClienteNome('');
    setCadClienteEmail('');
    setCadClienteTelefone('');
    setCadClienteTipo('IRMAO_QUADRO');
    setCadCartaoGenerico('');
    setCadDocumentosQr([]);
    setModoCadastro1D(true);
    setAbaAtiva('comanda');
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
    const cimLimpo = cadClienteCim.replace(/\D/g, '');
    const cpfLimpo = cadClienteCpf.replace(/\D/g, '');
    if (!cimLimpo && !cpfLimpo) {
      alert('Informe pelo menos o CIM ou o CPF do cliente.');
      return;
    }
    if (cimLimpo && (cimLimpo.length < 4 || cimLimpo.length > 8)) {
      alert('CIM inválido. Informe entre 4 e 8 dígitos.');
      return;
    }
    if (cpfLimpo && cpfLimpo.length !== 11) {
      alert('CPF inválido. Informe os 11 dígitos do CPF.');
      return;
    }
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
        cim: cimLimpo || null,
        cpf: cpfLimpo || null,
        tipo_consumidor: cadClienteTipo,
        documentos_qr: cadDocumentosQr,
        codigo_cartao_coringa: cadCartaoGenerico.trim() || null,
      });
      const novoCliente = res.data?.cliente;
      setModoCadastro1D(false);
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

  const finalizarAtendimentoBalcao = () => {
    setComandaBalcaoAtiva(null);
    setClienteDetalhesAtivo(null);
    setRetiranteSelecionado(null);
    setCartaoClienteInput('');
    setBandeja({});
    setModoCadastro1D(false);
    setAbaAtiva('comanda');
  };

  const handleCameraScan = async (codigo: string) => {
    setIsCameraAberta(false);
    const limpo = codigo.trim();
    if (!limpo) return;

    if (cameraContexto === 'cartao') {
      setCartaoClienteInput(limpo);
      await handleIdentificarClienteBalcao(undefined, limpo);
    } else if (cameraContexto === 'cad_cartao') {
      setCadCartaoGenerico(limpo);
    } else if (cameraContexto === 'cad_doc') {
      setCadDocumentosQr((prev) =>
        prev.some((d) => d.codigo === limpo)
          ? prev
          : [...prev, { tipo: 'DOCUMENTO_QR', rotulo: `Doc QR (${limpo.slice(0, 10)})`, codigo: limpo }]
      );
    } else if (cameraContexto === 'produto') {
      try {
        const res = await api.get(`/produtos/codigo/${encodeURIComponent(limpo)}`);
        if (res.data?.id) {
          alterarBandeja(res.data.id, 1);
          setSucessoFeedback(`+1 ${res.data.nome} adicionado à bandeja!`);
          setTimeout(() => setSucessoFeedback(null), 2500);
        }
      } catch {
        alert(`Produto com código "${limpo}" não encontrado.`);
      }
    }
  };

  const alterarBandeja = (produtoId: number, delta: number) => {
    setBandeja((prev) => {
      const atual = prev[produtoId] || 0;
      const prox = Math.max(0, atual + delta);
      if (prox === 0) {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      }
      return { ...prev, [produtoId]: prox };
    });
  };

  const lancarBandejaNaComanda = async () => {
    if (!comandaBalcaoAtiva) {
      alert('Identifique um cliente na aba Comanda primeiro.');
      setAbaAtiva('comanda');
      return;
    }
    const entries = Object.entries(bandeja);
    if (entries.length === 0) return;

    try {
      setEnviandoBandeja(true);
      const obs = retiranteSelecionado
        ? `Retirado por: ${retiranteSelecionado.nome} (${retiranteSelecionado.parentesco})`
        : undefined;

      for (const [prodIdStr, qtd] of entries) {
        await api.post(`/comandas/${comandaBalcaoAtiva.id}/itens`, {
          produto_id: parseInt(prodIdStr, 10),
          quantidade: qtd,
          observacao: obs,
        });
      }

      const res = await api.get(`/comandas/${comandaBalcaoAtiva.id}`);
      setComandaBalcaoAtiva(res.data);
      setBandeja({});
      await carregarDados();
      setSucessoFeedback('Itens lançados na comanda!');
      setTimeout(() => setSucessoFeedback(null), 3000);
      setAbaAtiva('historico');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao lançar itens na comanda.');
    } finally {
      setEnviandoBandeja(false);
    }
  };

  const handleDevolverCoringa = async (e: FormEvent) => {
    e.preventDefault();
    if (!devolverCodigoCartao.trim()) return;
    try {
      const res = await api.post('/cartoes/devolver-coringa', {
        codigo_cartao: devolverCodigoCartao.trim(),
        confirmar_pagamento_e_fechamento: true,
      });
      alert(res.data.mensagem || 'Cartão liberado!');
      setIsModalDevolverCoringaOpen(false);
      setDevolverCodigoCartao('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao devolver cartão.');
    }
  };

  const getProduto = (id: number) => produtos.find((p) => p.id === id);

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
    if (categoriaFiltroMenu === 'alcoolicas') return cat.includes('bebida') && sub.includes('alcool') && !sub.includes('nao');
    if (categoriaFiltroMenu === 'nao_alcoolicas') return cat.includes('bebida') && (sub.includes('nao') || !sub.includes('alcool'));
    if (categoriaFiltroMenu === 'alimentos') return cat.includes('alimento');
    return true;
  });

  const totalItensBandeja = Object.values(bandeja).reduce((a, b) => a + b, 0);
  const totalValorBandeja = Object.entries(bandeja).reduce((acc, [id, qtd]) => {
    const prod = getProduto(parseInt(id, 10));
    return acc + (prod ? prod.preco_venda * qtd : 0);
  }, 0);

  const comandasAbertas = comandas.filter((c) => c.status === 'ABERTA');
  const digitosInput = cartaoClienteInput.replace(/\D/g, '');
  const totalAcumuladoAtiva = comandaBalcaoAtiva?.total || 0;
  const saldoCarteiraAtivo = clienteDetalhesAtivo?.carteira?.saldo ?? null;

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-[#090d16] text-slate-100 flex flex-col items-center justify-between px-3 py-3 sm:py-5 overflow-hidden">
      <div className="w-full max-w-md flex-1 min-h-0 flex flex-col justify-between bg-[#0f131c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* TOP HEADER PADRÃO STITCH (TELA 1) */}
        <header className="px-4 py-3 bg-[#0a0e17] border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <QrCode size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black tracking-tight text-white leading-tight truncate">
                E-Sigma ∴ Ágape
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                {lojaNome}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsModalComandasAbertas(true)}
              className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 transition"
              title="Ver comandas abertas"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Abertas ({comandasAbertas.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setIsModalDevolverCoringaOpen(true)}
              className="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 flex items-center justify-center text-amber-300 transition"
              title="Devolver Cartão Genérico"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </header>

        {/* FEEDBACK RÁPIDO */}
        {sucessoFeedback && (
          <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
            <span className="truncate">{sucessoFeedback}</span>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL (POR ABA) */}
        <div className="flex-1 min-h-0 flex flex-col p-3.5 gap-3 overflow-y-auto">
          {/* ============================================================== */}
          {/* ABA 1: COMANDA (TELAS 1, 1B, 1C, 1D)                          */}
          {/* ============================================================== */}
          {abaAtiva === 'comanda' && (
            <>
              {/* CARD DE ESTADO DA COMANDA */}
              <div className="p-3 rounded-2xl bg-[#181b25] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <Radio size={12} className="text-emerald-400" />
                    <span>Comanda Eletrônica</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-2xl font-black text-white tabular-nums">
                      Nº #{comandaBalcaoAtiva ? comandaBalcaoAtiva.id : '---'}
                    </span>
                    <span className="text-[11px] text-slate-400">(NFC / Físico)</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      comandaBalcaoAtiva
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                        : modoCadastro1D
                        ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                        : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
                    }`}
                  >
                    {comandaBalcaoAtiva ? '• Cliente Identificado' : modoCadastro1D ? 'Aguardando Cadastro' : 'Aguardando Cliente'}
                  </span>
                  <div className="text-[10px] text-slate-400 font-semibold">Balcão Principal</div>
                </div>
              </div>

              {/* MODO 1D: PÁGINA COMPLETA DE CADASTRO NOVO CLIENTE */}
              {modoCadastro1D ? (
                <form onSubmit={handleSalvarCadastroCliente} className="flex-1 flex flex-col justify-between gap-2.5 bg-[#181b25] border border-white/10 rounded-2xl p-3.5">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-black text-white">Novo Cliente</span>
                        <span className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                          Novo
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setModoCadastro1D(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            CIM {!cadClienteCpf.replace(/\D/g, '') && '*'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cadClienteCim}
                            onChange={(e) => setCadClienteCim(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="5–7 dígitos"
                            className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            CPF {!cadClienteCim.replace(/\D/g, '') && '*'}
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cadClienteCpf}
                            onChange={(e) => setCadClienteCpf(formatarCpfInput(e.target.value))}
                            placeholder="000.000.000-00"
                            className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Obrigatório informar pelo menos o CIM ou o CPF.
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={cadClienteNome}
                        onChange={(e) => setCadClienteNome(e.target.value)}
                        placeholder="Ex: Marcos Vinicius de Oliveira"
                        className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">E-mail *</label>
                        <input
                          type="email"
                          required
                          value={cadClienteEmail}
                          onChange={(e) => setCadClienteEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                          className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">WhatsApp / Tel</label>
                        <input
                          type="text"
                          value={cadClienteTelefone}
                          onChange={(e) => setCadClienteTelefone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3 py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Vínculo do Cliente / Obreiro</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCadClienteTipo('IRMAO_QUADRO')}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            cadClienteTipo === 'IRMAO_QUADRO'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-[#0a0e17] border-white/10 text-slate-400'
                          }`}
                        >
                          Novo Irmão
                        </button>
                        <button
                          type="button"
                          onClick={() => setCadClienteTipo('CONVIDADO_NAO_MACOM')}
                          className={`py-2 rounded-xl text-xs font-bold border transition ${
                            cadClienteTipo === 'CONVIDADO_NAO_MACOM'
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                              : 'bg-[#0a0e17] border-white/10 text-slate-400'
                          }`}
                        >
                          Convidado
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Dependentes (esposa e filhos) são cadastrados na ficha do Irmão titular.
                      </p>
                    </div>

                    {/* VINCULAR CARTÃO / DOC QR */}
                    <div className="p-2.5 rounded-xl bg-[#0a0e17] border border-white/10 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-cyan-300 block">Vincular Cartão / Doc QR</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCameraContexto('cad_cartao');
                            setIsCameraAberta(true);
                          }}
                          className="py-1.5 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-slate-200 flex items-center justify-center gap-1"
                        >
                          <CreditCard size={12} className="text-emerald-400" />
                          + Ler Cartão Genérico
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCameraContexto('cad_doc');
                            setIsCameraAberta(true);
                          }}
                          className="py-1.5 px-2 rounded-lg bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-slate-200 flex items-center justify-center gap-1"
                        >
                          <QrCode size={12} className="text-cyan-400" />
                          + Ler Doc. c/ QR
                        </button>
                      </div>
                      <input
                        type="text"
                        value={cadCartaoGenerico}
                        onChange={(e) => setCadCartaoGenerico(e.target.value)}
                        placeholder="Ou digite código do cartão genérico"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#181b25] border border-white/10 text-[11px] text-white font-mono focus:outline-none"
                      />
                      {(cadCartaoGenerico || cadDocumentosQr.length > 0) && (
                        <div className="flex flex-wrap gap-1.5">
                          {cadCartaoGenerico && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-[10px] text-emerald-300 font-mono">
                              Cartão {cadCartaoGenerico}
                              <button type="button" onClick={() => setCadCartaoGenerico('')}>×</button>
                            </span>
                          )}
                          {cadDocumentosQr.map((d) => (
                            <span key={d.codigo} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-[10px] text-cyan-200 font-mono">
                              {d.rotulo}
                              <button type="button" onClick={() => setCadDocumentosQr((prev) => prev.filter((x) => x.codigo !== d.codigo))}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setModoCadastro1D(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoCadastroCliente}
                      className="flex-1 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] text-xs font-black transition disabled:opacity-50"
                    >
                      {salvandoCadastroCliente ? 'Salvando...' : 'Cadastrar e Abrir →'}
                    </button>
                  </div>
                </form>
              ) : comandaBalcaoAtiva ? (
                /* MODO 1C: CLIENTE IDENTIFICADO COM DEPENDENTES */
                <div className="flex-1 flex flex-col justify-between gap-3 bg-[#181b25] border border-emerald-400/25 rounded-2xl p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 font-black text-xl shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                        {(comandaBalcaoAtiva.nome_cliente || 'CL')
                          .split(' ')
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-black text-white truncate">
                            {comandaBalcaoAtiva.nome_cliente || 'Cliente Identificado'}
                          </h3>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-black uppercase shrink-0">
                            {clienteDetalhesAtivo?.cliente?.tipo_consumidor?.includes('IRMAO')
                              ? 'Irmão'
                              : clienteDetalhesAtivo?.cliente?.tipo_consumidor === 'FAMILIAR'
                              ? 'Dependente'
                              : 'Convidado'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {clienteDetalhesAtivo?.cliente?.cim ? `CIM: ${clienteDetalhesAtivo.cliente.cim} • ` : ''}
                          Cartão: {comandaBalcaoAtiva.identificador_cartao || `#${comandaBalcaoAtiva.id}`}
                        </p>
                      </div>
                    </div>

                    {saldoCarteiraAtivo !== null && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <Wallet size={16} className="text-emerald-400" />
                          Saldo / Limite Pré-Pago
                        </span>
                        <span className="text-lg font-black text-emerald-400 tabular-nums">
                          R$ {Number(saldoCarteiraAtivo).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    )}

                    {/* DEPENDENTES AUTORIZADOS */}
                    {clienteDetalhesAtivo && (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                            <Users size={14} className="text-cyan-400" />
                            Dependentes Autorizados
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsModalCadastroDependenteOpen(true)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/25 transition"
                          >
                            + Cadastrar
                          </button>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          <button
                            type="button"
                            onClick={() => setRetiranteSelecionado(null)}
                            className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                              !retiranteSelecionado
                                ? 'bg-emerald-500/15 border-emerald-400/50 text-white'
                                : 'bg-[#0a0e17] border-white/10 text-slate-300'
                            }`}
                          >
                            <span className="font-bold">Titular ({comandaBalcaoAtiva.nome_cliente})</span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              {!retiranteSelecionado ? '✓ Retirando' : 'Selecionar'}
                            </span>
                          </button>

                          {(clienteDetalhesAtivo.dependentes || []).map((dep) => (
                            <button
                              key={dep.id}
                              type="button"
                              disabled={Boolean(dep.autorizacao_pausada)}
                              onClick={() =>
                                setRetiranteSelecionado(
                                  retiranteSelecionado?.id === dep.id
                                    ? null
                                    : { id: dep.id, nome: dep.nome, parentesco: dep.parentesco }
                                )
                              }
                              className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                                dep.autorizacao_pausada
                                  ? 'bg-rose-500/10 border-rose-400/20 text-rose-300/60 cursor-not-allowed'
                                  : retiranteSelecionado?.id === dep.id
                                  ? 'bg-cyan-500/15 border-cyan-400/50 text-white'
                                  : 'bg-[#0a0e17] border-white/10 text-slate-200 hover:border-cyan-400/30'
                              }`}
                            >
                              <div>
                                <span className="font-bold block">{dep.nome}</span>
                                <span className="text-[10px] text-slate-400">{dep.parentesco}</span>
                              </div>
                              <span className={`text-[10px] font-bold ${dep.autorizacao_pausada ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {dep.autorizacao_pausada
                                  ? 'Pausado'
                                  : retiranteSelecionado?.id === dep.id
                                  ? '✓ Retirando'
                                  : 'Autorizado'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAbaAtiva('cardapio')}
                      className="w-full py-3.5 rounded-2xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                    >
                      <CheckCircle2 size={18} />
                      <span>Confirmar e Iniciar Pedidos →</span>
                    </button>
                    <button
                      type="button"
                      onClick={finalizarAtendimentoBalcao}
                      className="w-full py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
                    >
                      Trocar cliente
                    </button>
                  </div>
                </div>
              ) : (
                /* MODO 1 & 1B: SELETOR + VISOR QR OU NUMPAD */
                <>
                  <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#181b25] border border-white/10 gap-1">
                    <button
                      type="button"
                      onClick={() => setModoIdentificacao('qr')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        modoIdentificacao === 'qr'
                          ? 'bg-[#0a0e17] border border-emerald-400/50 text-emerald-300 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <QrCode size={15} />
                      <span>Escanear QR / Cartão</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoIdentificacao('manual')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                        modoIdentificacao === 'manual'
                          ? 'bg-[#0a0e17] border border-emerald-400/50 text-emerald-300 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Keyboard size={15} />
                      <span>Digitar CPF ou CIM</span>
                    </button>
                  </div>

                  {modoIdentificacao === 'qr' ? (
                    <div className="flex-1 flex flex-col justify-between gap-2.5">
                      {/* VISOR DE CÂMERA NEON (IGUAL À TELA APROVADA) */}
                      <div
                        onClick={() => {
                          setCameraContexto('cartao');
                          setIsCameraAberta(true);
                        }}
                        className="relative flex-1 min-h-[240px] rounded-2xl bg-[#070a11] border border-white/10 flex flex-col items-center justify-center cursor-pointer group overflow-hidden p-4"
                      >
                        <div className="relative w-40 h-40 flex items-center justify-center">
                          <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-xl" />
                          <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-xl" />
                          <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-xl" />
                          <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-xl" />
                          <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981]" />
                        </div>
                        <span className="mt-4 px-3 py-1 rounded-full bg-[#181b25] border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 group-hover:border-emerald-400/50 transition">
                          <Camera size={13} className="text-emerald-400" />
                          Toque para abrir câmera • Leitor QR
                        </span>
                      </div>

                      <form onSubmit={(e) => handleIdentificarClienteBalcao(e)} className="flex gap-2">
                        <input
                          ref={inputCartaoRef}
                          type="text"
                          value={cartaoClienteInput}
                          onChange={(e) => setCartaoClienteInput(e.target.value)}
                          placeholder="Ou bipe com leitor USB / digite o código..."
                          className="flex-1 px-3 py-2 rounded-xl bg-[#181b25] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50"
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
                        >
                          OK
                        </button>
                      </form>

                      <div className="px-3 py-2 rounded-xl bg-[#181b25] border border-white/10 text-[11px] text-slate-300 flex items-center gap-2">
                        <BadgeCheck size={16} className="text-emerald-400 shrink-0" />
                        <span>Aponte para o QR Code do Obreiro ou Cartão da Comanda</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => abrirTelaCadastro1D(cartaoClienteInput.trim())}
                        className="w-full py-2.5 rounded-xl bg-[#181b25] hover:bg-white/[0.06] border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition"
                      >
                        <UserPlus size={15} />
                        <span>+ Cadastrar Novo Cliente / Visitante</span>
                      </button>
                    </div>
                  ) : (
                    /* MODO 1B: NUMPAD IN-PLACE */
                    <div className="flex-1 flex flex-col justify-between gap-2.5 bg-[#181b25] border border-white/10 rounded-2xl p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-300 uppercase">CPF ou CIM do Cliente / Obreiro</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                            {digitosInput.length <= 7 ? 'CIM (Obreiro)' : 'CPF'} • {digitosInput.length} díg.
                          </span>
                        </div>
                        <input
                          type="text"
                          value={cartaoClienteInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCartaoClienteInput(v);
                            if (/[a-zA-Z]/.test(v) && v.trim().length >= 2) {
                              handleBuscarClientesPorNome(v);
                            } else {
                              setResultadosBuscaCliente([]);
                            }
                          }}
                          placeholder="Digite o CIM (5-7 dígitos), CPF ou Nome"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0e17] border border-emerald-400/30 text-base font-black text-white text-center tracking-wider tabular-nums focus:outline-none"
                        />

                        {resultadosBuscaCliente.length > 0 && (
                          <div className="rounded-xl bg-[#0a0e17] border border-white/10 divide-y divide-white/5 max-h-28 overflow-y-auto">
                            {resultadosBuscaCliente.map((cli) => (
                              <button
                                key={cli.id}
                                type="button"
                                onClick={() => handleIdentificarClienteBalcao(undefined, cli.cim || cli.cpf || String(cli.id))}
                                className="w-full px-3 py-2 text-left hover:bg-white/[0.06] flex items-center justify-between text-xs"
                              >
                                <span className="font-bold text-white">{cli.nome}</span>
                                <span className="text-[10px] font-mono text-slate-400">{cli.cim ? `CIM ${cli.cim}` : cli.cpf}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'LIMPAR', '0', 'BACK'].map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => handleNumpadPress(k)}
                            className={`py-3 rounded-xl font-bold transition active:scale-95 ${
                              k === 'LIMPAR'
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-400/20 text-xs'
                                : k === 'BACK'
                                ? 'bg-white/10 text-slate-200 border border-white/10 text-sm'
                                : 'bg-[#0a0e17] hover:bg-white/10 text-white border border-white/10 text-base'
                            }`}
                          >
                            {k === 'BACK' ? '⌫' : k}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleIdentificarClienteBalcao()}
                          className="w-full py-3 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-xs uppercase tracking-wider transition"
                        >
                          Buscar Cliente ou Obreiro
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirTelaCadastro1D(cartaoClienteInput.trim())}
                          className="w-full py-2 rounded-xl bg-[#0a0e17] border border-white/10 text-emerald-300 text-xs font-bold"
                        >
                          + Cadastrar Novo Cliente / Visitante
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ============================================================== */}
          {/* ABA 2: CARDÁPIO (TELA 2)                                       */}
          {/* ============================================================== */}
          {abaAtiva === 'cardapio' && (
            <div className="flex-1 flex flex-col gap-2.5 min-h-0">
              {/* RESUMO COMANDA ATIVA */}
              <div className="shrink-0 p-3 rounded-2xl bg-[#181b25] border border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white truncate">
                      {comandaBalcaoAtiva ? `#${comandaBalcaoAtiva.id} • ${comandaBalcaoAtiva.nome_cliente}` : 'Nenhuma comanda ativa'}
                    </span>
                  </div>
                  <div className="text-[10px] text-cyan-300 truncate">
                    {retiranteSelecionado
                      ? `Retirando: ${retiranteSelecionado.nome} (${retiranteSelecionado.parentesco})`
                      : comandaBalcaoAtiva
                      ? 'Retirando: Titular'
                      : 'Identifique um cliente na aba Comanda'}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400">Acumulado: <strong className="text-white">R$ {totalAcumuladoAtiva.toFixed(2).replace('.', ',')}</strong></div>
                  {saldoCarteiraAtivo !== null && (
                    <div className="text-[10px] text-emerald-400 font-bold">Saldo: R$ {Number(saldoCarteiraAtivo).toFixed(2).replace('.', ',')}</div>
                  )}
                </div>
              </div>

              {/* BUSCA + SCANNER */}
              <div className="shrink-0 flex items-stretch gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={buscaMenuProduto}
                    onChange={(e) => setBuscaMenuProduto(e.target.value)}
                    placeholder="Buscar produto ou código EAN..."
                    className="w-full h-12 pl-10 pr-3 rounded-2xl bg-[#181b25] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/50"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCameraContexto('produto');
                    setIsCameraAberta(true);
                  }}
                  className="h-12 px-4 rounded-2xl bg-[#10b981] hover:bg-[#34d399] active:scale-[0.98] text-[#022c22] font-black text-xs flex items-center justify-center gap-2 shrink-0 shadow-[0_0_16px_rgba(16,185,129,0.28)] transition"
                  title="Ler código de barras do produto"
                >
                  <ScanBarcode size={20} />
                  <span>Bipar</span>
                </button>
              </div>

              {/* CARROSSEL HORIZONTAL DE CATEGORIAS */}
              <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'todos', label: `Todos (${produtosDisponiveis.length})` },
                  { id: 'alcoolicas', label: 'Alcoólicas' },
                  { id: 'nao_alcoolicas', label: 'Não Alcoólicas' },
                  { id: 'alimentos', label: 'Alimentos' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoriaFiltroMenu(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap shrink-0 transition ${
                      categoriaFiltroMenu === cat.id
                        ? 'bg-[#10b981] text-[#022c22]'
                        : 'bg-[#181b25] border border-white/10 text-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* LISTA VERTICAL CONTIDA DE PRODUTOS */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                {loading ? (
                  <div className="py-10 text-center text-xs text-slate-400">Carregando cardápio...</div>
                ) : produtosFiltradosMenu.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400">Nenhum produto com estoque disponível.</div>
                ) : (
                  produtosFiltradosMenu.map((prod) => {
                    const qtd = bandeja[prod.id] || 0;
                    const disp = prod.quantidade_gondola ?? prod.quantidade_estoque;
                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 rounded-2xl bg-[#181b25] border border-white/10 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ProdutoGlassThumb
                            fotoUrl={prod.foto_url}
                            nome={prod.nome}
                            categoria={prod.categoria}
                            subcategoria={prod.subcategoria}
                            tamanho="sm"
                            aspectRatio="square"
                            containerClassName="w-12 h-12 rounded-xl shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{prod.nome}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 text-[9px] font-bold">
                                {disp} UN NO BAR
                              </span>
                              <span className="text-xs font-black text-emerald-400 tabular-nums">
                                R$ {prod.preco_venda.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {qtd > 0 ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => alterarBandeja(prod.id, -1)}
                              className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-bold"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-5 text-center text-xs font-black text-white tabular-nums">{qtd}</span>
                            <button
                              type="button"
                              onClick={() => alterarBandeja(prod.id, 1)}
                              className="w-8 h-8 rounded-xl bg-[#10b981] text-[#022c22] flex items-center justify-center font-bold"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => alterarBandeja(prod.id, 1)}
                            className="px-3 py-2 rounded-xl bg-[#0a0e17] hover:bg-white/10 border border-white/15 text-xs font-bold text-white shrink-0"
                          >
                            + Adicionar
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* BANDEJA COMPACTA NO RODAPÉ */}
              {totalItensBandeja > 0 && (
                <div className="shrink-0 p-2.5 rounded-2xl bg-[#181b25] border border-emerald-400/35 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <ShoppingBag size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Bandeja: {totalItensBandeja} itens</div>
                      <div className="text-[10px] text-slate-400">Prontos para lançar</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={enviandoBandeja}
                    onClick={lancarBandejaNaComanda}
                    className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-xs transition disabled:opacity-50"
                  >
                    {enviandoBandeja
                      ? 'Lançando...'
                      : `Lançar ${totalItensBandeja} • R$ ${totalValorBandeja.toFixed(2).replace('.', ',')} →`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 3: HISTÓRICO SEQUENCIAL (TELA 3)                           */}
          {/* ============================================================== */}
          {abaAtiva === 'historico' && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {!comandaBalcaoAtiva ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
                  <ClipboardList size={36} className="text-slate-600" />
                  <p className="text-xs font-semibold">Nenhuma comanda selecionada.</p>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('comanda')}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
                  >
                    Identificar Cliente
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-[#181b25] border border-white/10 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Acumulado</span>
                      <span className="text-lg font-black text-emerald-400 tabular-nums">
                        R$ {totalAcumuladoAtiva.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Itens Lançados</span>
                      <span className="text-lg font-black text-white tabular-nums">
                        {comandaBalcaoAtiva.itens.reduce((a, b) => a + b.quantidade, 0)} un
                      </span>
                    </div>
                  </div>

                  {/* LEGENDA DE STATUS COM QUADRADOS COLORIDOS */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] text-slate-400 px-1">
                    <span className="font-bold uppercase tracking-wider">Histórico Sequencial</span>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-amber-400" /> Solicitado</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-blue-500" /> Balcão</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-cyan-400" /> Mesa</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-[2px] bg-emerald-400" /> Pago</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[300px] space-y-2 pr-1">
                    {comandaBalcaoAtiva.itens.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-500">Nenhum item lançado ainda.</div>
                    ) : (
                      comandaBalcaoAtiva.itens.map((item, idx) => {
                        const prod = getProduto(item.produto_id);
                        const statusCor =
                          comandaBalcaoAtiva.status === 'FECHADA'
                            ? 'bg-emerald-400'
                            : (item.observacao || '').toLowerCase().includes('mesa')
                            ? 'bg-cyan-400'
                            : (item.observacao || '').toLowerCase().includes('solicitado')
                            ? 'bg-amber-400'
                            : 'bg-blue-500';
                        return (
                          <div key={idx} className="p-2.5 rounded-2xl bg-[#181b25] border border-white/10 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ProdutoGlassThumb
                                fotoUrl={item.produto_foto_url || prod?.foto_url}
                                nome={item.produto_nome || prod?.nome || `Item #${item.produto_id}`}
                                tamanho="sm"
                                aspectRatio="square"
                                containerClassName="w-10 h-10 rounded-xl shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {item.quantidade}x {item.produto_nome || prod?.nome || `Produto #${item.produto_id}`}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  R$ {item.valor_unitario.toFixed(2).replace('.', ',')} cada
                                  {item.observacao ? ` • ${item.observacao}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`w-2.5 h-2.5 rounded-[3px] ${statusCor}`} />
                              <span className="text-xs font-black text-emerald-400 tabular-nums">
                                R$ {(item.quantidade * item.valor_unitario).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAbaAtiva('cardapio')}
                      className="py-3 rounded-xl bg-[#181b25] border border-white/15 text-xs font-bold text-white"
                    >
                      + Adicionar Itens
                    </button>
                    <button
                      type="button"
                      onClick={() => setAbaAtiva('fechamento')}
                      className="py-3 rounded-xl bg-[#10b981] text-[#022c22] text-xs font-black"
                    >
                      Fechar Comanda →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* ABA 4: FECHAMENTO & PAGAMENTO (TELA 4)                         */}
          {/* ============================================================== */}
          {abaAtiva === 'fechamento' && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {!comandaBalcaoAtiva ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400 space-y-2">
                  <Receipt size={36} className="text-slate-600" />
                  <p className="text-xs font-semibold">Selecione ou identifique uma comanda para fechar.</p>
                  <button
                    type="button"
                    onClick={() => setIsModalComandasAbertas(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
                  >
                    Ver Comandas Abertas ({comandasAbertas.length})
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-[#181b25] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Comanda #{comandaBalcaoAtiva.id}</span>
                        <h3 className="text-base font-black text-white">{comandaBalcaoAtiva.nome_cliente}</h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                        {comandaBalcaoAtiva.status}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400 uppercase">Total a Pagar</span>
                      <span className="text-2xl font-black text-emerald-400 tabular-nums">
                        R$ {totalAcumuladoAtiva.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {saldoCarteiraAtivo !== null && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-semibold">Saldo da Carteira</span>
                        <span className="font-black text-emerald-400">
                          R$ {Number(saldoCarteiraAtivo).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsModalFecharOpen(true)}
                    className="w-full py-4 rounded-2xl bg-[#10b981] hover:bg-[#34d399] text-[#022c22] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Sparkles size={18} />
                    <span>Confirmar Pagamento & Liberar Comanda →</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* BARRA DE NAVEGAÇÃO INFERIOR FIXA (4 ABAS STITCH) */}
        <nav className="grid grid-cols-4 bg-[#0a0e17] border-t border-white/10 py-1.5 px-2">
          {[
            { id: 'comanda' as AbaStitch, label: 'Comanda', icon: QrCode },
            { id: 'cardapio' as AbaStitch, label: 'Cardápio', icon: UtensilsCrossed },
            { id: 'historico' as AbaStitch, label: 'Histórico', icon: Receipt },
            { id: 'fechamento' as AbaStitch, label: 'Fechamento', icon: CreditCard },
          ].map((tab) => {
            const Icon = tab.icon;
            const ativo = abaAtiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAbaAtiva(tab.id)}
                className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition ${
                  ativo ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MODAL: LISTAR COMANDAS ABERTAS */}
      {isModalComandasAbertas && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0f131c] border border-white/15 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white">Comandas Abertas ({comandasAbertas.length})</h3>
              <button onClick={() => setIsModalComandasAbertas(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2">
              {comandasAbertas.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma comanda aberta no momento.</p>
              ) : (
                comandasAbertas.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={async () => {
                      setComandaBalcaoAtiva(c);
                      setRetiranteSelecionado(null);
                      await carregarDetalhesClienteAtivo(c.cliente_id);
                      setIsModalComandasAbertas(false);
                      setAbaAtiva('comanda');
                    }}
                    className="w-full p-3 rounded-2xl bg-[#181b25] hover:border-emerald-400/50 border border-white/10 flex items-center justify-between text-left transition"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{c.nome_cliente || `Comanda #${c.id}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        #{c.id} • {c.identificador_cartao || 'Sem cartão'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-400 tabular-nums">
                        R$ {(c.total || 0).toFixed(2).replace('.', ',')}
                      </span>
                      <ArrowRight size={14} className="text-slate-400" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO DEPENDENTE (1C) */}
      {isModalCadastroDependenteOpen && clienteDetalhesAtivo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSalvarDependente} className="w-full max-w-sm rounded-3xl bg-[#0f131c] border border-cyan-400/30 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Cadastrar Dependente</h3>
                <p className="text-[11px] text-slate-400">
                  Vinculado a <strong className="text-white">{clienteDetalhesAtivo.cliente.nome}</strong>
                </p>
              </div>
              <button type="button" onClick={() => setIsModalCadastroDependenteOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              required
              value={depNome}
              onChange={(e) => setDepNome(e.target.value)}
              placeholder="Nome Completo *"
              className="w-full px-3 py-2 rounded-xl bg-[#181b25] border border-white/10 text-xs text-white"
            />
            <div className="grid grid-cols-3 gap-1.5">
              {['Esposa', 'Filho', 'Filha'].map((par) => (
                <button
                  key={par}
                  type="button"
                  onClick={() => setDepParentesco(par)}
                  className={`py-1.5 rounded-xl text-xs font-bold border ${
                    depParentesco === par
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-[#181b25] border-white/10 text-slate-400'
                  }`}
                >
                  {par}
                </button>
              ))}
            </div>
            <input
              type="email"
              required
              value={depEmail}
              onChange={(e) => setDepEmail(e.target.value)}
              placeholder="E-mail * (Obrigatório)"
              className="w-full px-3 py-2 rounded-xl bg-[#181b25] border border-white/10 text-xs text-white"
            />
            <input
              type="text"
              value={depTelefone}
              onChange={(e) => setDepTelefone(e.target.value)}
              placeholder="WhatsApp / Telefone"
              className="w-full px-3 py-2 rounded-xl bg-[#181b25] border border-white/10 text-xs text-white"
            />

            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setIsModalCadastroDependenteOpen(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold">
                Cancelar
              </button>
              <button type="submit" disabled={salvandoDependente} className="flex-1 py-2 rounded-xl bg-[#10b981] text-[#022c22] text-xs font-black">
                {salvandoDependente ? 'Salvando...' : 'Salvar Dependente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DEVOLVER CARTÃO GENÉRICO */}
      {isModalDevolverCoringaOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleDevolverCoringa} className="w-full max-w-sm rounded-3xl bg-[#0f131c] border border-amber-400/30 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-amber-300">Devolver Cartão Genérico</h3>
              <button type="button" onClick={() => setIsModalDevolverCoringaOpen(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              required
              value={devolverCodigoCartao}
              onChange={(e) => setDevolverCodigoCartao(e.target.value)}
              placeholder="Código do cartão / tag QR..."
              className="w-full px-3 py-2 rounded-xl bg-[#181b25] border border-white/10 text-xs text-white font-mono"
              autoFocus
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsModalDevolverCoringaOpen(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-black">
                Liberar Cartão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LEITOR DE CÂMERA REAL */}
      {isCameraAberta && (
        <LeitorQrCameraModal
          isOpen={isCameraAberta}
          onClose={() => setIsCameraAberta(false)}
          onScanSuccess={handleCameraScan}
          titulo={
            cameraContexto === 'cartao'
              ? 'Ler QR Code do Obreiro ou Cartão'
              : cameraContexto === 'cad_cartao'
              ? 'Ler Cartão Genérico'
              : cameraContexto === 'cad_doc'
              ? 'Ler Documento com QR Code'
              : 'Bipar Produto'
          }
          subtitulo="Aponte a câmera para o QR Code ou código de barras"
        />
      )}

      {/* MODAL FECHAR COMANDA (TELA 4) */}
      {comandaBalcaoAtiva && (
        <FecharComandaModal
          isOpen={isModalFecharOpen}
          onClose={() => setIsModalFecharOpen(false)}
          comandaId={comandaBalcaoAtiva.id}
          totalComanda={totalAcumuladoAtiva}
          clienteId={comandaBalcaoAtiva.cliente_id}
          clienteNome={comandaBalcaoAtiva.nome_cliente}
          clienteCim={clienteDetalhesAtivo?.cliente?.cim}
          identificadorCartao={comandaBalcaoAtiva.identificador_cartao}
          onSuccess={(comp) => {
            setComprovanteAtual(comp);
            setIsModalComprovanteOpen(true);
            finalizarAtendimentoBalcao();
            carregarDados();
          }}
        />
      )}

      {/* MODAL COMPROVANTE TÉRMICO + WHATSAPP / E-MAIL */}
      <ComprovanteTermicoModal
        isOpen={isModalComprovanteOpen}
        comprovante={comprovanteAtual}
        onClose={() => setIsModalComprovanteOpen(false)}
        clienteId={comprovanteAtual ? comandaBalcaoAtiva?.cliente_id : null}
      />
    </div>
  );
}
