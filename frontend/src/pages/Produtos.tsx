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
  Search
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
  data_validade?: string;
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

export function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Loja Ativa no Contexto / Âmbito
  const [lojaAtivaInfo, setLojaAtivaInfo] = useState<{ id?: number; nome?: string; numero_loja?: number } | null>(null);

  // Estados dos Modais
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false);
  const [isModalPerdaOpen, setIsModalPerdaOpen] = useState(false);
  const [isModalTransferirOpen, setIsModalTransferirOpen] = useState(false);
  const [isModalLotesOpen, setIsModalLotesOpen] = useState(false);
  const [isModalNovoLoteOpen, setIsModalNovoLoteOpen] = useState(false);
  const [isModalQrOpen, setIsModalQrOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);

  // Estados da Câmera Scanner
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'busca' | 'qr_fabrica' | 'ean'>('busca');

  // Estados do Formulário de Novo Produto
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [qrCodeTag, setQrCodeTag] = useState('');
  const [categoria, setCategoria] = useState<'bebidas' | 'alimentos' | 'tabacos_conveniencia' | 'outros'>('bebidas');
  const [subcategoria, setSubcategoria] = useState<'alcoolicas' | 'nao_alcoolicas' | 'snacks_petiscos' | 'refeicoes' | 'sobremesas' | 'outros'>('alcoolicas');
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

  // Estados do Formulário de Transferência
  const [quantidadeTransferir, setQuantidadeTransferir] = useState('');
  
  // Estados do Formulário de Novo Lote
  const [novoNumeroLote, setNovoNumeroLote] = useState('');
  const [novaValidade, setNovaValidade] = useState('');
  const [novaQtdLote, setNovaQtdLote] = useState('');
  const [novoDestinoLote, setNovoDestinoLote] = useState<'armazem' | 'gondola'>('armazem');

  // Estados do Formulário de Perda/Quebra
  const [quantidadePerda, setQuantidadePerda] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [localPerda, setLocalPerda] = useState<'gondola' | 'armazem'>('gondola');

  useEffect(() => {
    carregarProdutos();
    carregarContextoLoja();
  }, []);

  const carregarContextoLoja = () => {
    try {
      const lojaSalva = localStorage.getItem('agape_loja_selecionada');
      if (lojaSalva) {
        setLojaAtivaInfo(JSON.parse(lojaSalva));
      } else {
        const userSalvo = localStorage.getItem('agape_user');
        if (userSalvo) {
          const user = JSON.parse(userSalvo);
          if (user.loja_atual) setLojaAtivaInfo(user.loja_atual);
        }
      }
    } catch (e) {
      console.warn("Erro ao ler contexto da loja", e);
    }
  };

  const handleLeituraCamera = (codigoLido: string) => {
    setIsCameraScannerOpen(false);
    if (!codigoLido) return;

    if (cameraTarget === 'busca') {
      setTermoBusca(codigoLido);
    } else if (cameraTarget === 'qr_fabrica') {
      setQrCodeTag(codigoLido);
      // Auto detecção GS1
      const match = codigoLido.match(/\/01\/(\d{13,14})/);
      if (match) {
        let gtin = match[1];
        if (gtin.length === 14 && gtin.startsWith('0')) gtin = gtin.substring(1);
        if (!codigoBarras) setCodigoBarras(gtin);
      }
    } else if (cameraTarget === 'ean') {
      setCodigoBarras(codigoLido);
    }
  };

  const carregarProdutos = async () => {
    try {
      const response = await api.get('/produtos/');
      setProdutos(response.data);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
    } finally {
      setLoading(false);
    }
  };

  const salvarNovoProduto = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        nome,
        categoria,
        subcategoria,
        tipo,
        marca,
        preco_custo: parseFloat(precoCusto),
        preco_venda: parseFloat(precoVenda),
        estoque_inicial_armazem: parseInt(estoqueInicialArmazem) || 0,
        estoque_inicial_gondola: parseInt(estoqueInicialGondola) || 0,
        estoque_minimo_gondola: parseInt(minGondola) || 5,
        estoque_minimo_armazem: parseInt(minArmazem) || 15,
        numero_lote_inicial: numeroLoteInicial || "LOTE-001",
        ativo: true
      };
      
      if (descricao) payload.descricao = descricao;
      if (fotoUrl) payload.foto_url = fotoUrl;
      if (codigoBarras) payload.codigo_barras = codigoBarras;
      if (qrCodeTag) payload.qr_code_tag = qrCodeTag;
      if (validadeInicial) payload.data_validade = new Date(validadeInicial).toISOString();

      await api.post('/produtos/', payload);
      setIsModalNovoOpen(false);
      // Limpar formulário
      setNome(''); setCategoria('bebidas'); setSubcategoria('alcoolicas'); setTipo('cervejas'); setMarca('');
      setPrecoCusto(''); setPrecoVenda(''); setCodigoBarras(''); setQrCodeTag('');
      setEstoqueInicialArmazem('0'); setEstoqueInicialGondola('0');
      setDescricao(''); setFotoUrl(''); setValidadeInicial('');
      carregarProdutos();
    } catch (error) {
      alert("Erro ao salvar produto. Verifique os dados.");
      console.error(error);
    }
  };

  const executarTransferenciaGondola = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      await api.post(`/produtos/${produtoSelecionado.id}/transferir-gondola`, {
        quantidade: parseInt(quantidadeTransferir)
      });
      setIsModalTransferirOpen(false);
      setQuantidadeTransferir('');
      setProdutoSelecionado(null);
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao transferir estoque.");
    }
  };

  const salvarNovoLote = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      await api.post(`/produtos/${produtoSelecionado.id}/lotes`, {
        numero_lote: novoNumeroLote,
        data_validade: new Date(novaValidade).toISOString(),
        quantidade: parseInt(novaQtdLote),
        destino: novoDestinoLote,
        preco_custo_unitario: produtoSelecionado.preco_custo
      });
      setIsModalNovoLoteOpen(false);
      setNovoNumeroLote(''); setNovaValidade(''); setNovaQtdLote('');
      // Atualiza o produto selecionado nos lotes
      const res = await api.get(`/produtos/${produtoSelecionado.id}`);
      setProdutoSelecionado(res.data);
      carregarProdutos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao adicionar lote.");
    }
  };

  const registrarPerda = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoSelecionado) return;
    try {
      await api.post(`/produtos/${produtoSelecionado.id}/perdas`, {
        quantidade: parseInt(quantidadePerda),
        motivo: motivoPerda,
        local: localPerda
      });
      setIsModalPerdaOpen(false);
      setQuantidadePerda(''); setMotivoPerda(''); setProdutoSelecionado(null);
      carregarProdutos();
    } catch (error: any) {
      alert(error.response?.data?.detail || "Erro ao registrar perda.");
    }
  };

  // Contadores de Alertas para os Cards
  const totalRepor = produtos.filter(p => p.alerta_reposicao_gondola).length;
  const totalComprar = produtos.filter(p => p.alerta_compra_armazem).length;
  const totalVencendo = produtos.flatMap(p => p.lotes).filter(l => l.status_validade === 'vencendo' || l.status_validade === 'vencido').length;

  // Produtos filtrados por termo de busca ou leitura com câmera
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
    <div className="space-y-6 relative">
      {/* Header Principal com Indicador de Âmbito / Loja Ativa */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Estoque & Armazenagem</h1>
            {lojaAtivaInfo && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-xs font-bold shadow-sm">
                <Building2 size={13} className="text-amber-700" />
                {lojaAtivaInfo.numero_loja ? `Estoque Exclusivo: Loja Nº ${lojaAtivaInfo.numero_loja}` : `Estoque: ${lojaAtivaInfo.nome}`}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Gestão isolada por Loja em 2 níveis (<strong>Armazém / Depósito</strong> e <strong>Display / Gôndola</strong>) com despacho FEFO.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => { setCameraTarget('busca'); setIsCameraScannerOpen(true); }}
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-semibold flex items-center space-x-2 transition-colors text-sm shadow-sm"
            title="Abrir câmera do dispositivo para ler QR Code ou Código de Barras"
          >
            <Camera size={18} className="text-indigo-600" />
            <span>Ler com Câmera</span>
          </button>
          <button 
            onClick={() => setIsModalNovoOpen(true)}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium flex items-center space-x-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} />
            <span>Cadastrar Produto</span>
          </button>
        </div>
      </div>

      {/* Cards de Alertas de Giro e Validade */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-amber-900">{totalRepor}</div>
            <div className="text-xs text-amber-700 font-medium">Itens precisando de Reposição no Display / Gôndola</div>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
            <ShieldAlert size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-rose-900">{totalComprar}</div>
            <div className="text-xs text-rose-700 font-medium">Itens abaixo do Estoque Mínimo de Compra</div>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-indigo-900">{totalVencendo}</div>
            <div className="text-xs text-indigo-700 font-medium">Lotes Próximos do Vencimento ou Vencidos</div>
          </div>
        </div>
      </div>

      {/* Barra de Filtro e Busca Rápida com Câmera */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={termoBusca}
            onChange={e => setTermoBusca(e.target.value)}
            placeholder="Filtrar estoque por nome, código de barras EAN ou QR Code..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {termoBusca && (
          <button 
            onClick={() => setTermoBusca('')}
            className="text-xs text-gray-500 hover:text-gray-800 font-semibold px-2 py-1"
          >
            Limpar
          </button>
        )}
        <button
          type="button"
          onClick={() => { setCameraTarget('busca'); setIsCameraScannerOpen(true); }}
          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          title="Abrir câmera para buscar produto pelo código"
        >
          <Camera size={15} />
          <span>Escanear Código</span>
        </button>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
        {loading ? (
          <div className="p-8 text-center text-gray-500 animate-pulse">Carregando catálogo e posições de estoque...</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Produto</th>
                  <th className="px-6 py-4 font-semibold">Categoria</th>
                  <th className="px-6 py-4 font-semibold">Preços (Custo / Venda)</th>
                  <th className="px-6 py-4 font-semibold text-center">Display / Gôndola</th>
                  <th className="px-6 py-4 font-semibold text-center">Armazém (Depósito)</th>
                  <th className="px-6 py-4 font-semibold text-center">Lotes & FEFO</th>
                  <th className="px-6 py-4 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Package size={48} className="text-gray-300 mb-4" />
                      <p className="text-lg font-medium">
                        {termoBusca ? `Nenhum produto encontrado para "${termoBusca}".` : 'Nenhum produto cadastrado nesta loja.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((produto) => (
                  <tr key={produto.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800 flex items-center space-x-3">
                      {produto.foto_url ? (
                        <img src={produto.foto_url} alt={produto.nome} className="w-10 h-10 rounded-xl object-cover shadow-sm border border-gray-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200"><Package size={20}/></div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900">{produto.nome}</div>
                        {produto.descricao && <div className="text-xs text-gray-400 font-normal">{produto.descricao}</div>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {produto.qr_code_tag && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-mono" title={produto.qr_code_tag}>
                              <QrCode size={11} /> QR Fábrica
                            </span>
                          )}
                          {produto.codigo_barras && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-mono">
                              <Barcode size={11} /> {produto.codigo_barras}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-semibold uppercase tracking-wider">
                          {produto.categoria}
                        </span>
                        <div className="text-xs text-gray-600 font-medium">
                          {produto.subcategoria || ''} {produto.tipo ? `• ${produto.tipo}` : ''}
                        </div>
                        {produto.marca && (
                          <div className="text-[11px] text-gray-500 font-semibold">
                            Marca: {produto.marca}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs text-gray-500">Custo: R$ {produto.preco_custo.toFixed(2)}</div>
                      <div className="font-semibold text-blue-600">Venda: R$ {produto.preco_venda.toFixed(2)}</div>
                    </td>

                    {/* Coluna Gôndola */}
                    <td className="px-6 py-4 text-center">
                      <div className={`font-bold text-base ${produto.quantidade_gondola <= produto.estoque_minimo_gondola ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {produto.quantidade_gondola} un
                      </div>
                      <div className="text-[11px] text-gray-400">Min: {produto.estoque_minimo_gondola}</div>
                      {produto.alerta_reposicao_gondola && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-full">
                          Repor Urgente
                        </span>
                      )}
                    </td>

                    {/* Coluna Armazém */}
                    <td className="px-6 py-4 text-center">
                      <div className={`font-bold text-base ${produto.quantidade_armazem <= produto.estoque_minimo_armazem ? 'text-rose-600' : 'text-gray-700'}`}>
                        {produto.quantidade_armazem} un
                      </div>
                      <div className="text-[11px] text-gray-400">Min: {produto.estoque_minimo_armazem}</div>
                      {produto.alerta_compra_armazem && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-semibold rounded-full">
                          Comprar
                        </span>
                      )}
                    </td>

                    {/* Coluna Lotes */}
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => { setProdutoSelecionado(produto); setIsModalLotesOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Layers size={14} />
                        <span>{produto.lotes.length} {produto.lotes.length === 1 ? 'Lote' : 'Lotes'}</span>
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {produto.quantidade_armazem > 0 && (
                          <button
                            title="Transferir para Gôndola (Reposição FEFO)"
                            onClick={() => { setProdutoSelecionado(produto); setIsModalTransferirOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <ArrowRightLeft size={18} />
                          </button>
                        )}
                        <button
                          title="Ver e Imprimir Etiqueta QR Code"
                          onClick={() => { setProdutoSelecionado(produto); setIsModalQrOpen(true); }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <QrCode size={18} />
                        </button>
                        <button 
                          title="Registrar Quebra/Avaria/Vencido"
                          onClick={() => { setProdutoSelecionado(produto); setIsModalPerdaOpen(true); }}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <AlertTriangle size={18} />
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

      {/* Modal Novo Produto */}
      {isModalNovoOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Cadastrar Produto & Estoque</h3>
              <button onClick={() => setIsModalNovoOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="formNovoProduto" onSubmit={salvarNovoProduto} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Nome do Item</label>
                    <input type="text" required value={nome} onChange={e=>setNome(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Ex: Cerveja Stella Artois 330ml" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Marca</label>
                    <input 
                      type="text" 
                      list="marcas-sugestoes"
                      value={marca} 
                      onChange={e=>setMarca(e.target.value)} 
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      placeholder="Ex: Skol, Heineken, Amstel, Coca-Cola Zero" 
                    />
                    <datalist id="marcas-sugestoes">
                      <option value="Skol" />
                      <option value="Heineken" />
                      <option value="Amstel" />
                      <option value="Budweiser" />
                      <option value="Corona" />
                      <option value="Coca-Cola Zero" />
                      <option value="Coca-Cola Original" />
                      <option value="Fanta Laranja" />
                      <option value="Sukita Uva" />
                      <option value="Guaraná Antarctica" />
                      <option value="Red Bull" />
                      <option value="Monster" />
                      <option value="Minalba" />
                      <option value="Crystal" />
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Categoria (Macro)</label>
                    <select 
                      value={categoria} 
                      onChange={e=>setCategoria(e.target.value as any)} 
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="bebidas">Bebidas</option>
                      <option value="alimentos">Alimentos / Cozinha</option>
                      <option value="tabacos_conveniencia">Tabacaria / Conveniência</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Subcategoria</label>
                    <select 
                      value={subcategoria} 
                      onChange={e=>setSubcategoria(e.target.value as any)} 
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                    >
                      <option value="alcoolicas">Alcoólicas</option>
                      <option value="nao_alcoolicas">Não Alcoólicas</option>
                      <option value="snacks_petiscos">Snacks & Petiscos</option>
                      <option value="refeicoes">Refeições / Pratos</option>
                      <option value="sobremesas">Sobremesas</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Tipo de Produto</label>
                    <input 
                      type="text" 
                      list="tipos-sugestoes"
                      value={tipo} 
                      onChange={e=>setTipo(e.target.value)} 
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                      placeholder="Ex: cervejas" 
                    />
                    <datalist id="tipos-sugestoes">
                      <option value="cervejas" />
                      <option value="aguas_minerais" />
                      <option value="refrigerantes" />
                      <option value="sucos" />
                      <option value="energeticos" />
                      <option value="vinhos" />
                      <option value="destilados" />
                      <option value="drinks_autorais" />
                      <option value="snacks" />
                    </datalist>
                  </div>
                </div>

                {/* Identificação por QR Code de Fábrica e Código de Barras */}
                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode size={16} className="text-purple-600" /> Identificação por Código de Fábrica
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-gray-700 uppercase flex items-center gap-1.5">
                          <QrCode size={14} className="text-purple-600" /> QR Code de Fábrica
                        </label>
                        <button
                          type="button"
                          onClick={() => { setCameraTarget('qr_fabrica'); setIsCameraScannerOpen(true); }}
                          className="px-2 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Camera size={12} /> Câmera QR
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={qrCodeTag} 
                        onChange={e => {
                          const val = e.target.value;
                          setQrCodeTag(val);
                          // Auto-detecção de GTIN/EAN em QR Code GS1 Digital Link
                          const match = val.match(/\/01\/(\d{13,14})/);
                          if (match) {
                            let gtin = match[1];
                            if (gtin.length === 14 && gtin.startsWith('0')) gtin = gtin.substring(1);
                            if (!codigoBarras) setCodigoBarras(gtin);
                          }
                        }} 
                        className="w-full px-3 py-2 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white font-mono text-xs" 
                        placeholder="Bipe ou escaneie o QR impresso na lata..." 
                      />
                      <span className="text-[10px] text-purple-700 mt-1 block">
                        Suporta QR padrão GS1 Digital Link, URLs de fabricantes e códigos seriais.
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-gray-700 uppercase flex items-center gap-1.5">
                          <Barcode size={14} className="text-gray-500" /> Código de Barras (EAN-13 / GTIN)
                        </label>
                        <button
                          type="button"
                          onClick={() => { setCameraTarget('ean'); setIsCameraScannerOpen(true); }}
                          className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-[11px] font-bold flex items-center gap-1 transition-colors"
                        >
                          <Camera size={12} /> Câmera EAN
                        </button>
                      </div>
                      <input 
                        type="text" 
                        value={codigoBarras} 
                        onChange={e=>setCodigoBarras(e.target.value)} 
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white font-mono text-xs" 
                        placeholder="Ex: 7891991000826" 
                      />
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        Preenchido automaticamente ao bipar o QR Code de fábrica com GS1.
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Descrição</label>
                  <input type="text" value={descricao} onChange={e=>setDescricao(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Opcional. Ex: Cerveja puro malte 350ml gelada" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Preço de Custo (R$)</label>
                    <input type="number" step="0.01" required value={precoCusto} onChange={e=>setPrecoCusto(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="5.50" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Preço de Venda (R$)</label>
                    <input type="number" step="0.01" required value={precoVenda} onChange={e=>setPrecoVenda(e.target.value)} className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="12.00" />
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Parâmetros de Estoque Mínimo</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mínimo Gôndola (Geladeira)</label>
                      <input type="number" required value={minGondola} onChange={e=>setMinGondola(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Mínimo Armazém (Depósito)</label>
                      <input type="number" required value={minArmazem} onChange={e=>setMinArmazem(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider block">Lote & Estoque Inicial</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Qtd no Armazém</label>
                      <input type="number" required value={estoqueInicialArmazem} onChange={e=>setEstoqueInicialArmazem(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Qtd na Gôndola</label>
                      <input type="number" required value={estoqueInicialGondola} onChange={e=>setEstoqueInicialGondola(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Identificador do Lote</label>
                      <input type="text" value={numeroLoteInicial} onChange={e=>setNumeroLoteInicial(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Data de Validade</label>
                      <input type="date" value={validadeInicial} onChange={e=>setValidadeInicial(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-white text-sm" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 shrink-0">
              <button type="button" onClick={() => setIsModalNovoOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm">Cancelar</button>
              <button type="submit" form="formNovoProduto" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm shadow-sm">Salvar Produto</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir do Armazém para a Gôndola */}
      {isModalTransferirOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <ArrowRightLeft size={20} /> Repor Gôndola (FEFO)
              </h3>
              <button onClick={() => setIsModalTransferirOpen(false)} className="text-blue-400 hover:text-blue-600"><X size={20} /></button>
            </div>
            <form onSubmit={executarTransferenciaGondola} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Item: <span className="font-bold text-gray-900">{produtoSelecionado.nome}</span>
              </p>
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800">
                Disponível no Armazém: <strong>{produtoSelecionado.quantidade_armazem} un</strong>.
                O sistema aplicará o algoritmo <strong>FEFO</strong> automaticamente, priorizando os lotes que vencem primeiro.
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Quantidade a Transferir</label>
                <input 
                  type="number" 
                  min="1" 
                  max={produtoSelecionado.quantidade_armazem} 
                  required 
                  value={quantidadeTransferir} 
                  onChange={e => setQuantidadeTransferir(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl text-base focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder={`Máx: ${produtoSelecionado.quantidade_armazem}`}
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalTransferirOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold shadow-sm">Confirmar Transferência</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizar / Gerenciar Lotes */}
      {isModalLotesOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Layers size={22} className="text-indigo-600" /> Lotes & Validade (FEFO)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{produtoSelecionado.nome}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsModalNovoLoteOpen(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={16} /> Nova Entrada de Lote
                </button>
                <button onClick={() => setIsModalLotesOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={22} /></button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase">
                    <th className="px-4 py-3 font-semibold">Lote</th>
                    <th className="px-4 py-3 font-semibold">Validade</th>
                    <th className="px-4 py-3 font-semibold text-center">Gôndola</th>
                    <th className="px-4 py-3 font-semibold text-center">Armazém</th>
                    <th className="px-4 py-3 font-semibold text-center">Status FEFO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {produtoSelecionado.lotes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">Nenhum lote ativo.</td>
                    </tr>
                  ) : (
                    produtoSelecionado.lotes.map((lote) => (
                      <tr key={lote.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3.5 font-bold text-gray-800">{lote.numero_lote}</td>
                        <td className="px-4 py-3.5">
                          <div>{new Date(lote.data_validade).toLocaleDateString()}</div>
                          <div className="text-[11px] text-gray-400">{lote.dias_para_vencer} dias restantes</div>
                        </td>
                        <td className="px-4 py-3.5 text-center font-semibold text-emerald-600">{lote.quantidade_gondola} un</td>
                        <td className="px-4 py-3.5 text-center font-semibold text-gray-700">{lote.quantidade_armazem} un</td>
                        <td className="px-4 py-3.5 text-center">
                          {lote.status_validade === 'vencido' && (
                            <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Vencido</span>
                          )}
                          {lote.status_validade === 'vencendo' && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">Vencendo</span>
                          )}
                          {lote.status_validade === 'ok' && (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-medium rounded-full">Válido</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrada de Novo Lote */}
      {isModalNovoLoteOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Plus size={20} /> Nova Entrada de Lote
              </h3>
              <button onClick={() => setIsModalNovoLoteOpen(false)} className="text-indigo-400 hover:text-indigo-600"><X size={20} /></button>
            </div>
            <form onSubmit={salvarNovoLote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Número do Lote</label>
                <input 
                  type="text" 
                  required 
                  value={novoNumeroLote} 
                  onChange={e => setNovoNumeroLote(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Ex: LOTE-2026-X8"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Data de Validade</label>
                <input 
                  type="date" 
                  required 
                  value={novaValidade} 
                  onChange={e => setNovaValidade(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={novaQtdLote} 
                    onChange={e => setNovaQtdLote(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="24"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Destino Inicial</label>
                  <select 
                    value={novoDestinoLote} 
                    onChange={e => setNovoDestinoLote(e.target.value as any)}
                    className="w-full px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="armazem">Armazém (Depósito)</option>
                    <option value="gondola">Gôndola (Geladeira)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalNovoLoteOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-sm font-semibold shadow-sm">Registrar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Perda/Quebra */}
      {isModalPerdaOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-orange-50">
              <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2"><AlertTriangle size={20}/> Registrar Perda</h3>
              <button onClick={() => setIsModalPerdaOpen(false)} className="text-orange-400 hover:text-orange-600"><X size={24} /></button>
            </div>
            <form onSubmit={registrarPerda} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">Produto: <span className="font-bold text-gray-800">{produtoSelecionado.nome}</span></p>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Local da Ocorrência</label>
                <select 
                  value={localPerda} 
                  onChange={e => setLocalPerda(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
                >
                  <option value="gondola">Gôndola (Geladeira / Salão)</option>
                  <option value="armazem">Armazém (Depósito)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Quantidade</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={quantidadePerda} 
                  onChange={e=>setQuantidadePerda(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm" 
                  placeholder="Ex: 1" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Motivo</label>
                <textarea 
                  required 
                  value={motivoPerda} 
                  onChange={e=>setMotivoPerda(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm" 
                  placeholder="Ex: Garrafa caiu, ou produto vencido descartado" 
                  rows={3}
                ></textarea>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalPerdaOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-medium text-sm">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium text-sm">Registrar Baixa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizar e Imprimir Etiqueta QR Code BipFy */}
      {isModalQrOpen && produtoSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col items-center p-6 text-center">
            <div className="w-full flex justify-between items-center mb-4">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Etiqueta Oficial BipFy</span>
              <button onClick={() => setIsModalQrOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {/* Cartão de Etiqueta Imprimível */}
            <div id="etiqueta-print" className="p-6 bg-white border-2 border-dashed border-gray-300 rounded-2xl w-full flex flex-col items-center">
              <h4 className="font-extrabold text-gray-900 text-lg leading-tight mb-1">{produtoSelecionado.nome}</h4>
              <p className="text-xs text-gray-500 mb-4">{produtoSelecionado.categoria}</p>

              <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm mb-4">
                <QRCode 
                  value={produtoSelecionado.qr_code_tag || `BIPFY-P${produtoSelecionado.id}`} 
                  size={150} 
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 256 256"
                />
              </div>

              <div className="text-2xl font-black text-blue-600 mb-1">
                R$ {produtoSelecionado.preco_venda.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-gray-400">
                TAG: {produtoSelecionado.qr_code_tag || `BIPFY-P${produtoSelecionado.id}`}
              </div>
              {produtoSelecionado.codigo_barras && (
                <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                  EAN: {produtoSelecionado.codigo_barras}
                </div>
              )}
            </div>

            <div className="mt-6 flex w-full gap-2">
              <button 
                type="button" 
                onClick={() => setIsModalQrOpen(false)} 
                className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium"
              >
                Fechar
              </button>
              <button 
                type="button" 
                onClick={() => window.print()} 
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
              >
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Leitor de QR Code / Código de Barras com Câmera */}
      <LeitorQrCameraModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={handleLeituraCamera}
        titulo={
          cameraTarget === 'busca'
            ? 'Escanear Produto (Buscar no Estoque)'
            : cameraTarget === 'qr_fabrica'
            ? 'Escanear QR Code de Fábrica'
            : 'Escanear Código de Barras (EAN-13)'
        }
        subtitulo="Aponte a câmera do dispositivo para o código na lata, garrafa ou embalagem."
      />

    </div>
  );
}
