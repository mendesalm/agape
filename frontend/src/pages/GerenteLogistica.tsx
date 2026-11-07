import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  ArrowLeft,
  Search, 
  Wine, 
  Utensils, 
  Beer, 
  CupSoda, 
  QrCode, 
  Plus, 
  Edit3, 
  Hourglass, 
  ArrowRightLeft, 
  Trash2, 
  Save, 
  Camera, 
  Zap,
  Layers
} from 'lucide-react';
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

export const GerenteLogistica: React.FC = () => {
  const navigate = useNavigate();

  // Estados principais de dados
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Modos de Exibição do Módulo de Logística (Padrão Stitch)
  // 'catalogo' = Tela 7 (Logística & Estoque FEFO)
  // 'detalhe'  = Tela 8 (Detalhe do Produto & Lotes)
  // 'cadastro' = Tela 9 (Cadastrar Produto)
  const [modoView, setModoView] = useState<'catalogo' | 'detalhe' | 'cadastro'>('catalogo');
  const [produtoEmGestao, setProdutoEmGestao] = useState<Produto | null>(null);

  // Filtros de Categoria (Padrão Stitch)
  const [categoriaPrincipal, setCategoriaPrincipal] = useState<'BEBIDAS' | 'ALIMENTOS'>('BEBIDAS');
  const [subcategoriaBebidas, setSubcategoriaBebidas] = useState<'TODAS' | 'ALCOOLICAS' | 'NAO_ALCOOLICAS'>('TODAS');
  const [filtroPill, setFiltroPill] = useState<'todos' | 'repor_bar' | 'baixo_estoque'>('todos');

  // Estados para a Tela 8 (Detalhe do Produto & Lotes)
  const [isEditandoPreco, setIsEditandoPreco] = useState(false);
  const [novoPrecoVenda, setNovoPrecoVenda] = useState('');
  const [novoPrecoCusto, setNovoPrecoCusto] = useState('');
  const [isModalTransferir, setIsModalTransferir] = useState(false);
  const [qtdTransferir, setQtdTransferir] = useState('6');
  const [isModalPerda, setIsModalPerda] = useState(false);
  const [qtdPerda, setQtdPerda] = useState('1');
  const [motivoPerda, setMotivoPerda] = useState('Quebra acidental no salão');
  const [isModalNovoLote, setIsModalNovoLote] = useState(false);
  const [novoLoteNumero, setNovoLoteNumero] = useState('L-NOVO-01');
  const [novoLoteValidade, setNovoLoteValidade] = useState('');
  const [novoLoteQtd, setNovoLoteQtd] = useState('24');
  const [novoLoteCusto, setNovoLoteCusto] = useState('5.00');

  // Estados para a Tela 9 (Cadastrar Produto)
  const [metodoEntradaCadastro, setMetodoEntradaCadastro] = useState<'manual' | 'qr'>('manual');
  const [cadNome, setCadNome] = useState('');
  const [cadCodigo, setCadCodigo] = useState('');
  const [cadFotoUrl, setCadFotoUrl] = useState('');
  const [cadMainCat, setCadMainCat] = useState<'BEBIDAS' | 'ALIMENTOS'>('BEBIDAS');
  const [cadSubCat, setCadSubCat] = useState<'ALCOOLICAS' | 'NAO_ALCOOLICAS'>('ALCOOLICAS');
  const [cadCusto, setCadCusto] = useState('4.80');
  const [cadVenda, setCadVenda] = useState('9.00');
  const [cadGondola, setCadGondola] = useState('12');
  const [cadDeposito, setCadDeposito] = useState('48');
  const [cadValidade, setCadValidade] = useState('15/08/2027');
  const [isCameraQrAberta, setIsCameraQrAberta] = useState(false);
  const [salvandoProduto, setSalvandoProduto] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/produtos/').catch(() => ({ data: [] }));
      const prods: Produto[] = Array.isArray(res.data) ? res.data : [];
      setProdutos(prods);

      if (produtoEmGestao) {
        const atualizado = prods.find(p => p.id === produtoEmGestao.id);
        if (atualizado) setProdutoEmGestao(atualizado);
      }
    } catch (err) {
      console.error('Erro ao carregar catálogo de produtos', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtragem dos Produtos (Padrão Stitch)
  const produtosFiltrados = produtos.filter((p) => {
    // 1. Categoria Principal (Bebidas vs Alimentos)
    const catUpper = (p.categoria || '').toUpperCase();
    if (categoriaPrincipal && catUpper !== categoriaPrincipal) {
      return false;
    }

    // 2. Subcategoria (Alcoólicas vs Não Alcoólicas)
    if (categoriaPrincipal === 'BEBIDAS' && subcategoriaBebidas !== 'TODAS') {
      const subUpper = (p.subcategoria || '').toUpperCase();
      if (subUpper !== subcategoriaBebidas) {
        return false;
      }
    }

    // 3. Busca por texto
    const buscaMatch =
      p.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(termoBusca)) ||
      (p.marca && p.marca.toLowerCase().includes(termoBusca.toLowerCase()));
    if (!buscaMatch) return false;

    // 4. Pills de Alertas
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
  const reposicoesPendentes = produtos.filter((p) => p.quantidade_gondola <= (p.estoque_minimo_gondola || 5)).length;

  // Ações da Tela 8: Detalhes do Produto
  const handleAbrirDetalhes = (prod: Produto) => {
    setProdutoEmGestao(prod);
    setNovoPrecoVenda(prod.preco_venda.toFixed(2));
    setNovoPrecoCusto(prod.preco_custo.toFixed(2));
    setModoView('detalhe');
  };

  const handleSalvarPrecos = async () => {
    if (!produtoEmGestao) return;
    try {
      const pV = parseFloat(novoPrecoVenda.replace(',', '.'));
      const pC = parseFloat(novoPrecoCusto.replace(',', '.'));
      await api.put(`/produtos/${produtoEmGestao.id}`, {
        preco_venda: pV,
        preco_custo: pC
      });
      setIsEditandoPreco(false);
      await carregarProdutos();
      alert('Preços atualizados com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao atualizar preços.');
    }
  };

  const handleTransferirEstoque = async () => {
    if (!produtoEmGestao) return;
    try {
      const qtd = parseInt(qtdTransferir);
      await api.post(`/produtos/${produtoEmGestao.id}/transferir-gondola`, {
        quantidade: qtd,
        motivo: 'Reposição no Bar'
      });
      setIsModalTransferir(false);
      await carregarProdutos();
      alert(`Transferidas ${qtd} unidades para a Gôndola do Bar!`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Falha ao transferir.');
    }
  };

  const handleRegistrarPerda = async () => {
    if (!produtoEmGestao) return;
    try {
      const qtd = parseInt(qtdPerda);
      await api.post(`/produtos/${produtoEmGestao.id}/perdas`, {
        quantidade: qtd,
        ambiente: 'gondola',
        motivo: motivoPerda
      });
      setIsModalPerda(false);
      await carregarProdutos();
      alert('Perda registrada na trilha de auditoria fiscal.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar perda.');
    }
  };

  const handleCriarLote = async () => {
    if (!produtoEmGestao) return;
    try {
      await api.post(`/produtos/${produtoEmGestao.id}/lotes`, {
        numero_lote: novoLoteNumero,
        data_validade: novoLoteValidade || new Date(Date.now() + 90*86400000).toISOString(),
        quantidade_armazem: parseInt(novoLoteQtd) || 12,
        quantidade_gondola: 0,
        preco_custo_unitario: parseFloat(novoLoteCusto) || produtoEmGestao.preco_custo
      });
      setIsModalNovoLote(false);
      await carregarProdutos();
      alert('Entrada de Lote FEFO realizada com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao registrar lote.');
    }
  };

  // Ações da Tela 9: Cadastrar Produto
  const handleSimularScanCadastro = () => {
    setCadNome('Cerveja Patagonia Weisse 355ml');
    setCadCodigo('QR-PATAG-W7893');
    setCadCusto('6.20');
    setCadVenda('14.00');
    setCadGondola('10');
    setCadDeposito('30');
    setCadValidade('15/08/2027');
    setCadFotoUrl('https://images.unsplash.com/photo-1608270191765-a83d1c1a2f90?w=600&auto=format&fit=crop&q=80');
    setMetodoEntradaCadastro('manual');
  };

  const handleSalvarNovoProduto = async () => {
    if (!cadNome.trim()) {
      alert('Informe o nome do produto.');
      return;
    }
    try {
      setSalvandoProduto(true);
      await api.post('/produtos/', {
        nome: cadNome.trim(),
        codigo_barras: cadCodigo.trim() || undefined,
        foto_url: cadFotoUrl.trim() || undefined,
        categoria: cadMainCat,
        subcategoria: cadMainCat === 'BEBIDAS' ? cadSubCat : 'SNACKS_PETISCOS',
        preco_venda: parseFloat(cadVenda.replace(',', '.')) || 9.00,
        preco_custo: parseFloat(cadCusto.replace(',', '.')) || 4.80,
        quantidade_gondola: parseInt(cadGondola) || 0,
        quantidade_armazem: parseInt(cadDeposito) || 0
      });
      await carregarProdutos();
      alert('Produto cadastrado e integrado ao estoque com sucesso!');
      setModoView('catalogo');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Erro ao cadastrar produto.');
    } finally {
      setSalvandoProduto(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-lg lg:max-w-4xl mx-auto overflow-hidden animate-fadeIn select-none text-slate-100">
      
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow) */}
      <div className="pointer-events-none absolute -top-14 -left-12 w-64 h-64 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 left-1/4 w-64 h-64 rounded-full bg-blue-600/15 blur-3xl" />

      {/* ========================================================================= */}
      {/* VISTA 1: CATÁLOGO & ESTOQUE FEFO (TELA 7 DO STITCH)                       */}
      {/* ========================================================================= */}
      {modoView === 'catalogo' && (
        <div className="flex-1 flex flex-col justify-between space-y-3">
          
          {/* Header */}
          <header className="relative z-10 flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => navigate('/app/gerencia')}
                className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
                title="Voltar para Dimensões"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium">Logística</span>
                  <span className="text-slate-600">/</span>
                  <span className="font-semibold text-cyan-400">Produtos</span>
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  Catálogo do Bar
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setModoView('cadastro')}
                className="w-10 h-10 rounded-2xl bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center transition active:scale-95 shadow-inner hover:bg-cyan-400/30"
                title="Novo Produto"
              >
                <Plus size={20} />
              </button>
            </div>
          </header>

          {/* Filtro Superior Principal: BEBIDAS vs ALIMENTOS */}
          <nav className="relative z-10 grid grid-cols-2 p-1 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 gap-1 text-xs font-semibold">
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

          {/* Sub-Classificação de Bebidas: Alcóolicas vs Não Alcóolicas */}
          {categoriaPrincipal === 'BEBIDAS' && (
            <div className="relative z-10 grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => setSubcategoriaBebidas(subcategoriaBebidas === 'ALCOOLICAS' ? 'TODAS' : 'ALCOOLICAS')}
                className={`group rounded-2xl p-2.5 backdrop-blur-xl border text-left transition-all active:scale-95 ${
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
                <div className="mt-1.5">
                  <span className="text-xs font-bold text-white group-hover:text-amber-300 block">Alcoólicas</span>
                  <span className="text-[10px] text-slate-400 block truncate">Cervejas, Chopp e Doses</span>
                </div>
              </button>

              <button 
                onClick={() => setSubcategoriaBebidas(subcategoriaBebidas === 'NAO_ALCOOLICAS' ? 'TODAS' : 'NAO_ALCOOLICAS')}
                className={`group rounded-2xl p-2.5 backdrop-blur-xl border text-left transition-all active:scale-95 ${
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
                <div className="mt-1.5">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 block">Não Alcoólicas</span>
                  <span className="text-[10px] text-slate-400 block truncate">Refrigerantes e Águas</span>
                </div>
              </button>
            </div>
          )}

          {/* Campo de Busca & Filtros Rápidos */}
          <div className="relative z-10 space-y-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 text-slate-400" size={16} />
              <input 
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar produto por nome, marca ou EAN..."
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400/50 shadow-inner"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button 
                onClick={() => setFiltroPill('todos')}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                  filtroPill === 'todos'
                    ? 'bg-white/15 border border-white/30 text-white shadow-sm'
                    : 'bg-white/[0.04] border border-white/10 text-slate-400'
                }`}
              >
                Todos ({produtos.length})
              </button>

              <button 
                onClick={() => setFiltroPill(filtroPill === 'repor_bar' ? 'todos' : 'repor_bar')}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                  filtroPill === 'repor_bar'
                    ? 'bg-rose-500/25 border border-rose-500/40 text-rose-300 shadow-sm'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                🔴 Repor no Bar ({reposicoesPendentes})
              </button>

              <button 
                onClick={() => setFiltroPill(filtroPill === 'baixo_estoque' ? 'todos' : 'baixo_estoque')}
                className={`px-3 py-1 rounded-xl text-[10px] font-bold shrink-0 transition-all ${
                  filtroPill === 'baixo_estoque'
                    ? 'bg-amber-500/25 border border-amber-500/40 text-amber-300 shadow-sm'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                }`}
              >
                🟡 Baixo Estoque
              </button>
            </div>
          </div>

          {/* Grid Visual 2x2 com Produtos (Padrão Stitch) */}
          <main className="relative z-10 flex-1 overflow-y-auto max-h-[360px] scrollbar-thin scrollbar-thumb-slate-800">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-1 mb-2 flex items-center justify-between">
              <span>{categoriaPrincipal} • {produtosFiltrados.length} itens</span>
              <span className="text-cyan-400 font-bold">Toque p/ detalhes</span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs font-mono animate-pulse">
                Carregando catálogo do bar...
              </div>
            ) : produtosFiltrados.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                Nenhum produto cadastrado nesta categoria.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {produtosFiltrados.map((prod) => {
                  const isCritico = prod.quantidade_gondola <= 2;
                  const isBaixo = prod.quantidade_gondola <= (prod.estoque_minimo_gondola || 5);

                  return (
                    <div 
                      key={prod.id}
                      onClick={() => handleAbrirDetalhes(prod)}
                      className="group relative rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden cursor-pointer hover:border-cyan-400/50 transition-all flex flex-col justify-between active:scale-[0.98]"
                    >
                      {/* Miniatura / Foto com Proporção */}
                      <div className="relative h-24 w-full overflow-hidden bg-slate-900/60 flex items-center justify-center">
                        {prod.foto_url ? (
                          <img 
                            src={prod.foto_url} 
                            alt={prod.nome} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-12 h-16 rounded-xl bg-gradient-to-b from-cyan-600/30 to-slate-900 border border-cyan-400/30 flex flex-col items-center justify-center p-1 text-cyan-300">
                            <Wine size={20} />
                            <span className="text-[7px] font-bold mt-1 uppercase truncate max-w-[40px]">{prod.marca || 'Item'}</span>
                          </div>
                        )}

                        {/* Badge de Estoque no Bar */}
                        <span className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-lg text-[9px] font-extrabold shadow-md ${
                          isCritico
                            ? 'bg-rose-500/90 text-white'
                            : isBaixo
                            ? 'bg-amber-500/90 text-stone-950'
                            : 'bg-emerald-500/90 text-stone-950'
                        }`}>
                          {prod.quantidade_gondola} no Bar
                        </span>
                      </div>

                      {/* Informações Básicas */}
                      <div className="p-2.5 flex flex-col justify-between flex-1">
                        <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                          {prod.nome}
                        </h3>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-400 tabular-nums">
                            R$ {prod.preco_venda.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Tot: {prod.quantidade_estoque}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {/* Bottom Bar: Repor Gôndola & Escanear Código (Padrão Stitch) */}
          <footer className="relative z-10 pt-1 pb-1">
            <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2 flex items-center justify-between shadow-xl">
              <button 
                onClick={() => setFiltroPill(filtroPill === 'repor_bar' ? 'todos' : 'repor_bar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
              >
                <ArrowRightLeft size={16} />
                Repor Gôndola ({reposicoesPendentes})
              </button>

              <div className="h-4 w-px bg-white/10" />

              <button 
                onClick={() => setModoView('cadastro')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 transition text-xs font-bold shadow-sm"
              >
                <QrCode size={16} />
                Escanear Código
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: DETALHE DO PRODUTO & LOTES (TELA 8 DO STITCH)                    */}
      {/* ========================================================================= */}
      {modoView === 'detalhe' && produtoEmGestao && (
        <div className="flex-1 flex flex-col justify-between space-y-3">
          
          {/* Header */}
          <header className="relative z-10 flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setModoView('catalogo')}
                className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
                title="Voltar para Estoque Geral"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium">Estoque</span>
                  <span className="text-slate-600">/</span>
                  <span className="font-semibold text-amber-400">{produtoEmGestao.categoria}</span>
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  Controle do Item
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsEditandoPreco(!isEditandoPreco)}
                className="w-9 h-9 rounded-xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-amber-300 transition active:scale-95 shadow-inner" 
                title="Editar Preço"
              >
                <Edit3 size={17} />
              </button>
            </div>
          </header>

          {/* Card de Identificação com Foto & Código de Barras */}
          <section className="relative z-10 my-1">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.09] to-white/[0.03] backdrop-blur-xl border border-white/15 p-3.5 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-18 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {produtoEmGestao.foto_url ? (
                    <img src={produtoEmGestao.foto_url} alt={produtoEmGestao.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Wine size={26} className="text-cyan-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                      {produtoEmGestao.categoria} • {produtoEmGestao.marca || 'Original'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {produtoEmGestao.codigo_barras || 'EAN-13'}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-tight mt-1 truncate">
                    {produtoEmGestao.nome}
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate">
                    {produtoEmGestao.descricao || 'Item integrado ao Salão de Ágapes'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Linha 1: Precificação & Margem (3 Colunas) */}
          <section className="relative z-10 grid grid-cols-3 gap-2">
            <div className="p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Venda</span>
              {isEditandoPreco ? (
                <input 
                  type="text"
                  value={novoPrecoVenda}
                  onChange={(e) => setNovoPrecoVenda(e.target.value)}
                  className="w-full mt-1 text-center font-bold text-emerald-400 bg-black/40 border border-emerald-400/40 rounded-lg text-xs"
                />
              ) : (
                <span className="text-sm font-black text-emerald-400 tabular-nums">
                  R$ {produtoEmGestao.preco_venda.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Custo Lote</span>
              {isEditandoPreco ? (
                <input 
                  type="text"
                  value={novoPrecoCusto}
                  onChange={(e) => setNovoPrecoCusto(e.target.value)}
                  className="w-full mt-1 text-center font-bold text-slate-300 bg-black/40 border border-slate-700 rounded-lg text-xs"
                />
              ) : (
                <span className="text-sm font-black text-slate-300 tabular-nums">
                  R$ {produtoEmGestao.preco_custo.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            <div className="p-3 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-amber-400/20 shadow-xl text-center">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 block">Margem</span>
              <span className="text-sm font-black text-amber-300 tabular-nums">
                {Math.round(((produtoEmGestao.preco_venda - produtoEmGestao.preco_custo) / (produtoEmGestao.preco_custo || 1)) * 100)}%
              </span>
            </div>
          </section>

          {isEditandoPreco && (
            <button 
              onClick={handleSalvarPrecos}
              className="py-2 rounded-xl bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-400/20"
            >
              <Save size={15} /> Salvar Novos Preços
            </button>
          )}

          {/* Linha 2: Distribuição dos Estoques Físicos (Gôndola Bar vs Depósito) */}
          <section className="relative z-10 p-3.5 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers size={14} className="text-cyan-400" />
                Posição de Estoque
              </span>
              <span className="text-[10px] font-extrabold text-white tabular-nums bg-white/10 px-2.5 py-0.5 rounded-full">
                Total: {produtoEmGestao.quantidade_estoque} un
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/20 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Gôndola (Bar)</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white tabular-nums">{produtoEmGestao.quantidade_gondola}</span>
                  <span className="text-[10px] text-slate-400">unidades</span>
                </div>
                <span className="text-[9px] text-emerald-300/80 mt-0.5">Venda direta liberada</span>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Almoxarifado</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-white tabular-nums">{produtoEmGestao.quantidade_armazem}</span>
                  <span className="text-[10px] text-slate-400">unidades</span>
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5">Reserva p/ reposição</span>
              </div>
            </div>
          </section>

          {/* Linha 3: Lotes & FEFO (Validades) */}
          <section className="relative z-10 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[160px] scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Hourglass size={14} className="text-amber-400" />
                Lotes & FEFO (Validades)
              </span>
              <button 
                onClick={() => setIsModalNovoLote(true)}
                className="text-[10px] text-cyan-400 font-bold hover:underline flex items-center gap-0.5"
              >
                <Plus size={13} />
                Entrada de Lote
              </button>
            </div>

            {(produtoEmGestao.lotes || []).length === 0 ? (
              <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-slate-400">
                Nenhum lote específico registrado. Operando no estoque geral.
              </div>
            ) : (
              (produtoEmGestao.lotes || []).map((lote) => (
                <article key={lote.id} className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-white/[0.04] to-transparent border border-amber-400/30 flex items-center justify-between shadow-xl">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{lote.numero_lote}</span>
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        {lote.dias_para_vencer || 90} dias
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Vence em {lote.data_validade?.split('T')[0] || '2027'} • Bar: <strong className="text-white">{lote.quantidade_gondola}</strong> | Dep: <strong className="text-white">{lote.quantidade_armazem}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block">Custo unit.</span>
                    <span className="text-xs font-black text-slate-200 tabular-nums">
                      R$ {lote.preco_custo_unitario.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Bottom Bar: Ações de Transferência & Perda */}
          <footer className="relative z-10 pt-1 pb-1">
            <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2 flex items-center justify-between shadow-xl">
              <button 
                onClick={() => setIsModalPerda(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 transition text-xs font-semibold"
              >
                <Trash2 size={16} />
                Avaria / Perda
              </button>

              <div className="h-4 w-px bg-white/10" />

              <button 
                onClick={() => setIsModalTransferir(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 hover:from-cyan-500/30 hover:to-teal-500/30 text-cyan-300 border border-cyan-400/30 transition text-xs font-bold shadow-sm"
              >
                <ArrowRightLeft size={16} />
                Transferir p/ Gôndola
              </button>
            </div>
          </footer>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: CADASTRAR PRODUTO (TELA 9 DO STITCH)                             */}
      {/* ========================================================================= */}
      {modoView === 'cadastro' && (
        <div className="flex-1 flex flex-col justify-between space-y-2">
          
          {/* Header */}
          <header className="relative z-10 flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setModoView('catalogo')}
                className="w-10 h-10 rounded-2xl bg-white/[0.06] backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-inner"
                title="Voltar para Estoque"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-medium">Estoque</span>
                  <span className="text-slate-600">/</span>
                  <span className="font-semibold text-cyan-400">Entrada</span>
                </div>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white leading-tight">
                  Cadastrar Produto
                </h1>
              </div>
            </div>

            <button 
              onClick={() => setModoView('catalogo')}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 text-slate-400 hover:text-white text-xs font-semibold transition"
            >
              Cancelar
            </button>
          </header>

          {/* Seletor Segmentado de Método de Entrada: Manual vs Via QR Code */}
          <nav className="relative z-10 grid grid-cols-2 p-1 rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 gap-1 my-1 text-xs font-semibold">
            <button 
              type="button" 
              onClick={() => setMetodoEntradaCadastro('manual')}
              className={`py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                metodoEntradaCadastro === 'manual'
                  ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 size={16} />
              <span>Manual</span>
            </button>

            <button 
              type="button" 
              onClick={() => setMetodoEntradaCadastro('qr')}
              className={`py-1.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
                metodoEntradaCadastro === 'qr'
                  ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode size={16} />
              <span>Via QR Code</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </nav>

          {/* Área de Scanner QR Code (Visor Interativo com Varredura Laser) */}
          {metodoEntradaCadastro === 'qr' && (
            <section className="relative z-10 p-3 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-cyan-400/40 shadow-xl flex flex-col items-center justify-center gap-2">
              <div className="relative w-full h-32 rounded-2xl bg-slate-950/80 border border-white/15 overflow-hidden flex items-center justify-center">
                <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse shadow-lg shadow-cyan-400/50" />
                <div className="absolute inset-4 border-2 border-dashed border-cyan-400/50 rounded-xl pointer-events-none flex items-center justify-center">
                  <QrCode size={48} className="text-cyan-400/30" />
                </div>
                <span className="absolute bottom-2 text-[10px] text-slate-300 bg-black/60 px-2.5 py-0.5 rounded-md font-medium">
                  Aponte a câmera para o QR Code do produto ou nota
                </span>
              </div>

              <div className="w-full flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCameraQrAberta(true)}
                  className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 font-bold transition flex items-center justify-center gap-1.5 text-xs"
                >
                  <Camera size={16} />
                  Abrir Câmera do Dispositivo
                </button>
                <button 
                  type="button" 
                  onClick={handleSimularScanCadastro}
                  className="py-2 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 font-bold transition flex items-center justify-center gap-1 text-xs"
                  title="Simular Leitura"
                >
                  <Zap size={15} />
                  Simular
                </button>
              </div>
            </section>
          )}

          {/* Formulário Compacto sem Rolagem */}
          <form className="relative z-10 flex-1 flex flex-col justify-start gap-2 overflow-y-auto max-h-[380px] scrollbar-thin scrollbar-thumb-slate-800" onSubmit={(e) => { e.preventDefault(); handleSalvarNovoProduto(); }}>
            
            {/* Seção 1: Identificação (Foto, Nome e Código) */}
            <section className="p-3 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex items-center gap-3">
              <div 
                onClick={() => {
                  const url = prompt('Cole a URL da foto do produto (ex: Unsplash ou CDN):', cadFotoUrl);
                  if (url !== null) setCadFotoUrl(url);
                }}
                className="w-16 h-20 rounded-2xl bg-white/[0.05] border border-dashed border-white/20 hover:border-cyan-400/50 flex flex-col items-center justify-center text-slate-400 hover:text-cyan-300 cursor-pointer transition shrink-0 overflow-hidden relative"
              >
                {cadFotoUrl ? (
                  <img src={cadFotoUrl} alt="Prévia" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera size={20} />
                    <span className="text-[8px] font-semibold mt-1">Foto</span>
                  </>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Nome do Produto</label>
                  <input 
                    type="text" 
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    placeholder="Ex: Cerveja IPA 500ml" 
                    className="w-full px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 font-medium"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Código / QR Code</label>
                    <input 
                      type="text" 
                      value={cadCodigo}
                      onChange={(e) => setCadCodigo(e.target.value)}
                      placeholder="QR-AGAPE-..." 
                      className="w-full px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-400/50 font-mono"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setMetodoEntradaCadastro('qr')} 
                    className="w-8 h-8 rounded-xl bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 flex items-center justify-center shrink-0 mt-3"
                  >
                    <QrCode size={16} />
                  </button>
                </div>
              </div>
            </section>

            {/* Seção 2: Categoria Principal e Classificação */}
            <section className="p-2.5 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl flex flex-col gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Classificação</span>
              
              <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-xl bg-white/[0.04]">
                <button 
                  type="button"
                  onClick={() => setCadMainCat('BEBIDAS')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    cadMainCat === 'BEBIDAS'
                      ? 'bg-amber-400/20 border border-amber-400/30 text-amber-300 shadow-sm'
                      : 'text-slate-400'
                  }`}
                >
                  <Wine size={15} />
                  <span>Bebidas</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setCadMainCat('ALIMENTOS')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    cadMainCat === 'ALIMENTOS'
                      ? 'bg-amber-400/20 border border-amber-400/30 text-amber-300 shadow-sm'
                      : 'text-slate-400'
                  }`}
                >
                  <Utensils size={15} />
                  <span>Alimentos</span>
                </button>
              </div>

              {cadMainCat === 'BEBIDAS' && (
                <div className="grid grid-cols-2 gap-1.5 text-center">
                  <button 
                    type="button"
                    onClick={() => setCadSubCat('ALCOOLICAS')}
                    className={`p-2 rounded-xl text-xs font-bold transition ${
                      cadSubCat === 'ALCOOLICAS'
                        ? 'bg-amber-400/20 border border-amber-400/40 text-amber-300'
                        : 'bg-white/[0.04] border border-white/10 text-slate-400'
                    }`}
                  >
                    Alcoólicas
                  </button>
                  <button 
                    type="button"
                    onClick={() => setCadSubCat('NAO_ALCOOLICAS')}
                    className={`p-2 rounded-xl text-xs font-bold transition ${
                      cadSubCat === 'NAO_ALCOOLICAS'
                        ? 'bg-cyan-400/20 border border-cyan-400/40 text-cyan-300'
                        : 'bg-white/[0.04] border border-white/10 text-slate-400'
                    }`}
                  >
                    Não Alcoólicas
                  </button>
                </div>
              )}
            </section>

            {/* Seção 3: Valores Unitários */}
            <section className="p-2.5 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Valores Unitários</span>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.2 rounded-full">
                  Margem: ~{Math.round(((parseFloat(cadVenda) - parseFloat(cadCusto)) / (parseFloat(cadCusto) || 1)) * 100)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">Custo de Compra</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-slate-400 text-xs font-bold">R$</span>
                    <input 
                      type="text" 
                      value={cadCusto}
                      onChange={(e) => setCadCusto(e.target.value)}
                      placeholder="4.80" 
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400/50 font-bold tabular-nums"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-semibold text-slate-400 block mb-0.5">Preço de Venda</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-amber-400 text-xs font-bold">R$</span>
                    <input 
                      type="text" 
                      value={cadVenda}
                      onChange={(e) => setCadVenda(e.target.value)}
                      placeholder="9.00" 
                      className="w-full pl-8 pr-2 py-1.5 rounded-xl bg-white/[0.06] border border-amber-400/30 text-xs text-amber-300 focus:outline-none focus:border-amber-400/60 font-bold tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Seção 4: Estoque Inicial & Lote FEFO */}
            <section className="p-2.5 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-xl">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Estoque Inicial & Lote</span>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="text-[8px] font-semibold text-slate-400 block mb-0.5">Gôndola (Bar)</label>
                  <input 
                    type="number" 
                    value={cadGondola}
                    onChange={(e) => setCadGondola(e.target.value)}
                    placeholder="12" 
                    className="w-full px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white text-center font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-semibold text-slate-400 block mb-0.5">Depósito</label>
                  <input 
                    type="number" 
                    value={cadDeposito}
                    onChange={(e) => setCadDeposito(e.target.value)}
                    placeholder="48" 
                    className="w-full px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white text-center font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="text-[8px] font-semibold text-slate-400 block mb-0.5">Validade FEFO</label>
                  <input 
                    type="text" 
                    value={cadValidade}
                    onChange={(e) => setCadValidade(e.target.value)}
                    placeholder="DD/MM/AAAA" 
                    className="w-full px-2 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-amber-300 text-center font-semibold tabular-nums"
                  />
                </div>
              </div>
            </section>

          </form>

          {/* Bottom Action Bar: Salvar e Inserir no Estoque */}
          <footer className="relative z-10 pt-1 pb-1">
            <button 
              onClick={handleSalvarNovoProduto}
              disabled={salvandoProduto}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 hover:from-cyan-400 hover:to-emerald-300 text-stone-950 font-black text-xs tracking-tight flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer"
            >
              <Save size={18} />
              <span>{salvandoProduto ? 'Inserindo no Estoque...' : 'Salvar e Inserir no Estoque'}</span>
            </button>
          </footer>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAIS AUXILIARES: TRANSFERÊNCIA, PERDA, NOVO LOTE E CÂMERA               */}
      {/* ========================================================================= */}
      
      {/* Modal de Transferência */}
      {isModalTransferir && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-cyan-400/40 rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-cyan-400" />
              Transferir para Gôndola do Bar
            </h3>
            <p className="text-xs text-slate-400">
              Produto: <strong className="text-white">{produtoEmGestao.nome}</strong><br />
              Disponível no Almoxarifado: <strong className="text-cyan-400">{produtoEmGestao.quantidade_armazem} un.</strong>
            </p>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Quantidade a Repor</label>
              <input 
                type="number"
                value={qtdTransferir}
                onChange={(e) => setQtdTransferir(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-center"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsModalTransferir(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold">Cancelar</button>
              <button onClick={handleTransferirEstoque} className="flex-1 py-2 rounded-xl bg-cyan-400 text-stone-950 text-xs font-bold">Transferir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Perda */}
      {isModalPerda && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-rose-500/40 rounded-3xl p-6 w-full max-w-sm space-y-4 text-white shadow-2xl">
            <h3 className="text-sm font-bold flex items-center gap-2 text-rose-400">
              <Trash2 size={18} />
              Registrar Avaria / Quebra
            </h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Quantidade Perdida</label>
              <input 
                type="number"
                value={qtdPerda}
                onChange={(e) => setQtdPerda(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-center"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">Motivo / Justificativa</label>
              <input 
                type="text"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white/10 border border-white/10 text-white text-xs"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setIsModalPerda(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold">Cancelar</button>
              <button onClick={handleRegistrarPerda} className="flex-1 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Novo Lote FEFO */}
      {isModalNovoLote && produtoEmGestao && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#0B1326] border border-amber-400/40 rounded-3xl p-6 w-full max-w-sm space-y-3 text-white shadow-2xl">
            <h3 className="text-sm font-bold flex items-center gap-2 text-amber-400">
              <Plus size={18} /> Entrada de Lote FEFO
            </h3>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Identificador do Lote</label>
              <input 
                type="text"
                value={novoLoteNumero}
                onChange={(e) => setNovoLoteNumero(e.target.value)}
                className="w-full p-2 rounded-xl bg-white/10 border border-white/10 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Qtd (Almox.)</label>
                <input 
                  type="number"
                  value={novoLoteQtd}
                  onChange={(e) => setNovoLoteQtd(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white/10 border border-white/10 text-xs text-white font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Custo Unitário (R$)</label>
                <input 
                  type="text"
                  value={novoLoteCusto}
                  onChange={(e) => setNovoLoteCusto(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white/10 border border-white/10 text-xs text-amber-300 font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Data de Validade</label>
              <input 
                type="date"
                value={novoLoteValidade}
                onChange={(e) => setNovoLoteValidade(e.target.value)}
                className="w-full p-2 rounded-xl bg-white/10 border border-white/10 text-xs text-white"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsModalNovoLote(false)} className="flex-1 py-2 rounded-xl bg-white/10 text-xs font-semibold">Cancelar</button>
              <button onClick={handleCriarLote} className="flex-1 py-2 rounded-xl bg-amber-400 text-stone-950 text-xs font-bold">Adicionar Lote</button>
            </div>
          </div>
        </div>
      )}

      {/* Leitor de Câmera Modal */}
      {isCameraQrAberta && (
        <LeitorQrCameraModal 
          isOpen={isCameraQrAberta}
          onClose={() => setIsCameraQrAberta(false)}
          onScanSuccess={(codigo) => {
            setCadCodigo(codigo);
            setIsCameraQrAberta(false);
            setMetodoEntradaCadastro('manual');
          }}
        />
      )}

    </div>
  );
};
