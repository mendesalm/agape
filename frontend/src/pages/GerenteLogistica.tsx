import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../services/api';
import { 
  Plus, 
  Package, 
  AlertTriangle, 
  X, 
  ArrowRightLeft, 
  Layers, 
  ShieldAlert, 
  Clock,
  QrCode,
  Printer,
  Barcode,
  Camera,
  Building2,
  Search,
  Sparkles,
  Loader2,
  CheckCircle
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { LeitorQrCameraModal } from '../components/LeitorQrCameraModal';

interface LoteEstoque {
  id: number;
  numero_lote: string;
  data_validade: string;
  quantidade_gondola: number;
  quantidade_armazem: number;
  preco_custo_unitario: number;
  dias_para_vencer: number;
  status_validade: 'ok' | 'vencendo' | 'vencido';
}

interface Produto {
  id: number;
  nome: string;
  descricao?: string;
  foto_url?: string;
  codigo_barras?: string;
  qr_code_tag?: string;
  categoria: string;
  subcategoria?: string;
  tipo?: string;
  marca?: string;
  preco_custo: number;
  preco_venda: number;
  quantidade_gondola: number;
  quantidade_armazem: number;
  quantidade_estoque: number;
  estoque_minimo_gondola: number;
  estoque_minimo_armazem: number;
  alerta_reposicao_gondola: boolean;
  alerta_compra_armazem: boolean;
  lotes: LoteEstoque[];
  ativo: boolean;
}

export function GerenteLogistica() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Modais
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [isModalPerdaOpen, setIsModalPerdaOpen] = useState(false);
  const [isModalTransferirOpen, setIsModalTransferirOpen] = useState(false);
  const [isModalLotesOpen, setIsModalLotesOpen] = useState(false);
  const [isModalNovoLoteOpen, setIsModalNovoLoteOpen] = useState(false);
  const [isModalQrOpen, setIsModalQrOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  // Scanner Câmera
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'busca' | 'qr_fabrica' | 'ean' | 'cadastro_auto'>('busca');

  // Form Novo Produto
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [qrCodeTag, setQrCodeTag] = useState('');
  const [categoria, setCategoria] = useState<'bebidas' | 'alimentos' | 'tabacos_conveniencia' | 'outros'>('bebidas');
  const [subcategoria, setSubcategoria] = useState<string>('alcoolicas');
  const [tipo, setTipo] = useState('cervejas');
  const [marca, setMarca] = useState('');
  const [precoCusto, setPrecoCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [estoqueInicialArmazem, setEstoqueInicialArmazem] = useState('0');
  const [estoqueInicialGondola, setEstoqueInicialGondola] = useState('0');
  const [minGondola, setMinGondola] = useState('5');
  const [minArmazem, setMinArmazem] = useState('15');
  const [numeroLoteInicial, setNumeroLoteInicial] = useState('LOTE-001');
  const [validadeInicial, setValidadeInicial] = useState('');

  // Auto-Preenchimento por Código EAN / GS1
  const [buscandoEan, setBuscandoEan] = useState(false);
  const [mensagemEan, setMensagemEan] = useState<{ tipo: 'sucesso' | 'info' | 'erro'; texto: string } | null>(null);

  const consultarDadosEan = async (codigoParaConsultar?: string) => {
    const cod = (codigoParaConsultar || codigoBarras || qrCodeTag).trim();
    if (!cod) {
      setMensagemEan({ tipo: 'info', texto: 'Informe ou bipe um Código de Barras ou QR Code primeiro.' });
      return;
    }

    setBuscandoEan(true);
    setMensagemEan(null);
    try {
      const response = await api.get(`/produtos/consultar-ean/${encodeURIComponent(cod)}`);
      const dados = response.data;
      if (dados.encontrado) {
        if (dados.nome) setNome(dados.nome);
        if (dados.marca) setMarca(dados.marca);
        if (dados.categoria) setCategoria(dados.categoria);
        if (dados.subcategoria) setSubcategoria(dados.subcategoria);
        if (dados.tipo) setTipo(dados.tipo);
        if (dados.foto_url) setFotoUrl(dados.foto_url);
        if (dados.codigo_barras && !codigoBarras) setCodigoBarras(dados.codigo_barras);
        if (dados.lote_sugerido) setNumeroLoteInicial(dados.lote_sugerido);
        if (dados.data_validade_sugerida) setValidadeInicial(dados.data_validade_sugerida);
        if (dados.preco_venda_sugerido && Number(dados.preco_venda_sugerido) > 0 && !precoVenda) {
          setPrecoVenda(String(dados.preco_venda_sugerido));
        }

        setMensagemEan({
          tipo: 'sucesso',
          texto: `Identificado: ${dados.nome}! Dados preenchidos automaticamente.`
        });
      } else {
        setMensagemEan({
          tipo: 'info',
          texto: 'Código não localizado nas bases públicas. Você pode preencher os dados manualmente.'
        });
      }
    } catch (err) {
      console.error("Erro na consulta EAN:", err);
      setMensagemEan({
        tipo: 'erro',
        texto: 'Não foi possível consultar a base no momento.'
      });
    } finally {
      setBuscandoEan(false);
    }
  };

  // Form Transferência
  const [quantidadeTransferir, setQuantidadeTransferir] = useState('');

  // Form Novo Lote
  const [novoNumeroLote, setNovoNumeroLote] = useState('');
  const [novaValidade, setNovaValidade] = useState('');
  const [novaQtdLote, setNovaQtdLote] = useState('');
  const [novoDestinoLote, setNovoDestinoLote] = useState<'armazem' | 'gondola'>('armazem');

  // Form Perda
  const [quantidadePerda, setQuantidadePerda] = useState('');
  const [tipoPerda, setTipoPerda] = useState<'quebra' | 'vencimento' | 'avaria_transporte' | 'descarte_operacional' | 'outro'>('quebra');
  const [justificativaPerda, setJustificativaPerda] = useState('');
  const [localPerda, setLocalPerda] = useState<'gondola' | 'armazem'>('gondola');

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/produtos/');
      setProdutos(res.data);
    } catch (err) {
      console.error("Erro ao carregar estoque", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeituraCamera = (codigo: string) => {
    setIsCameraScannerOpen(false);
    const cod = (codigo || '').trim();
    if (!cod) return;

    if (cameraTarget === 'busca') {
      setTermoBusca(cod);
    } else if (cameraTarget === 'qr_fabrica') {
      setQrCodeTag(cod);
      const match = cod.match(/\/01\/(\d{13,14})/);
      if (match) {
        let gtin = match[1];
        if (gtin.length === 14 && gtin.startsWith('0')) gtin = gtin.substring(1);
        if (!codigoBarras) setCodigoBarras(gtin);
      }
      consultarDadosEan(cod);
    } else if (cameraTarget === 'ean') {
      setCodigoBarras(cod);
      consultarDadosEan(cod);
    } else if (cameraTarget === 'cadastro_auto') {
      setIsModalNovoOpen(true);
      if (cod.includes('/01/') || cod.startsWith('http')) {
        setQrCodeTag(cod);
        const match = cod.match(/\/01\/(\d{13,14})/);
        if (match) {
          let gtin = match[1];
          if (gtin.length === 14 && gtin.startsWith('0')) gtin = gtin.substring(1);
          setCodigoBarras(gtin);
        }
      } else {
        setCodigoBarras(cod);
      }
      consultarDadosEan(cod);
    }
  };

  const salvarNovoProduto = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/produtos/', {
        nome,
        categoria,
        subcategoria,
        tipo,
        marca,
        descricao,
        foto_url: fotoUrl || undefined,
        preco_custo: parseFloat(precoCusto),
        preco_venda: parseFloat(precoVenda),
        estoque_inicial_armazem: parseInt(estoqueInicialArmazem) || 0,
        estoque_inicial_gondola: parseInt(estoqueInicialGondola) || 0,
        estoque_minimo_gondola: parseInt(minGondola) || 5,
        estoque_minimo_armazem: parseInt(minArmazem) || 15,
        codigo_barras: codigoBarras || undefined,
        qr_code_tag: qrCodeTag || undefined,
        numero_lote_inicial: numeroLoteInicial || 'LOTE-001',
        data_validade_inicial: validadeInicial ? new Date(validadeInicial).toISOString() : undefined
      });
      setIsModalNovoOpen(false);
      resetarFormNovo();
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao cadastrar produto.");
    }
  };

  const resetarFormNovo = () => {
    setNome(''); setDescricao(''); setMarca(''); setPrecoCusto(''); setPrecoVenda('');
    setCodigoBarras(''); setQrCodeTag(''); setValidadeInicial(''); setFotoUrl(''); setMensagemEan(null);
  };

  const transferirEstoque = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      await api.post(`/produtos/${produtoSelecionado.id}/transferir-gondola`, {
        quantidade: parseInt(quantidadeTransferir)
      });
      setIsModalTransferirOpen(false);
      setQuantidadeTransferir('');
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro na transferência.");
    }
  };

  const registrarPerda = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      await api.post(`/produtos/${produtoSelecionado.id}/perda`, {
        quantidade: parseInt(quantidadePerda),
        tipo_perda: tipoPerda,
        justificativa: justificativaPerda,
        local: localPerda
      });
      setIsModalPerdaOpen(false);
      setQuantidadePerda('');
      setJustificativaPerda('');
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao registrar perda.");
    }
  };

  const adicionarNovoLote = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      await api.post(`/produtos/${produtoSelecionado.id}/lotes`, {
        numero_lote: novoNumeroLote,
        data_validade: new Date(novaValidade).toISOString(),
        quantidade: parseInt(novaQtdLote),
        destino: novoDestinoLote
      });
      setIsModalNovoLoteOpen(false);
      setNovoNumeroLote(''); setNovaValidade(''); setNovaQtdLote('');
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao adicionar lote.");
    }
  };

  // Métricas de Alertas
  const totalRepor = produtos.filter(p => p.alerta_reposicao_gondola).length;
  const totalComprar = produtos.filter(p => p.alerta_compra_armazem).length;
  const totalVencendo = produtos.reduce((acc, p) => 
    acc + p.lotes.filter(l => l.status_validade === 'vencendo' || l.status_validade === 'vencido').length, 0
  );

  const produtosFiltrados = produtos.filter(p => {
    if (!termoBusca.trim()) return true;
    const t = termoBusca.toLowerCase().trim();
    return (
      p.nome.toLowerCase().includes(t) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(t)) ||
      (p.qr_code_tag && p.qr_code_tag.toLowerCase().includes(t)) ||
      (p.marca && p.marca.toLowerCase().includes(t))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 select-none">
      
      {/* ============================================================== */}
      {/* CABEÇALHO DO NÍVEL GERENTE (Tactile Velocity)                  */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#334155] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] px-2.5 py-0.5 rounded-md bg-[#10B981]/15 border border-[#10B981]/30 font-mono">
              Nível Gerente
            </span>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Building2 size={13} className="text-[#38BDF8]" />
              Logística & Controle de Estoques
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
            Armazém Central vs. Display do Balcão
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestão de suprimentos em 2 níveis com rastreabilidade de validade FEFO.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setCameraTarget('cadastro_auto'); setIsCameraScannerOpen(true); }}
            className="min-h-[44px] px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            title="Abre a câmera para ler o QR Code da embalagem ou código de barras e cadastrar na hora"
          >
            <Camera size={16} />
            <span>Escanear QR/Barra para Cadastrar</span>
          </button>

          <button
            type="button"
            onClick={() => { setCameraTarget('busca'); setIsCameraScannerOpen(true); }}
            className="min-h-[44px] px-3.5 py-2 bg-[#131B2E] hover:bg-[#1E293B] border border-[#334155] text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Search size={15} className="text-[#38BDF8]" />
            <span>Buscar</span>
          </button>

          <button
            onClick={() => setIsModalNovoOpen(true)}
            className="min-h-[44px] px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-extrabold rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={18} />
            <span>Cadastrar Manual</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3 CARDS DE ALERTAS LOGÍSTICOS (Tactile Velocity)               */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* Alerta 1: Reposição Gôndola */}
        <div className="p-4 rounded-2xl bg-[#131B2E] border border-[#F59E0B]/40 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-[#F59E0B]/15 text-[#FFB95F] border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
            <ArrowRightLeft size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-[#FFB95F] font-mono leading-none">
              {totalRepor}
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">
              Reposição Urgente no Balcão
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Gôndola abaixo do estoque mínimo
            </span>
          </div>
        </div>

        {/* Alerta 2: Compra Armazém */}
        <div className="p-4 rounded-2xl bg-[#131B2E] border border-rose-500/40 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-rose-300 font-mono leading-none">
              {totalComprar}
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">
              Necessidade de Compra
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Depósito central em nível crítico
            </span>
          </div>
        </div>

        {/* Alerta 3: Validades FEFO */}
        <div className="p-4 rounded-2xl bg-[#131B2E] border border-[#38BDF8]/40 flex items-center gap-3.5 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-[#38BDF8]/15 text-[#7BD0FF] border border-[#38BDF8]/30 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black text-[#7BD0FF] font-mono leading-none">
              {totalVencendo}
            </div>
            <div className="text-xs text-slate-300 font-bold mt-1">
              Lotes Próximos do Vencimento
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Regra FEFO (Prioridade de saída)
            </span>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* BARRA DE BUSCA RÁPIDA (Tactile Velocity)                       */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#0B1326] border border-[#334155] shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            placeholder="Filtrar por nome do produto, código EAN-13 ou QR tag..."
            className="w-full min-h-[46px] pl-10 pr-4 py-2 rounded-xl bg-[#131B2E] border border-[#334155] focus:border-[#10B981] text-white text-sm outline-none font-mono"
          />
        </div>
        {termoBusca && (
          <button 
            onClick={() => setTermoBusca('')}
            className="text-xs text-slate-400 hover:text-white font-bold px-3 py-2 cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ============================================================== */}
      {/* TABELA DE INVENTÁRIO EM 2 NÍVEIS (Tactile Velocity)           */}
      {/* ============================================================== */}
      <div className="bg-[#0B1326] rounded-3xl border border-[#334155] shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#4EDEA3] font-mono animate-pulse">
            Carregando inventário de suprimentos...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#131B2E] border-b border-[#334155] text-slate-400 text-[10px] uppercase font-mono tracking-wider">
                  <th className="px-5 py-3.5 font-bold">Produto / Rótulo</th>
                  <th className="px-4 py-3.5 font-bold">Categoria</th>
                  <th className="px-4 py-3.5 font-bold">Preços (Custo / Venda)</th>
                  <th className="px-4 py-3.5 font-bold text-center">Display (Gôndola)</th>
                  <th className="px-4 py-3.5 font-bold text-center">Armazém (Depósito)</th>
                  <th className="px-4 py-3.5 font-bold text-center">Lotes FEFO</th>
                  <th className="px-5 py-3.5 font-bold text-right">Ações Logísticas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]/60 text-sm">
                {!produtosFiltrados.length ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <Package size={40} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-sm font-bold text-slate-300">Nenhum produto localizado no estoque.</p>
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-[#131B2E]/60 transition-colors">
                      
                      {/* PRODUTO */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center font-bold text-xs text-[#38BDF8] shrink-0 font-mono">
                            {p.nome.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-white block truncate text-sm">
                              {p.nome}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 font-mono">
                              {p.codigo_barras && (
                                <span className="flex items-center gap-0.5 text-slate-300">
                                  <Barcode size={10} /> {p.codigo_barras}
                                </span>
                              )}
                              {p.marca && <span>• {p.marca}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* CATEGORIA */}
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-[#38BDF8]/15 text-[#7BD0FF] border border-[#38BDF8]/30 font-mono">
                          {p.categoria}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5 capitalize">
                          {p.tipo || p.subcategoria}
                        </span>
                      </td>

                      {/* PREÇOS */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="text-[11px] text-slate-400">
                          Custo: R$ {p.preco_custo.toFixed(2)}
                        </div>
                        <div className="text-sm font-extrabold text-[#4EDEA3]">
                          Venda: R$ {p.preco_venda.toFixed(2)}
                        </div>
                      </td>

                      {/* GÔNDOLA (DISPLAY) */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        <div className={`text-base font-black ${
                          p.quantidade_gondola <= p.estoque_minimo_gondola ? 'text-[#F59E0B]' : 'text-[#4EDEA3]'
                        }`}>
                          {p.quantidade_gondola} un
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Mín: {p.estoque_minimo_gondola}
                        </span>
                        {p.alerta_reposicao_gondola && (
                          <span className="block text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-[#F59E0B]/20 text-[#FFB95F] mt-0.5 border border-[#F59E0B]/30">
                            Repor
                          </span>
                        )}
                      </td>

                      {/* ARMAZÉM (DEPÓSITO) */}
                      <td className="px-4 py-3.5 text-center font-mono">
                        <div className={`text-base font-black ${
                          p.quantidade_armazem <= p.estoque_minimo_armazem ? 'text-rose-400' : 'text-slate-200'
                        }`}>
                          {p.quantidade_armazem} un
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Mín: {p.estoque_minimo_armazem}
                        </span>
                      </td>

                      {/* LOTES FEFO */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => { setProdutoSelecionado(p); setIsModalLotesOpen(true); }}
                          className="px-2.5 py-1 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold font-mono text-[#38BDF8] flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Layers size={13} />
                          <span>{p.lotes.length} {p.lotes.length === 1 ? 'Lote' : 'Lotes'}</span>
                        </button>
                      </td>

                      {/* AÇÕES LOGÍSTICAS */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.quantidade_armazem > 0 && (
                            <button
                              type="button"
                              title="Transferir para Gôndola"
                              onClick={() => { setProdutoSelecionado(p); setIsModalTransferirOpen(true); }}
                              className="p-2 rounded-xl bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#4EDEA3] border border-[#10B981]/30 transition-colors cursor-pointer"
                            >
                              <ArrowRightLeft size={16} />
                            </button>
                          )}

                          <button
                            type="button"
                            title="Ver Etiqueta QR Code"
                            onClick={() => { setProdutoSelecionado(p); setIsModalQrOpen(true); }}
                            className="p-2 rounded-xl bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#7BD0FF] border border-[#38BDF8]/30 transition-colors cursor-pointer"
                          >
                            <QrCode size={16} />
                          </button>

                          <button
                            type="button"
                            title="Registrar Perda / Quebra"
                            onClick={() => { setProdutoSelecionado(p); setIsModalPerdaOpen(true); }}
                            className="p-2 rounded-xl bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#FFB95F] border border-[#F59E0B]/30 transition-colors cursor-pointer"
                          >
                            <AlertTriangle size={16} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: TRANSFERÊNCIA ARMAZÉM -> GÔNDOLA (Tactile Velocity)     */}
      {/* ============================================================== */}
      {isModalTransferirOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-[90] p-3 sm:p-4 pt-12 sm:pt-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 my-auto sm:my-0">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] block font-mono">
                  Transferência Interna
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  Repor Gôndola / Balcão
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Item: {produtoSelecionado.nome}
                </p>
              </div>
              <button onClick={() => setIsModalTransferirOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-[#131B2E] rounded-2xl border border-[#334155] text-xs font-mono flex justify-between">
              <span>Disponível no Depósito:</span>
              <span className="font-extrabold text-[#4EDEA3]">{produtoSelecionado.quantidade_armazem} un</span>
            </div>

            <form onSubmit={transferirEstoque} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1 font-mono">
                  Quantidade a Transferir:
                </label>
                <input
                  type="number"
                  min="1"
                  max={produtoSelecionado.quantidade_armazem}
                  required
                  value={quantidadeTransferir}
                  onChange={e => setQuantidadeTransferir(e.target.value)}
                  placeholder="Ex: 12"
                  className="w-full min-h-[48px] px-4 rounded-xl bg-[#131B2E] border border-[#334155] focus:border-[#10B981] text-white font-mono font-bold text-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalTransferirOpen(false)}
                  className="min-h-[46px] rounded-xl bg-[#131B2E] hover:bg-[#1E293B] text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-extrabold text-xs shadow-md cursor-pointer active:scale-95"
                >
                  Confirmar Reposição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRO DE PERDA / QUEBRA (Tactile Velocity)           */}
      {/* ============================================================== */}
      {isModalPerdaOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-[90] p-3 sm:p-4 pt-12 sm:pt-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 my-auto sm:my-0">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F59E0B] block font-mono">
                  Registro de Avaria
                </span>
                <h3 className="text-lg font-extrabold text-white mt-0.5">
                  Registrar Quebra ou Vencimento
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Item: {produtoSelecionado.nome}
                </p>
              </div>
              <button onClick={() => setIsModalPerdaOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={registrarPerda} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                  Motivo da Perda:
                </label>
                <select
                  value={tipoPerda}
                  onChange={e => setTipoPerda(e.target.value as any)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                >
                  <option value="quebra">Quebra de Garrafa / Queda</option>
                  <option value="vencimento">Prazo de Validade Vencido</option>
                  <option value="avaria_transporte">Avaria de Transporte / Lacre Rompido</option>
                  <option value="descarte_operacional">Descarte Autorizado pela Diretoria</option>
                  <option value="outro">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                  Local da Ocorrência:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocalPerda('gondola')}
                    className={`min-h-[40px] rounded-xl text-xs font-bold border transition-all ${
                      localPerda === 'gondola'
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#4EDEA3]'
                        : 'bg-[#131B2E] border-[#334155] text-slate-400'
                    }`}
                  >
                    Gôndola / Balcão
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocalPerda('armazem')}
                    className={`min-h-[40px] rounded-xl text-xs font-bold border transition-all ${
                      localPerda === 'armazem'
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#4EDEA3]'
                        : 'bg-[#131B2E] border-[#334155] text-slate-400'
                    }`}
                  >
                    Armazém / Depósito
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                  Quantidade Perdida:
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantidadePerda}
                  onChange={e => setQuantidadePerda(e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white font-mono font-bold text-sm outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 font-mono">
                  Justificativa Operacional:
                </label>
                <textarea
                  rows={2}
                  value={justificativaPerda}
                  onChange={e => setJustificativaPerda(e.target.value)}
                  placeholder="Descreva o que ocorreu..."
                  className="w-full p-2.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalPerdaOpen(false)}
                  className="min-h-[44px] rounded-xl bg-[#131B2E] text-slate-300 font-bold text-xs"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md"
                >
                  Registrar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ETIQUETA QR CODE DO PRODUTO (Tactile Velocity)          */}
      {/* ============================================================== */}
      {isModalQrOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-[90] p-3 sm:p-4 pt-12 sm:pt-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center my-auto sm:my-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] font-mono">
                Etiqueta de Balcão
              </span>
              <button onClick={() => setIsModalQrOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg">
              <QRCode
                value={produtoSelecionado.qr_code_tag || produtoSelecionado.codigo_barras || `PROD-${produtoSelecionado.id}`}
                size={160}
              />
            </div>

            <div>
              <h4 className="text-base font-extrabold text-white truncate">
                {produtoSelecionado.nome}
              </h4>
              <p className="text-xs text-[#4EDEA3] font-mono font-bold mt-0.5">
                R$ {produtoSelecionado.preco_venda.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                {produtoSelecionado.codigo_barras || `ID: #${produtoSelecionado.id}`}
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="w-full min-h-[44px] px-4 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CADASTRO DE NOVO PRODUTO (Tactile Velocity)             */}
      {/* ============================================================== */}
      {isModalNovoOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-[90] p-3 sm:p-4 pt-10 sm:pt-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto sm:my-0">
            <div className="p-5 border-b border-[#334155] bg-[#131B2E] flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] font-mono block">
                  Catálogo do Bar
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Cadastrar Novo Suprimento
                </h3>
              </div>
              <button onClick={() => setIsModalNovoOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvarNovoProduto} className="p-4 sm:p-5 overflow-y-auto space-y-4 pb-8">
              {/* Seção de Identificação e Auto-Cadastro por Código */}
              <div className="p-3.5 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/40 rounded-2xl space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FDE68A] flex items-center gap-1.5 font-mono">
                    <Sparkles size={14} className="text-purple-400" /> Identificação e Auto-Cadastro por Código
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget('qr_fabrica');
                        setIsCameraScannerOpen(true);
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Camera size={13} />
                      <span>Escanear QR / Barra</span>
                    </button>
                    <button
                      type="button"
                      disabled={buscandoEan}
                      onClick={() => consultarDadosEan()}
                      className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-[#0B1326] rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all disabled:opacity-50"
                    >
                      {buscandoEan ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Buscando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} /> Auto-Preencher
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {mensagemEan && (
                  <div className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
                    mensagemEan.tipo === 'sucesso' 
                      ? 'bg-emerald-500/20 text-[#4EDEA3] border border-emerald-500/40' 
                      : mensagemEan.tipo === 'erro'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-500/20 text-[#FFB95F] border border-amber-500/40'
                  }`}>
                    {mensagemEan.tipo === 'sucesso' && <CheckCircle size={14} className="text-emerald-400 shrink-0" />}
                    <span>{mensagemEan.texto}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 font-mono flex items-center gap-1">
                      <QrCode size={12} className="text-purple-400" /> QR Code da Embalagem (GS1 Digital Link)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={qrCodeTag}
                        onChange={e => {
                          const val = e.target.value;
                          setQrCodeTag(val);
                          const match = val.match(/\/01\/(\d{13,14})/);
                          if (match) {
                            let gtin = match[1];
                            if (gtin.length === 14 && gtin.startsWith('0')) gtin = gtin.substring(1);
                            if (!codigoBarras) setCodigoBarras(gtin);
                            consultarDadosEan(val);
                          }
                        }}
                        placeholder="Cole ou bipe o QR Code..."
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#0B1326] border border-[#334155] text-white text-xs font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTarget('qr_fabrica');
                          setIsCameraScannerOpen(true);
                        }}
                        className="px-2.5 bg-[#1E293B] hover:bg-[#334155] text-purple-400 border border-purple-500/30 rounded-xl text-xs flex items-center justify-center cursor-pointer"
                        title="Ler com a câmera"
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 uppercase mb-1 font-mono flex items-center gap-1">
                      <Barcode size={12} className="text-blue-400" /> Código de Barras (EAN-13)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={codigoBarras}
                        onChange={e => {
                          const val = e.target.value;
                          setCodigoBarras(val);
                          if (/^\d{13,14}$/.test(val.trim())) {
                            consultarDadosEan(val.trim());
                          }
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            consultarDadosEan(codigoBarras);
                          }
                        }}
                        placeholder="Ex: 7894900011517"
                        className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#0B1326] border border-[#334155] text-white text-xs font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTarget('ean');
                          setIsCameraScannerOpen(true);
                        }}
                        className="px-2.5 bg-[#1E293B] hover:bg-[#334155] text-blue-400 border border-blue-500/30 rounded-xl text-xs flex items-center justify-center cursor-pointer"
                        title="Ler com a câmera"
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {fotoUrl && (
                  <div className="flex items-center gap-3 p-2 bg-[#0B1326] rounded-xl border border-purple-500/30">
                    <img src={fotoUrl} alt="Foto Produto" className="w-12 h-12 object-contain rounded-lg bg-white p-0.5" />
                    <div className="text-xs overflow-hidden">
                      <p className="font-bold text-white">Foto Oficial Identificada</p>
                      <p className="text-slate-400 text-[11px] truncate max-w-xs">{fotoUrl}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Nome do Produto</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Chopp Artesanal IPA 500ml"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] focus:border-[#10B981] text-white text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Marca / Fabricante</label>
                  <input
                    type="text"
                    value={marca}
                    onChange={e => setMarca(e.target.value)}
                    placeholder="Ex: Cervejaria Fraterna"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] focus:border-[#10B981] text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Categoria</label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                  >
                    <option value="bebidas">Bebidas</option>
                    <option value="alimentos">Alimentos / Cozinha</option>
                    <option value="tabacos_conveniencia">Tabacaria</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Subcategoria</label>
                  <select
                    value={subcategoria}
                    onChange={e => setSubcategoria(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                  >
                    <option value="alcoolicas">Alcoólicas</option>
                    <option value="nao_alcoolicas">Não Alcoólicas</option>
                    <option value="snacks_petiscos">Snacks & Petiscos</option>
                    <option value="refeicoes">Pratos</option>
                    <option value="sobremesas">Sobremesas</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Tipo</label>
                  <input
                    type="text"
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    placeholder="Ex: cervejas"
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Preço de Custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precoCusto}
                    onChange={e => setPrecoCusto(e.target.value)}
                    placeholder="Ex: 8.50"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] focus:border-[#10B981] text-white text-sm outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Preço de Venda (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precoVenda}
                    onChange={e => setPrecoVenda(e.target.value)}
                    placeholder="Ex: 16.00"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] focus:border-[#10B981] text-white text-sm outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Estoque Inicial Gôndola</label>
                  <input
                    type="number"
                    value={estoqueInicialGondola}
                    onChange={e => setEstoqueInicialGondola(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Estoque Inicial Armazém</label>
                  <input
                    type="number"
                    value={estoqueInicialArmazem}
                    onChange={e => setEstoqueInicialArmazem(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Mínimo Gôndola</label>
                  <input
                    type="number"
                    value={minGondola}
                    onChange={e => setMinGondola(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Mínimo Armazém</label>
                  <input
                    type="number"
                    value={minArmazem}
                    onChange={e => setMinArmazem(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Nº Lote Inicial</label>
                  <input
                    type="text"
                    value={numeroLoteInicial}
                    onChange={e => setNumeroLoteInicial(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Código de Barras (EAN-13)</label>
                  <input
                    type="text"
                    value={codigoBarras}
                    onChange={e => setCodigoBarras(e.target.value)}
                    placeholder="789..."
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1 font-mono">Data de Validade Inicial</label>
                  <input
                    type="date"
                    value={validadeInicial}
                    onChange={e => setValidadeInicial(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#334155] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalNovoOpen(false)}
                  className="min-h-[46px] px-5 rounded-xl bg-[#131B2E] text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-extrabold text-xs shadow-md active:scale-95"
                >
                  Salvar Produto & Iniciar Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: LOTES & CONTROLE FEFO (Tactile Velocity)               */}
      {/* ============================================================== */}
      {isModalLotesOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-[90] p-3 sm:p-4 pt-10 sm:pt-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden my-auto sm:my-0">
            <div className="p-5 border-b border-[#334155] bg-[#131B2E] flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#38BDF8] font-mono block">
                  Rastreabilidade FEFO
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  Lotes do Produto: {produtoSelecionado.nome}
                </h3>
              </div>
              <button onClick={() => setIsModalLotesOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-slate-300 font-mono">Lotes Ativos:</span>
                <button
                  type="button"
                  onClick={() => setIsModalNovoLoteOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#10B981] text-[#0B1326] text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Novo Lote
                </button>
              </div>

              {!produtoSelecionado.lotes?.length ? (
                <p className="text-xs text-slate-500 py-4 text-center">Nenhum lote registrado.</p>
              ) : (
                produtoSelecionado.lotes.map(l => (
                  <div key={l.id} className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#334155] flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-extrabold text-white">{l.numero_lote}</span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          l.status_validade === 'vencido' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          l.status_validade === 'vencendo' ? 'bg-amber-500/20 text-[#FFB95F] border border-amber-500/40' :
                          'bg-[#10B981]/20 text-[#4EDEA3] border border-[#10B981]/40'
                        }`}>
                          Val: {new Date(l.data_validade).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1">
                        Gôndola: <strong className="text-white">{l.quantidade_gondola}</strong> • Armazém: <strong className="text-white">{l.quantidade_armazem}</strong>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-slate-300">
                      {l.dias_para_vencer < 0 ? `${Math.abs(l.dias_para_vencer)}d vencido` : `${l.dias_para_vencer}d restantes`}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO LOTE */}
      {isModalNovoLoteOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-[95] p-3 sm:p-4 pt-12 sm:pt-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#334155] rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 my-auto sm:my-0">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-white">Cadastrar Entrada de Lote</h3>
              <button onClick={() => setIsModalNovoLoteOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={adicionarNovoLote} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono mb-1">Nº do Lote</label>
                <input
                  type="text"
                  required
                  value={novoNumeroLote}
                  onChange={e => setNovoNumeroLote(e.target.value)}
                  placeholder="Ex: LOTE-2026-05"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono mb-1">Data de Validade</label>
                <input
                  type="date"
                  required
                  value={novaValidade}
                  onChange={e => setNovaValidade(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono mb-1">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={novaQtdLote}
                    onChange={e => setNovaQtdLote(e.target.value)}
                    placeholder="Ex: 24"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#131B2E] border border-[#334155] text-white font-mono text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase font-mono mb-1">Destino</label>
                  <select
                    value={novoDestinoLote}
                    onChange={e => setNovoDestinoLote(e.target.value as any)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-[#131B2E] border border-[#334155] text-white text-xs outline-none"
                  >
                    <option value="armazem">Armazém</option>
                    <option value="gondola">Gôndola</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalNovoLoteOpen(false)}
                  className="min-h-[44px] rounded-xl bg-[#131B2E] text-slate-300 font-bold text-xs"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-extrabold text-xs shadow-md"
                >
                  Confirmar Entrada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leitor Câmera Simples */}
      <LeitorQrCameraModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleLeituraCamera}
        titulo="Escanear Código de Barras / QR Code de Fábrica"
      />

    </div>
  );
}
