import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Sparkles, 
  Barcode, 
  Camera, 
  Upload, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Wine, 
  Tag, 
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { LeitorQrCameraModal } from '../components/LeitorQrCameraModal';

export interface ProdutoMestre {
  id: number;
  codigo_barras: string;
  nome: string;
  marca?: string | null;
  categoria: string;
  subcategoria: string;
  tipo?: string | null;
  preco_custo_sugerido?: number | null;
  preco_venda_sugerido?: number | null;
  foto_url?: string | null;
  descricao?: string | null;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export const CatalogoGlobalAdmin: React.FC = () => {
  const [produtos, setProdutos] = useState<ProdutoMestre[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<'todos' | 'bebidas' | 'alimentos'>('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<ProdutoMestre | null>(null);
  const [semeando, setSemeando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [formEan, setFormEan] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formMarca, setFormMarca] = useState('');
  const [formCategoria, setFormCategoria] = useState<'bebidas' | 'alimentos'>('bebidas');
  const [formSubcategoria, setFormSubcategoria] = useState('alcoolicas');
  const [formTipo, setFormTipo] = useState('cervejas');
  const [formPrecoCusto, setFormPrecoCusto] = useState('');
  const [formPrecoVenda, setFormPrecoVenda] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formAtivo, setFormAtivo] = useState(true);

  const resolverUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = (api.defaults.baseURL || 'http://localhost:8000').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  };

  const carregarProdutos = async () => {
    try {
      setCarregando(true);
      const params: Record<string, string> = {};
      if (termoBusca.trim()) params.busca = termoBusca.trim();
      if (categoriaAtiva !== 'todos') params.categoria = categoriaAtiva;

      const res = await api.get('/catalogo-mestre/', { params });
      setProdutos(res.data || []);
      setMensagemErro(null);
    } catch (err: any) {
      console.error('Erro ao carregar catálogo mestre:', err);
      setMensagemErro(err.response?.data?.detail || 'Erro ao carregar catálogo mestre.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      carregarProdutos();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [termoBusca, categoriaAtiva]);

  const abrirModalNovo = () => {
    setProdutoEditando(null);
    setFormEan('');
    setFormNome('');
    setFormMarca('');
    setFormCategoria('bebidas');
    setFormSubcategoria('alcoolicas');
    setFormTipo('cervejas');
    setFormPrecoCusto('');
    setFormPrecoVenda('');
    setFormFotoUrl('');
    setFormDescricao('');
    setFormAtivo(true);
    setMensagemErro(null);
    setModalAberto(true);
  };

  const abrirModalEdicao = (prod: ProdutoMestre) => {
    setProdutoEditando(prod);
    setFormEan(prod.codigo_barras);
    setFormNome(prod.nome);
    setFormMarca(prod.marca || '');
    setFormCategoria(prod.categoria === 'alimentos' ? 'alimentos' : 'bebidas');
    setFormSubcategoria(prod.subcategoria || 'alcoolicas');
    setFormTipo(prod.tipo || '');
    setFormPrecoCusto(prod.preco_custo_sugerido !== null && prod.preco_custo_sugerido !== undefined ? String(prod.preco_custo_sugerido) : '');
    setFormPrecoVenda(prod.preco_venda_sugerido !== null && prod.preco_venda_sugerido !== undefined ? String(prod.preco_venda_sugerido) : '');
    setFormFotoUrl(prod.foto_url || '');
    setFormDescricao(prod.descricao || '');
    setFormAtivo(prod.ativo);
    setMensagemErro(null);
    setModalAberto(true);
  };

  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    try {
      setEnviandoFoto(true);
      const formData = new FormData();
      formData.append('file', arquivo);

      const res = await api.post('/uploads/catalogo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.url) {
        setFormFotoUrl(res.data.url);
      }
    } catch (err: any) {
      console.error('Erro ao enviar imagem do catálogo:', err);
      alert(err.response?.data?.detail || err.response?.data?.error || 'Erro ao fazer upload da imagem.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEan.trim() || !formNome.trim()) {
      alert('Código de Barras e Nome do Produto são obrigatórios.');
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        codigo_barras: formEan.trim(),
        nome: formNome.trim(),
        marca: formMarca.trim() || null,
        categoria: formCategoria,
        subcategoria: formSubcategoria.trim() || 'geral',
        tipo: formTipo.trim() || null,
        preco_custo_sugerido: formPrecoCusto ? parseFloat(formPrecoCusto) : null,
        preco_venda_sugerido: formPrecoVenda ? parseFloat(formPrecoVenda) : null,
        foto_url: formFotoUrl.trim() || null,
        descricao: formDescricao.trim() || null,
        ativo: formAtivo
      };

      if (produtoEditando) {
        await api.put(`/catalogo-mestre/${produtoEditando.id}`, payload);
        setMensagemSucesso(`Produto "${formNome}" atualizado com sucesso!`);
      } else {
        await api.post('/catalogo-mestre/', payload);
        setMensagemSucesso(`Produto "${formNome}" cadastrado no catálogo mestre!`);
      }

      setModalAberto(false);
      carregarProdutos();
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      console.error('Erro ao salvar produto mestre:', err);
      setMensagemErro(err.response?.data?.detail || 'Erro ao salvar produto.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (prod: ProdutoMestre) => {
    if (!confirm(`Deseja realmente inativar o produto mestre "${prod.nome}"?`)) return;

    try {
      await api.delete(`/catalogo-mestre/${prod.id}`);
      setMensagemSucesso(`Produto "${prod.nome}" inativado com sucesso.`);
      carregarProdutos();
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err: any) {
      console.error('Erro ao inativar produto mestre:', err);
      alert(err.response?.data?.detail || 'Erro ao excluir produto.');
    }
  };

  const handleSemearPadrao = async () => {
    try {
      setSemeando(true);
      const res = await api.post('/catalogo-mestre/seed-inicial');
      setMensagemSucesso(`Catálogo semeado com sucesso! ${res.data?.produtos_adicionados || 0} novo(s) item(ns) adicionado(s).`);
      carregarProdutos();
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      console.error('Erro ao semear catálogo:', err);
      alert(err.response?.data?.detail || 'Falha ao semear catálogo padrão.');
    } finally {
      setSemeando(false);
    }
  };

  const handleEanScanned = (codigo: string) => {
    setFormEan(codigo.trim());
    setCameraAberta(false);
  };

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-hidden animate-fadeIn select-none">
      
      {/* Esferas de Iluminação Ambiente (Glass Ambient Glow - Purple & Cyan SuperAdmin Theme) */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 rounded-full bg-purple-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-cyan-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

      {/* ============================================================== */}
      {/* 1. HEADER DO SUPERADMIN                                        */}
      {/* ============================================================== */}
      <header className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-purple-500/25 ring-1 ring-white/20 text-white font-black">
            <Package size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-purple-200 via-purple-400 to-cyan-300 bg-clip-text text-transparent">
                Catálogo Global Mestre
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300 uppercase tracking-wider">
                SuperAdmin
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Base central de produtos com fotos locais de alta velocidade para todo o ecossistema SaaS
            </p>
          </div>
        </div>

        {/* Botões Superiores */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSemearPadrao}
            disabled={semeando}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 hover:text-white text-xs font-semibold backdrop-blur-xl transition active:scale-95 disabled:opacity-50"
            title="Popula produtos populares caso a base esteja vazia"
          >
            <Sparkles size={14} className={semeando ? 'animate-spin text-purple-400' : 'text-amber-400'} />
            <span>{semeando ? 'Semeando...' : 'Semear Padrão'}</span>
          </button>

          <button
            onClick={abrirModalNovo}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition active:scale-95"
          >
            <Plus size={16} />
            <span>Novo Produto Mestre</span>
          </button>
        </div>
      </header>

      {/* Alertas Temporários */}
      {mensagemSucesso && (
        <div className="relative z-10 mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <Check size={16} className="shrink-0" />
          <span>{mensagemSucesso}</span>
        </div>
      )}
      {mensagemErro && (
        <div className="relative z-10 mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle size={16} className="shrink-0" />
          <span>{mensagemErro}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. BARRA DE BUSCA E FILTROS GLASSMORPHISM                      */}
      {/* ============================================================== */}
      <section className="relative z-10 mb-4">
        <div className="rounded-2xl bg-white/[0.05] backdrop-blur-xl border border-white/10 p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          {/* Input de Busca */}
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por EAN, nome ou marca..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400 transition"
            />
            {termoBusca && (
              <button
                onClick={() => setTermoBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Categorias Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {(['todos', 'bebidas', 'alimentos'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                  categoriaAtiva === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => carregarProdutos()}
              className="p-2 rounded-xl bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
              title="Atualizar lista"
            >
              <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 3. GRID DE CARDS DE PRODUTOS MESTRE                            */}
      {/* ============================================================== */}
      <main className="relative z-10 flex-1">
        {carregando && produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={32} className="animate-spin text-purple-400 mb-3" />
            <p className="text-xs font-medium">Carregando catálogo mestre...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-12 text-center max-w-lg mx-auto my-8">
            <div className="w-16 h-16 rounded-3xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Nenhum produto cadastrado</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              O catálogo mestre ainda não possui produtos correspondentes ao filtro. Você pode cadastrar manualmente ou semear os itens clássicos de bar.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleSemearPadrao}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/25 flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Semear 12 Itens Padrão</span>
              </button>
              <button
                onClick={abrirModalNovo}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold border border-white/10 transition"
              >
                Cadastrar Novo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
            {produtos.map((prod) => {
              const fotoResolvida = resolverUrl(prod.foto_url);
              const margem = (prod.preco_custo_sugerido && prod.preco_venda_sugerido && prod.preco_custo_sugerido > 0)
                ? (((prod.preco_venda_sugerido - prod.preco_custo_sugerido) / prod.preco_custo_sugerido) * 100).toFixed(0)
                : null;

              return (
                <div
                  key={prod.id}
                  className="group relative rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-purple-500/50 p-3.5 shadow-xl transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Imagem do Produto com Badge EAN */}
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 border border-white/5 mb-3 flex items-center justify-center">
                      {fotoResolvida ? (
                        <img
                          src={fotoResolvida}
                          alt={prod.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            // Fallback caso a foto não carregue
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-500">
                          <Wine size={32} className="text-purple-400/60 mb-1" />
                          <span className="text-[10px] font-bold uppercase">{prod.marca || 'Sem Foto'}</span>
                        </div>
                      )}

                      {/* Pill de EAN Flutuante */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                        <Barcode size={10} />
                        <span>{prod.codigo_barras}</span>
                      </div>

                      {/* Status Ativo */}
                      <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${prod.ativo ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    </div>

                    {/* Informações Textuais */}
                    <div className="mb-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-0.5">
                        <Tag size={10} />
                        <span>{prod.marca || prod.categoria}</span>
                        {prod.tipo && <span>• {prod.tipo}</span>}
                      </div>

                      <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                        {prod.nome}
                      </h3>

                      {prod.descricao && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-1 font-normal">
                          {prod.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Preços e Ações */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Custo Sug.</span>
                        <span className="font-bold text-slate-300 tabular-nums">
                          {prod.preco_custo_sugerido ? `R$ ${prod.preco_custo_sugerido.toFixed(2).replace('.', ',')}` : '—'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] uppercase tracking-wider text-slate-400 block">Venda Sug.</span>
                        <span className="font-black text-amber-400 tabular-nums">
                          {prod.preco_venda_sugerido ? `R$ ${prod.preco_venda_sugerido.toFixed(2).replace('.', ',')}` : '—'}
                        </span>
                      </div>
                    </div>

                    {margem && (
                      <div className="mb-2 text-[10px] font-medium text-emerald-400 flex items-center justify-end gap-1">
                        <TrendingUp size={11} />
                        <span>Margem est.: +{margem}%</span>
                      </div>
                    )}

                    {/* Botões Editar / Excluir */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirModalEdicao(prod)}
                        className="flex-1 py-1.5 rounded-xl bg-white/[0.06] hover:bg-purple-600/30 hover:border-purple-500/40 border border-white/10 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Edit3 size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleExcluir(prod)}
                        className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 text-slate-400 hover:text-rose-300 transition"
                        title="Inativar produto"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 4. MODAL DE CADASTRO / EDIÇÃO                                  */}
      {/* ============================================================== */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-900/95 border border-white/15 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-900">
            
            {/* Fechar */}
            <button
              onClick={() => setModalAberto(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            >
              <X size={18} />
            </button>

            {/* Cabeçalho do Modal */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Package size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  {produtoEditando ? 'Editar Produto Mestre' : 'Cadastrar no Catálogo Mestre'}
                </h2>
                <p className="text-xs text-slate-400">
                  Preencha os dados e a imagem local que servirá como modelo para todo o SaaS
                </p>
              </div>
            </div>

            <form onSubmit={handleSalvarProduto} className="space-y-4">
              {/* Código de Barras (EAN) com Leitor de Câmera */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Código de Barras (EAN / GTIN) *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formEan}
                      onChange={(e) => setFormEan(e.target.value)}
                      placeholder="Ex: 7891991000845"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-purple-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCameraAberta(true)}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-bold transition flex items-center gap-1.5"
                    title="Bipar código com a câmera"
                  >
                    <Camera size={16} />
                    <span className="hidden sm:inline">Bipar</span>
                  </button>
                </div>
              </div>

              {/* Upload de Foto Local ou URL Externa */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Foto do Produto (Local ou Web)
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  {/* Preview da Foto */}
                  <div className="w-20 h-20 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {formFotoUrl ? (
                      <img
                        src={resolverUrl(formFotoUrl)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={24} className="text-slate-600" />
                    )}
                    {enviandoFoto && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <RefreshCw size={16} className="animate-spin text-purple-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleUploadFoto}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={enviandoFoto}
                        className="flex-1 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/10 text-white text-xs font-semibold transition flex items-center justify-center gap-2"
                      >
                        <Upload size={14} className="text-purple-400" />
                        <span>{enviandoFoto ? 'Enviando foto...' : 'Fazer Upload de Foto Local'}</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={formFotoUrl}
                      onChange={(e) => setFormFotoUrl(e.target.value)}
                      placeholder="Ou cole uma URL externa direta (https://...)"
                      className="w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-[11px] focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* Nome e Marca */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Ex: Cerveja Heineken Puro Malte 350ml"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formMarca}
                    onChange={(e) => setFormMarca(e.target.value)}
                    placeholder="Ex: Heineken"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Categorias & Tipo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={formCategoria}
                    onChange={(e) => setFormCategoria(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="bebidas">Bebidas</option>
                    <option value="alimentos">Alimentos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Subcategoria
                  </label>
                  <select
                    value={formSubcategoria}
                    onChange={(e) => setFormSubcategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-purple-400"
                  >
                    <option value="alcoolicas">Alcoólicas</option>
                    <option value="nao_alcoolicas">Não Alcoólicas</option>
                    <option value="snacks">Snacks & Petiscos</option>
                    <option value="doses">Doses & Destilados</option>
                    <option value="geral">Geral</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Tipo / Formato
                  </label>
                  <input
                    type="text"
                    value={formTipo}
                    onChange={(e) => setFormTipo(e.target.value)}
                    placeholder="Ex: cervejas, lata, long neck"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                  />
                </div>
              </div>

              {/* Preços Sugeridos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preço de Custo Sugerido (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formPrecoCusto}
                      onChange={(e) => setFormPrecoCusto(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Preço de Venda Sugerido (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formPrecoVenda}
                      onChange={(e) => setFormPrecoVenda(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Descrição do Produto
                </label>
                <textarea
                  rows={2}
                  value={formDescricao}
                  onChange={(e) => setFormDescricao(e.target.value)}
                  placeholder="Detalhes sobre aroma, coloração, volume ou especificações da embalagem..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prodAtivo"
                  checked={formAtivo}
                  onChange={(e) => setFormAtivo(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="prodAtivo" className="text-xs text-slate-300 cursor-pointer font-medium">
                  Produto ativo e visível na consulta global de EAN
                </label>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {salvando ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{produtoEditando ? 'Salvar Alterações' : 'Criar Produto Mestre'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL DE SCANNER DE CÂMERA (Bipar EAN)                      */}
      {/* ============================================================== */}
      <LeitorQrCameraModal
        aberto={cameraAberta}
        aoFechar={() => setCameraAberta(false)}
        aoLerCodigo={handleEanScanned}
        titulo="Bipar Código de Barras (EAN)"
        subtitulo="Aponte a câmera para o código da embalagem para preencher o EAN automaticamente"
      />

    </div>
  );
};
