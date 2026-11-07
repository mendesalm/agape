import React, { useEffect, useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft,
  Plus, 
  Package, 
  AlertTriangle, 
  X, 
  ArrowRightLeft, 
  Layers, 
  QrCode, 
  Printer, 
  Barcode, 
  Camera, 
  Search, 
  Loader2, 
  CheckCircle, 
  LayoutGrid, 
  List as ListIcon, 
  Upload, 
  Boxes, 
  Trash2, 
  DollarSign, 
  ArrowRight,
  Wine,
  Utensils,
  Beer,
  CupSoda,
  ScanLine 
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

// ====================================================================
// FUNÇÃO UTILITÁRIA: COMPRESSÃO DE IMAGEM NO CLIENTE (Canvas WebP 800px)
// ====================================================================
async function comprimirImagemCliente(file: File, maxDim = 800, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const nomeBase = file.name.replace(/\.[^/.]+$/, '');
                const compressedFile = new File([blob], `${nomeBase}.webp`, {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
                return;
              }
              resolve(file);
            },
            'image/webp',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export const GerenteLogistica: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  
  // Preferência de visualização (Grid com Fotos vs Lista Compacta)
  const [modoVisualizacao, setModoVisualizacao] = useState<'grid' | 'lista'>(() => {
    return (localStorage.getItem('@Agape:logistica_modo') as 'grid' | 'lista') || 'grid';
  });

  // Filtros em Pills
  const [filtroPill, setFiltroPill] = useState<'todos' | 'repor_bar' | 'baixo_estoque'>('todos');
  
  // Categorias do Stitch (Bebidas vs Alimentos / Alcoólicas vs Não Alcoólicas)
  const [categoriaPrincipal, setCategoriaPrincipal] = useState<'BEBIDAS' | 'ALIMENTOS'>('BEBIDAS');
  const [subcategoriaBebidas, setSubcategoriaBebidas] = useState<'TODAS' | 'ALCOOLICAS' | 'NAO_ALCOOLICAS'>('TODAS');

  // Item em Gestão (Cascata Drill-down)
  const [produtoEmGestao, setProdutoEmGestao] = useState<Produto | null>(null);

  // Estados de Edição Rápida no Item em Gestão
  const [editandoPreco, setEditandoPreco] = useState(false);
  const [novoPrecoVenda, setNovoPrecoVenda] = useState('');
  const [novoPrecoCusto, setNovoPrecoCusto] = useState('');
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // Ações de Transferência & Perda
  const [qtdTransferir, setQtdTransferir] = useState<string>('6');
  const [isModalTransferir, setIsModalTransferir] = useState(false);
  const [direcaoTransferencia, setDirecaoTransferencia] = useState<'para_gondola' | 'para_armazem'>('para_gondola');
  const [isModalPerda, setIsModalPerda] = useState(false);
  const [qtdPerda, setQtdPerda] = useState('1');
  const [motivoPerda, setMotivoPerda] = useState('Quebra / Avaria');
  const [ambientePerda, setAmbientePerda] = useState<'gondola' | 'armazem'>('gondola');
  const [isModalNovoLote, setIsModalNovoLote] = useState(false);
  const [novoLoteNumero, setNovoLoteNumero] = useState('LOTE-NOVO');
  const [novoLoteValidade, setNovoLoteValidade] = useState('');
  const [novoLoteQtd, setNovoLoteQtd] = useState('12');
  const [novoLoteCusto, setNovoLoteCusto] = useState('');
  const [isModalQr, setIsModalQr] = useState(false);

  // Cascata de Novo Produto (Passo 1: Escolha / Passo 2: Formulário)
  const [isModalNovoAberto, setIsModalNovoAberto] = useState(false);
  const [passoNovoProduto, setPassoNovoProduto] = useState<'escolha' | 'formulario'>('escolha');
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'busca' | 'cadastro_auto'>('busca');

  // Form Novo Produto
  const [novoNome, setNovoNome] = useState('');
  const [novoCodigoBarras, setNovoCodigoBarras] = useState('');
  const [novaFotoUrl, setNovaFotoUrl] = useState('');
  const [novoPrecoVendaForm, setNovoPrecoVendaForm] = useState('');
  const [novoPrecoCustoForm, setNovoPrecoCustoForm] = useState('');
  const [novoEstoqueGondola, setNovoEstoqueGondola] = useState('0');
  const [novoEstoqueArmazem, setNovoEstoqueArmazem] = useState('12');
  const [novaCategoria, setNovaCategoria] = useState('bebidas');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [buscandoEan, setBuscandoEan] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/produtos/');
      setProdutos(res.data || []);
      // Atualiza o produto em gestão se estiver aberto
      if (produtoEmGestao) {
        const atualizado = (res.data || []).find((p: Produto) => p.id === produtoEmGestao.id);
        if (atualizado) setProdutoEmGestao(atualizado);
      }
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrocarModoVisualizacao = (modo: 'grid' | 'lista') => {
    setModoVisualizacao(modo);
    localStorage.setItem('@Agape:logistica_modo', modo);
  };

  // Upload e Auto-compressão de Foto
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>, produtoId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setEnviandoFoto(true);
      const arquivoComprimido = await comprimirImagemCliente(file, 800, 0.8);
      
      const formData = new FormData();
      formData.append('file', arquivoComprimido);

      const resUpload = await api.post('/uploads/produtos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const novaUrl = resUpload.data.url;
      if (novaUrl) {
        await api.put(`/produtos/${produtoId}`, { foto_url: novaUrl });
        await carregarProdutos();
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao fazer upload da imagem.');
    } finally {
      setEnviandoFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Salvar Edição de Preços
  const handleSalvarPrecos = async () => {
    if (!produtoEmGestao) return;
    const pVenda = parseFloat(novoPrecoVenda);
    const pCusto = parseFloat(novoPrecoCusto);
    if (isNaN(pVenda) || pVenda <= 0) {
      alert('Informe um preço de venda válido.');
      return;
    }

    try {
      await api.put(`/produtos/${produtoEmGestao.id}`, {
        preco_venda: pVenda,
        preco_custo: isNaN(pCusto) ? produtoEmGestao.preco_custo : pCusto
      });
      setEditandoPreco(false);
      await carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar preços.');
    }
  };

  // Transferência entre Gôndola e Armazém
  const handleTransferirEstoque = async () => {
    if (!produtoEmGestao) return;
    const qtd = parseInt(qtdTransferir);
    if (isNaN(qtd) || qtd <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    try {
      if (direcaoTransferencia === 'para_gondola') {
        await api.post(`/produtos/${produtoEmGestao.id}/transferir-gondola`, {
          quantidade: qtd,
          motivo: 'Reposição no Bar'
        });
      } else {
        await api.post(`/produtos/${produtoEmGestao.id}/transferir-armazem`, {
          quantidade: qtd,
          motivo: 'Retorno ao Almoxarifado'
        });
      }
      setIsModalTransferir(false);
      await carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Falha ao transferir estoque.');
    }
  };

  // Registro de Perda
  const handleRegistrarPerda = async () => {
    if (!produtoEmGestao) return;
    const qtd = parseInt(qtdPerda);
    if (isNaN(qtd) || qtd <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    try {
      await api.post(`/produtos/${produtoEmGestao.id}/perdas`, {
        quantidade: qtd,
        ambiente: ambientePerda,
        motivo: motivoPerda
      });
      setIsModalPerda(false);
      await carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar perda.');
    }
  };

  // Criação de Novo Lote
  const handleCriarNovoLote = async () => {
    if (!produtoEmGestao) return;
    const qtd = parseInt(novoLoteQtd);
    const custo = parseFloat(novoLoteCusto || String(produtoEmGestao.preco_custo));
    if (isNaN(qtd) || qtd <= 0) {
      alert('Informe a quantidade de entrada do lote.');
      return;
    }
    if (!novoLoteValidade) {
      alert('Informe a data de validade do lote.');
      return;
    }

    try {
      await api.post(`/produtos/${produtoEmGestao.id}/lotes`, {
        numero_lote: novoLoteNumero || `LOTE-${Date.now().toString().slice(-4)}`,
        data_validade: novoLoteValidade,
        quantidade_armazem: qtd,
        quantidade_gondola: 0,
        preco_custo_unitario: custo
      });
      setIsModalNovoLote(false);
      setNovoLoteQtd('12');
      setNovoLoteValidade('');
      await carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar novo lote.');
    }
  };

  // Cadastro de Novo Produto
  const handleSalvarNovoProduto = async (e: FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    const pVenda = parseFloat(novoPrecoVendaForm);
    const pCusto = parseFloat(novoPrecoCustoForm) || 0;
    if (isNaN(pVenda) || pVenda <= 0) {
      alert('Informe um preço de venda válido.');
      return;
    }

    try {
      setSalvandoNovo(true);
      await api.post('/produtos/', {
        nome: novoNome.trim(),
        codigo_barras: novoCodigoBarras.trim() || undefined,
        foto_url: novaFotoUrl.trim() || undefined,
        categoria: novaCategoria,
        preco_venda: pVenda,
        preco_custo: pCusto,
        quantidade_gondola: parseInt(novoEstoqueGondola) || 0,
        quantidade_armazem: parseInt(novoEstoqueArmazem) || 0
      });
      setIsModalNovoAberto(false);
      setPassoNovoProduto('escolha');
      setNovoNome('');
      setNovoCodigoBarras('');
      setNovaFotoUrl('');
      setNovoPrecoVendaForm('');
      setNovoPrecoCustoForm('');
      await carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar produto.');
    } finally {
      setSalvandoNovo(false);
    }
  };

  // Auto-busca GS1 / Open Food Facts por código de barras
  const handleConsultarEan = async (codigo: string) => {
    if (!codigo || codigo.length < 7) return;
    try {
      setBuscandoEan(true);
      const res = await api.get(`/produtos/consulta-ean/${codigo.trim()}`);
      if (res.data?.encontrado && res.data.dados) {
        const d = res.data.dados;
        if (d.nome && !novoNome) setNovoNome(d.nome);
        if (d.foto_url && !novaFotoUrl) setNovaFotoUrl(d.foto_url);
        if (d.categoria && !novaCategoria) setNovaCategoria(d.categoria);
      }
    } catch (err) {
      console.warn('EAN não encontrado na base GS1:', err);
    } finally {
      setBuscandoEan(false);
    }
  };

  // Filtragem dos Produtos
  const produtosFiltrados = produtos.filter((p) => {
    // 1. Categoria Principal (Bebidas vs Alimentos)
    const catUpper = (p.categoria || '').toUpperCase();
    if (categoriaPrincipal && catUpper !== categoriaPrincipal) {
      return false;
    }

    // 2. Subcategoria (Alcoólicas vs Não Alcoólicas) quando em Bebidas
    if (categoriaPrincipal === 'BEBIDAS' && subcategoriaBebidas !== 'TODAS') {
      const subUpper = (p.subcategoria || '').toUpperCase();
      if (subUpper !== subcategoriaBebidas) {
        return false;
      }
    }

    const buscaMatch =
      p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(termoBusca)) ||
      (p.marca && p.marca.toLowerCase().includes(termoBusca.toLowerCase()));
    
    if (!buscaMatch) return false;

    if (filtroPill === 'repor_bar') {
      return p.quantidade_gondola <= (p.estoque_minimo_gondola || 5);
    }
    if (filtroPill === 'baixo_estoque') {
      return p.quantidade_estoque <= (p.estoque_minimo_gondola || 5);
    }
    return true;
  });

  const qtdBebidas = produtos.filter(p => (p.categoria || '').toUpperCase() === 'BEBIDAS').length;
  const qtdAlimentos = produtos.filter(p => (p.categoria || '').toUpperCase() === 'ALIMENTOS').length;
  const qtdAlcoolicas = produtos.filter(p => (p.categoria || '').toUpperCase() === 'BEBIDAS' && (p.subcategoria || '').toUpperCase() === 'ALCOOLICAS').length;
  const qtdNaoAlcoolicas = produtos.filter(p => (p.categoria || '').toUpperCase() === 'BEBIDAS' && (p.subcategoria || '').toUpperCase() === 'NAO_ALCOOLICAS').length;

  // Métricas do Dashboard Logístico
  const totalItens = produtos.length;
  const reposicoesPendentes = produtos.filter((p) => p.quantidade_gondola <= (p.estoque_minimo_gondola || 5)).length;
  const valorEstoqueCusto = produtos.reduce((acc, p) => acc + p.quantidade_estoque * p.preco_custo, 0);
  const valorEstoqueVenda = produtos.reduce((acc, p) => acc + p.quantidade_estoque * p.preco_venda, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100 select-none animate-fadeIn p-2 sm:p-4">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (produtoEmGestao) handleUploadFoto(e, produtoEmGestao.id);
        }}
      />

      {/* ============================================================== */}
      {/* SE UM PRODUTO ESTIVER EM GESTÃO: MOSTRA A VIEW EM CASCATA      */}
      {/* ============================================================== */}
      {loading ? (
        <div className="p-12 text-center text-[#38BDF8] font-mono animate-pulse space-y-3">
          <div className="w-10 h-10 border-2 border-[#38BDF8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Carregando catálogo logístico do Bar...</p>
        </div>
      ) : produtoEmGestao ? (
        <div className="space-y-6 animate-fadeIn">
          {/* TOPO DA CASCATA: VOLTAR */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <button
              onClick={() => setProdutoEmGestao(null)}
              className="p-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold font-mono"
            >
              <ArrowLeft size={16} />
              <span>← Voltar ao Estoque Geral</span>
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Logística</span>
              <span>/</span>
              <span className="text-[#38BDF8] font-bold truncate max-w-[200px]">
                {produtoEmGestao.nome}
              </span>
            </div>
          </div>

          {/* CARD DE GESTÃO DO ITEM */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUNA 1: FOTO & IDENTIFICAÇÃO */}
            <div className="p-6 rounded-3xl bg-[#0B1326] border border-[#38BDF8]/40 space-y-4 shadow-xl flex flex-col items-center text-center">
              <div className="relative w-48 h-48 rounded-2xl bg-[#131B2E] border border-slate-700 overflow-hidden flex items-center justify-center shadow-lg group">
                {produtoEmGestao.foto_url ? (
                  <img
                    src={produtoEmGestao.foto_url}
                    alt={produtoEmGestao.nome}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-16 h-16 text-slate-600" />
                )}

                {/* Overlay de Upload Rápido com Auto-compressão */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-mono text-xs font-bold"
                >
                  {enviandoFoto ? (
                    <Loader2 className="w-6 h-6 animate-spin text-[#38BDF8]" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 text-[#38BDF8]" />
                      <span>{produtoEmGestao.foto_url ? 'Alterar Foto' : 'Enviar Foto'}</span>
                      <span className="text-[10px] text-slate-400">(Auto-comprimida WebP)</span>
                    </>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#7BD0FF] px-2.5 py-0.5 rounded-full bg-[#38BDF8]/15 border border-[#38BDF8]/30">
                  {produtoEmGestao.categoria.toUpperCase()}
                </span>
                <h2 className="text-xl font-bold text-white mt-2">
                  {produtoEmGestao.nome}
                </h2>
                {produtoEmGestao.codigo_barras && (
                  <span className="text-xs text-slate-400 font-mono flex items-center justify-center gap-1 mt-1">
                    <Barcode size={14} /> {produtoEmGestao.codigo_barras}
                  </span>
                )}
              </div>

              <div className="w-full pt-3 border-t border-slate-800 flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-xs font-mono font-bold text-[#7BD0FF] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Subir Foto</span>
                </button>
                <button
                  onClick={() => setIsModalQr(true)}
                  className="p-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Etiqueta QR Code"
                >
                  <QrCode size={16} />
                </button>
              </div>
            </div>

            {/* COLUNA 2: PREÇOS & DISTRIBUIÇÃO */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* BLOCO DE PREÇOS E MARGEM */}
              <div className="p-6 rounded-3xl bg-[#0B1326] border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <DollarSign size={16} className="text-[#10B981]" />
                    Precificação & Rentabilidade
                  </h3>
                  <button
                    onClick={() => {
                      setEditandoPreco(!editandoPreco);
                      setNovoPrecoVenda(String(produtoEmGestao.preco_venda));
                      setNovoPrecoCusto(String(produtoEmGestao.preco_custo));
                    }}
                    className="text-xs font-mono font-bold text-[#38BDF8] hover:underline cursor-pointer"
                  >
                    {editandoPreco ? 'Cancelar' : 'Editar Preços'}
                  </button>
                </div>

                {editandoPreco ? (
                  <div className="p-4 rounded-2xl bg-[#131B2E] border border-[#38BDF8]/40 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
                          Preço de Venda (R$):
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          value={novoPrecoVenda}
                          onChange={(e) => setNovoPrecoVenda(e.target.value)}
                          className="w-full bg-[#070F1E] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#10B981]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1">
                          Preço de Custo (R$):
                        </label>
                        <input
                          type="number"
                          step="0.50"
                          value={novoPrecoCusto}
                          onChange={(e) => setNovoPrecoCusto(e.target.value)}
                          className="w-full bg-[#070F1E] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#10B981]"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleSalvarPrecos}
                      className="w-full py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-bold text-xs font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Salvar Alteração de Preços
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 block">Preço de Venda</span>
                      <p className="text-xl font-mono font-black text-[#4EDEA3]">
                        R$ {produtoEmGestao.preco_venda.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 block">Custo Último Lote</span>
                      <p className="text-xl font-mono font-black text-slate-200">
                        R$ {produtoEmGestao.preco_custo.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[#131B2E] border border-slate-800 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 block">Margem Bruta</span>
                      <p className="text-xl font-mono font-black text-[#7BD0FF]">
                        {produtoEmGestao.preco_custo > 0 
                          ? `${(((produtoEmGestao.preco_venda - produtoEmGestao.preco_custo) / produtoEmGestao.preco_custo) * 100).toFixed(0)}%` 
                          : '100%'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOCO DE DISTRIBUIÇÃO E TRANSFERÊNCIA */}
              <div className="p-6 rounded-3xl bg-[#0B1326] border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Boxes size={16} className="text-[#38BDF8]" />
                    Distribuição dos Estoques Físicos
                  </h3>
                  <button
                    onClick={() => {
                      setDirecaoTransferencia('para_gondola');
                      setIsModalTransferir(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#38BDF8]/20 border border-[#38BDF8] text-[#7BD0FF] text-xs font-mono font-bold hover:bg-[#38BDF8] hover:text-[#0B1326] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRightLeft size={13} />
                    <span>Transferir</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* GÔNDOLA / BAR */}
                  <div className={`p-4 rounded-2xl border ${
                    produtoEmGestao.quantidade_gondola <= 3 
                      ? 'bg-rose-950/20 border-rose-500/50' 
                      : 'bg-[#131B2E] border-slate-800'
                  } space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Gôndola (Bar)
                      </span>
                      {produtoEmGestao.quantidade_gondola <= 3 && (
                        <span className="text-[10px] font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-full">
                          Repor Urgente!
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-mono font-black text-white">
                      {produtoEmGestao.quantidade_gondola} <span className="text-sm font-normal text-slate-400">un.</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Disponível para venda direta aos irmãos
                    </span>
                  </div>

                  {/* ALMOXARIFADO / DEPÓSITO */}
                  <div className="p-4 rounded-2xl bg-[#131B2E] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Almoxarifado (Depósito)
                      </span>
                    </div>
                    <p className="text-3xl font-mono font-black text-slate-200">
                      {produtoEmGestao.quantidade_armazem} <span className="text-sm font-normal text-slate-400">un.</span>
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Reserva de segurança para reposição
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs text-slate-400 font-mono">
                  <span>Estoque Total Geral: <strong className="text-white">{produtoEmGestao.quantidade_estoque} un.</strong></span>
                  <button
                    onClick={() => setIsModalPerda(true)}
                    className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Registrar Quebra / Perda</span>
                  </button>
                </div>
              </div>

              {/* BLOCO DE LOTES E FEFO */}
              <div className="p-6 rounded-3xl bg-[#0B1326] border border-slate-800 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                      <Layers size={16} className="text-[#DDB96B]" />
                      Lotes Adquiridos & FEFO (Primeiro a Vencer)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Controle de custos diferentes por lote de compra.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setNovoLoteCusto(String(produtoEmGestao.preco_custo));
                      setIsModalNovoLote(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#DDB96B]/20 border border-[#DDB96B] text-[#FDE68A] text-xs font-mono font-bold hover:bg-[#DDB96B] hover:text-[#0B1326] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Entrada de Lote</span>
                  </button>
                </div>

                {/* Lista de Lotes */}
                <div className="space-y-2">
                  {(produtoEmGestao.lotes || []).length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#131B2E] text-slate-400 text-xs font-mono text-center">
                      Nenhum lote específico registrado. O produto está operando no estoque base.
                    </div>
                  ) : (
                    (produtoEmGestao.lotes || []).map((lote) => (
                      <div
                        key={lote.id}
                        className="p-3 rounded-xl bg-[#131B2E] border border-slate-800 flex items-center justify-between text-xs font-mono"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">
                            {lote.numero_lote}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Validade: <strong className={lote.status_validade === 'vencendo' ? 'text-amber-400' : 'text-slate-300'}>{lote.data_validade}</strong> ({lote.dias_para_vencer} dias)
                          </span>
                        </div>

                        <div className="text-right space-y-0.5">
                          <span className="font-bold text-[#4EDEA3] block">
                            Custo: R$ {lote.preco_custo_unitario.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Gôndola: {lote.quantidade_gondola} | Depósito: {lote.quantidade_armazem}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* LISTAGEM PRINCIPAL: DASHBOARD LOGÍSTICO + GRID / LISTA         */
        /* ============================================================== */
        <div className="space-y-6">

          {/* BARRA SUPERIOR BIDIRECIONAL & BREADCRUMBS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/app/gerencia')}
                className="p-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold font-mono"
              >
                <ArrowLeft size={16} />
                <span>Voltar para Gerência</span>
              </button>
              
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <span>Hub</span>
                <span>/</span>
                <span>Gerência</span>
                <span>/</span>
                <span className="text-[#38BDF8] font-bold">Logística & Estoque</span>
              </div>
            </div>

            <button
              onClick={() => {
                setPassoNovoProduto('escolha');
                setIsModalNovoAberto(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-extrabold text-xs font-mono uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>Novo Produto</span>
            </button>
          </div>

          {/* DASHBOARD LOGÍSTICO: KPIS ENXUTOS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0B1326] border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package size={14} className="text-[#38BDF8]" /> Itens Cadastrados
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                {totalItens}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Produtos ativos</span>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${
              reposicoesPendentes > 0 ? 'bg-rose-950/20 border-rose-500/40' : 'bg-[#0B1326] border-slate-800'
            }`}>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Reposições no Bar
              </span>
              <p className="text-xl sm:text-2xl font-black text-rose-300 font-mono">
                {reposicoesPendentes}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Gôndola crítica ou zerada</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1326] border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#4EDEA3] flex items-center gap-1.5">
                <DollarSign size={14} /> Estoque a Preço de Venda
              </span>
              <p className="text-xl sm:text-2xl font-black text-white font-mono">
                R$ {valorEstoqueVenda.toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">Custo: R$ {valorEstoqueCusto.toFixed(2)}</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0B1326] border border-slate-800 space-y-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FDE68A] flex items-center gap-1.5">
                <Boxes size={14} /> Modo de Exibição
              </span>
              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => handleTrocarModoVisualizacao('grid')}
                  className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    modoVisualizacao === 'grid' 
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#7BD0FF]' 
                      : 'bg-[#131B2E] border-slate-700 text-slate-400'
                  }`}
                >
                  <LayoutGrid size={13} />
                  <span>Grid</span>
                </button>
                <button
                  onClick={() => handleTrocarModoVisualizacao('lista')}
                  className={`flex-1 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    modoVisualizacao === 'lista' 
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#7BD0FF]' 
                      : 'bg-[#131B2E] border-slate-700 text-slate-400'
                  }`}
                >
                  <ListIcon size={13} />
                  <span>Lista</span>
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SELETOR PRINCIPAL DE CATEGORIAS (PADRÃO STITCH: BEBIDAS X ALIMENTOS) */}
          {/* ============================================================== */}
          <nav className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 gap-1 text-xs font-semibold">
            <button 
              onClick={() => {
                setCategoriaPrincipal('BEBIDAS');
                setSubcategoriaBebidas('TODAS');
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                categoriaPrincipal === 'BEBIDAS'
                  ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wine size={16} />
              <span>Bebidas</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-[10px] font-bold text-amber-300">
                {qtdBebidas}
              </span>
            </button>

            <button 
              onClick={() => {
                setCategoriaPrincipal('ALIMENTOS');
                setSubcategoriaBebidas('TODAS');
              }}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                categoriaPrincipal === 'ALIMENTOS'
                  ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/20 text-amber-300 border border-amber-400/40 shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Utensils size={16} />
              <span>Alimentos</span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-semibold text-slate-300">
                {qtdAlimentos}
              </span>
            </button>
          </nav>

          {/* SUB-CATEGORIAS DE BEBIDAS (STITCH: ALCOÓLICAS X NÃO ALCOÓLICAS) */}
          {categoriaPrincipal === 'BEBIDAS' && (
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => setSubcategoriaBebidas(subcategoriaBebidas === 'ALCOOLICAS' ? 'TODAS' : 'ALCOOLICAS')}
                className={`group rounded-2xl p-3 backdrop-blur-xl border text-left transition-all active:scale-95 ${
                  subcategoriaBebidas === 'ALCOOLICAS'
                    ? 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-amber-400/50 shadow-xl'
                    : 'bg-white/[0.03] border-white/10 hover:border-amber-400/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
                    <Beer size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                    {qtdAlcoolicas} itens
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 block">
                    Alcoólicas
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Cervejas, Chopp e Doses
                  </span>
                </div>
              </button>

              <button 
                onClick={() => setSubcategoriaBebidas(subcategoriaBebidas === 'NAO_ALCOOLICAS' ? 'TODAS' : 'NAO_ALCOOLICAS')}
                className={`group rounded-2xl p-3 backdrop-blur-xl border text-left transition-all active:scale-95 ${
                  subcategoriaBebidas === 'NAO_ALCOOLICAS'
                    ? 'bg-gradient-to-b from-white/[0.08] to-white/[0.02] border-cyan-400/50 shadow-xl'
                    : 'bg-white/[0.03] border-white/10 hover:border-cyan-400/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-cyan-300">
                    <CupSoda size={18} />
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full">
                    {qtdNaoAlcoolicas} itens
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 block">
                    Não Alcoólicas
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Refrigerantes, Águas e Sucos
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* BARRA DE FILTROS & BUSCA */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Campo de Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar produto por nome, marca ou código de barras..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B1326] border border-slate-800 text-white font-mono text-xs outline-none focus:border-[#38BDF8]"
              />
              {termoBusca && (
                <button
                  onClick={() => setTermoBusca('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Pills de Filtragem Rápida */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFiltroPill('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                  filtroPill === 'todos'
                    ? 'bg-[#131B2E] border-slate-500 text-white shadow-sm'
                    : 'bg-[#0B1326] border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({produtos.length})
              </button>

              <button
                onClick={() => setFiltroPill('repor_bar')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                  filtroPill === 'repor_bar'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-sm'
                    : 'bg-[#0B1326] border-slate-800 text-slate-400 hover:text-rose-300'
                }`}
              >
                🔴 Repor no Bar ({reposicoesPendentes})
              </button>

              <button
                onClick={() => setFiltroPill('baixo_estoque')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer shrink-0 ${
                  filtroPill === 'baixo_estoque'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-[#0B1326] border-slate-800 text-slate-400 hover:text-amber-300'
                }`}
              >
                🟡 Baixo Estoque
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* APRESENTAÇÃO: GRID COM FOTOS (2 COLUNAS MOBILE)                */}
          {/* ============================================================== */}
          {modoVisualizacao === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {produtosFiltrados.map((prod) => {
                const isCritico = prod.quantidade_gondola <= 2;
                const isBaixo = prod.quantidade_gondola <= (prod.estoque_minimo_gondola || 5);

                return (
                  <div
                    key={prod.id}
                    onClick={() => setProdutoEmGestao(prod)}
                    className="group relative p-3 rounded-2xl bg-[#0B1326] hover:bg-[#131B2E] border border-slate-800 hover:border-[#38BDF8]/60 transition-all cursor-pointer flex flex-col justify-between shadow-lg overflow-hidden"
                  >
                    {/* Badge Superior de Estoque */}
                    <div className="absolute top-2 right-2 z-10">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold border ${
                        isCritico
                          ? 'bg-rose-950/90 border-rose-500 text-rose-300'
                          : isBaixo
                            ? 'bg-amber-950/90 border-amber-500 text-amber-300'
                            : 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                      }`}>
                        {prod.quantidade_gondola} no Bar
                      </span>
                    </div>

                    {/* Foto com proporção 1:1 */}
                    <div className="w-full aspect-square rounded-xl bg-[#131B2E] border border-slate-800 overflow-hidden flex items-center justify-center relative mb-2.5">
                      {prod.foto_url ? (
                        <img
                          src={prod.foto_url}
                          alt={prod.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-600 gap-1">
                          <Package size={28} />
                          <span className="text-[9px] font-mono text-slate-500">Sem Foto</span>
                        </div>
                      )}
                    </div>

                    {/* Dados Básicos */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block truncate">
                        {prod.categoria}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-tight">
                        {prod.nome}
                      </h4>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-black font-mono text-[#4EDEA3]">
                          R$ {prod.preco_venda.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Tot: {prod.quantidade_estoque}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ============================================================== */
            /* APRESENTAÇÃO: LISTA COMPACTA TÁTIL                            */
            /* ============================================================== */
            <div className="space-y-2">
              {produtosFiltrados.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => setProdutoEmGestao(prod)}
                  className="p-3 rounded-2xl bg-[#0B1326] hover:bg-[#131B2E] border border-slate-800 hover:border-[#38BDF8]/60 transition-all cursor-pointer flex items-center justify-between text-xs font-mono shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#131B2E] border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                      {prod.foto_url ? (
                        <img src={prod.foto_url} alt={prod.nome} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={18} className="text-slate-600" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">{prod.nome}</span>
                      <span className="text-slate-400 text-[11px]">
                        R$ {prod.preco_venda.toFixed(2)} un. | Categoria: {prod.categoria}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`font-bold block ${prod.quantidade_gondola <= 2 ? 'text-rose-400' : 'text-[#4EDEA3]'}`}>
                        {prod.quantidade_gondola} no Bar
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {prod.quantidade_armazem} no Almox.
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* COMPACT GLASS BOTTOM ACTION BAR (PADRÃO STITCH) */}
          <footer className="pt-2 pb-1">
            <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2.5 flex items-center justify-between shadow-xl">
              <button 
                onClick={() => setFiltroPill(filtroPill === 'repor_bar' ? 'todos' : 'repor_bar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
              >
                <ArrowRightLeft size={16} />
                Repor Gôndola ({reposicoesPendentes})
              </button>

              <div className="h-4 w-px bg-white/10" />

              <button 
                onClick={() => {
                  setPassoNovoProduto('escolha');
                  setIsModalNovoAberto(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 transition text-xs font-bold shadow-sm"
              >
                <ScanLine size={16} />
                Escanear Código
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: TRANSFERÊNCIA DE ESTOQUE                              */}
      {/* ============================================================== */}
      {isModalTransferir && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#38BDF8] rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7BD0FF] flex items-center gap-1.5">
                <ArrowRightLeft size={16} /> Movimentação de Estoque
              </span>
              <button onClick={() => setIsModalTransferir(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Produto: <strong className="text-white">{produtoEmGestao.nome}</strong>
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                Direção do Movimento:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setDirecaoTransferencia('para_gondola')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    direcaoTransferencia === 'para_gondola'
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#7BD0FF] font-bold'
                      : 'bg-[#131B2E] border-slate-700 text-slate-400'
                  }`}
                >
                  Depósito ➔ Bar
                </button>
                <button
                  type="button"
                  onClick={() => setDirecaoTransferencia('para_armazem')}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    direcaoTransferencia === 'para_armazem'
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#7BD0FF] font-bold'
                      : 'bg-[#131B2E] border-slate-700 text-slate-400'
                  }`}
                >
                  Bar ➔ Depósito
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block font-bold mb-1">
                Quantidade a Transferir:
              </label>
              <input
                type="number"
                min="1"
                value={qtdTransferir}
                onChange={(e) => setQtdTransferir(e.target.value)}
                className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-[#38BDF8]"
              />
            </div>

            <button
              onClick={handleTransferirEstoque}
              className="w-full py-3 rounded-xl bg-[#38BDF8] hover:bg-[#0284C7] text-[#0B1326] font-bold text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Confirmar Transferência
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: REGISTRO DE PERDA / AVARIA                            */}
      {/* ============================================================== */}
      {isModalPerda && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#0B1326] border border-rose-500 rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <Trash2 size={16} /> Registrar Perda / Avaria
              </span>
              <button onClick={() => setIsModalPerda(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Produto: <strong className="text-white">{produtoEmGestao.nome}</strong>
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-slate-400 block font-bold">
                Local da Perda:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setAmbientePerda('gondola')}
                  className={`p-2 rounded-xl border text-center ${
                    ambientePerda === 'gondola' ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold' : 'bg-[#131B2E] border-slate-700 text-slate-400'
                  }`}
                >
                  Na Gôndola (Bar)
                </button>
                <button
                  type="button"
                  onClick={() => setAmbientePerda('armazem')}
                  className={`p-2 rounded-xl border text-center ${
                    ambientePerda === 'armazem' ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold' : 'bg-[#131B2E] border-slate-700 text-slate-400'
                  }`}
                >
                  No Almoxarifado
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block font-bold mb-1">
                Quantidade Perdida:
              </label>
              <input
                type="number"
                min="1"
                value={qtdPerda}
                onChange={(e) => setQtdPerda(e.target.value)}
                className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-slate-400 block font-bold mb-1">
                Motivo:
              </label>
              <select
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-rose-500"
              >
                <option value="Quebra / Avaria Física">Quebra / Avaria Física</option>
                <option value="Vencimento de Validade">Vencimento de Validade</option>
                <option value="Consumo Interno Não Lançado">Consumo Interno</option>
                <option value="Diferença de Contagem">Diferença de Contagem</option>
              </select>
            </div>

            <button
              onClick={handleRegistrarPerda}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Baixar do Estoque por Perda
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: ENTRADA DE NOVO LOTE                                  */}
      {/* ============================================================== */}
      {isModalNovoLote && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#DDB96B] rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FDE68A] flex items-center gap-1.5">
                <Layers size={16} /> Entrada de Novo Lote
              </span>
              <button onClick={() => setIsModalNovoLote(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                  Identificador / Número do Lote:
                </label>
                <input
                  type="text"
                  value={novoLoteNumero}
                  onChange={(e) => setNovoLoteNumero(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#DDB96B]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                  Data de Validade:
                </label>
                <input
                  type="date"
                  value={novoLoteValidade}
                  onChange={(e) => setNovoLoteValidade(e.target.value)}
                  className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#DDB96B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                    Quantidade Adquirida:
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={novoLoteQtd}
                    onChange={(e) => setNovoLoteQtd(e.target.value)}
                    className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#DDB96B]"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                    Custo Unitário (R$):
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    value={novoLoteCusto}
                    onChange={(e) => setNovoLoteCusto(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#DDB96B]"
                  />
                </div>
              </div>

              {/* Indicador de Tendência do Custo */}
              {parseFloat(novoLoteCusto) > produtoEmGestao.preco_custo && (
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/50 text-[11px] text-amber-300">
                  ⚠️ <strong>Atenção:</strong> O custo deste lote (R$ {parseFloat(novoLoteCusto).toFixed(2)}) é maior que o custo anterior (R$ {produtoEmGestao.preco_custo.toFixed(2)}). Avalie reajustar o preço de venda.
                </div>
              )}
            </div>

            <button
              onClick={handleCriarNovoLote}
              className="w-full py-3 rounded-xl bg-[#DDB96B] hover:bg-[#C5A059] text-[#0B1326] font-bold text-xs font-mono uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Registrar Entrada de Lote
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: IMPRESSÃO DE QR CODE DO PRODUTO                       */}
      {/* ============================================================== */}
      {isModalQr && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#38BDF8] rounded-3xl p-6 w-full max-w-sm space-y-4 text-white text-center shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#7BD0FF] flex items-center gap-1.5">
                <QrCode size={16} /> Etiqueta do Produto
              </span>
              <button onClick={() => setIsModalQr(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-inner">
              <QRCode
                value={produtoEmGestao.qr_code_tag || produtoEmGestao.codigo_barras || `AGAPE:PROD:${produtoEmGestao.id}`}
                size={160}
              />
            </div>

            <p className="text-xs font-bold text-white font-mono">
              {produtoEmGestao.nome}
            </p>
            <span className="text-[11px] text-slate-400 font-mono block">
              Preço: R$ {produtoEmGestao.preco_venda.toFixed(2)}
            </span>

            <button
              onClick={() => window.print()}
              className="w-full py-2.5 rounded-xl bg-[#131B2E] hover:bg-[#1E293B] border border-slate-700 text-xs font-mono font-bold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>Imprimir Etiqueta</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CASCATA DE NOVO PRODUTO (Passo 1 ou Passo 2)          */}
      {/* ============================================================== */}
      {isModalNovoAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-[#0B1326] border border-[#10B981]/50 rounded-3xl p-6 w-full max-w-md space-y-5 text-white shadow-2xl">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {passoNovoProduto === 'formulario' && (
                  <button
                    onClick={() => setPassoNovoProduto('escolha')}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4EDEA3] flex items-center gap-1.5">
                  <Plus size={16} /> Cadastro de Produto
                </span>
              </div>
              <button onClick={() => setIsModalNovoAberto(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {/* PASSO 1: ESCOLHA DO MÉTODO */}
            {passoNovoProduto === 'escolha' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-300">
                  Como você deseja incluir este produto no cardápio do bar?
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setCameraTarget('cadastro_auto');
                      setIsCameraScannerOpen(true);
                    }}
                    className="p-4 rounded-2xl bg-[#131B2E] hover:bg-[#1A2642] border border-[#38BDF8]/40 hover:border-[#38BDF8] text-left transition-all cursor-pointer flex items-center gap-3.5 group shadow-md"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#38BDF8]/20 border border-[#38BDF8]/40 flex items-center justify-center text-[#7BD0FF] group-hover:scale-105 transition-transform shrink-0">
                      <Camera size={22} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Escanear Código / QR com a Câmera</span>
                      <span className="text-[11px] text-slate-400">Preenchimento automático via base nacional GS1</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPassoNovoProduto('formulario')}
                    className="p-4 rounded-2xl bg-[#131B2E] hover:bg-[#1A2642] border border-slate-700 hover:border-slate-500 text-left transition-all cursor-pointer flex items-center gap-3.5 group shadow-md"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform shrink-0">
                      <Barcode size={22} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-white block">Digitação Manual Enxuta</span>
                      <span className="text-[11px] text-slate-400">Para bebidas artesanais, pratos ou itens próprios</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* PASSO 2: FORMULÁRIO ENXUTO */
              <form onSubmit={handleSalvarNovoProduto} className="space-y-3 text-xs font-mono">
                <div>
                  <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                    Nome do Produto:
                  </label>
                  <input
                    type="text"
                    required
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    placeholder="Ex: Coca-Cola Zero 350ml"
                    className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1 flex items-center justify-between">
                      <span>Código de Barras / EAN:</span>
                      {buscandoEan && <span className="text-[#38BDF8] text-[9px] animate-pulse">Buscando GS1...</span>}
                    </label>
                    <input
                      type="text"
                      value={novoCodigoBarras}
                      onChange={(e) => {
                        setNovoCodigoBarras(e.target.value);
                        if (e.target.value.length >= 8) handleConsultarEan(e.target.value);
                      }}
                      placeholder="789..."
                      className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                      Categoria:
                    </label>
                    <select
                      value={novaCategoria}
                      onChange={(e) => setNovaCategoria(e.target.value)}
                      className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                    >
                      <option value="bebidas">Bebidas</option>
                      <option value="alimentos">Alimentos</option>
                      <option value="tabacos_conveniencia">Conveniência</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                      Preço de Venda (R$):
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      required
                      value={novoPrecoVendaForm}
                      onChange={(e) => setNovoPrecoVendaForm(e.target.value)}
                      placeholder="Ex: 7.00"
                      className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                      Preço de Custo (R$):
                    </label>
                    <input
                      type="number"
                      step="0.50"
                      value={novoPrecoCustoForm}
                      onChange={(e) => setNovoPrecoCustoForm(e.target.value)}
                      placeholder="Ex: 4.50"
                      className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                      Estoque Inicial Bar:
                    </label>
                    <input
                      type="number"
                      value={novoEstoqueGondola}
                      onChange={(e) => setNovoEstoqueGondola(e.target.value)}
                      className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-slate-400 block font-bold mb-1">
                      Estoque Inicial Depósito:
                    </label>
                    <input
                      type="number"
                      value={novoEstoqueArmazem}
                      onChange={(e) => setNovoEstoqueArmazem(e.target.value)}
                      className="w-full bg-[#131B2E] border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-[#10B981]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvandoNovo}
                  className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#0B1326] font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg mt-2 flex items-center justify-center gap-1.5"
                >
                  {salvandoNovo ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  <span>Concluir Cadastro</span>
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* MODAL SCANNER CÂMERA */}
      {isCameraScannerOpen && (
        <LeitorQrCameraModal
          isOpen={isCameraScannerOpen}
          onClose={() => setIsCameraScannerOpen(false)}
          onScanSuccess={(codigo: string) => {
            setIsCameraScannerOpen(false);
            if (cameraTarget === 'cadastro_auto') {
              setNovoCodigoBarras(codigo);
              setPassoNovoProduto('formulario');
              handleConsultarEan(codigo);
            }
          }}
        />
      )}

    </div>
  );
};
