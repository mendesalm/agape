import { useEffect, useState, useRef, type FormEvent, type KeyboardEvent } from 'react';
import { api } from '../services/api';
import { 
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
  RotateCcw
} from 'lucide-react';

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

  // Refs para focar automaticamente nos inputs de leitor de código
  const inputCartaoRef = useRef<HTMLInputElement>(null);
  const inputProdutoRef = useRef<HTMLInputElement>(null);

  // Estados dos Modais
  const [isModalNovaOpen, setIsModalNovaOpen] = useState(false);
  const [comandaSelecionada, setComandaSelecionada] = useState<Comanda | null>(null);

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
      const [respComandas, respProdutos] = await Promise.all([
        api.get('/comandas/'),
        api.get('/produtos/')
      ]);
      setComandas(respComandas.data);
      setProdutos(respProdutos.data);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  // Associação de Cartão Coringa Reutilizável (Opção B - Balcão)
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

  // 1. Identificação do Cliente no Balcão (por Cartão RFID / QR Code / CPF)
  const handleIdentificarClienteBalcao = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const termo = cartaoClienteInput.trim();
    if (!termo) return;

    try {
      const res = await api.post('/comandas/identificar-cartao', {
        identificador_cartao: termo
      });
      setComandaBalcaoAtiva(res.data);
      setSucessoFeedback(`Cliente identificado: ${res.data.nome_cliente || res.data.identificador_cartao}`);
      setTimeout(() => setSucessoFeedback(null), 3000);
      
      // Passa o foco para o leitor de produtos
      setTimeout(() => inputProdutoRef.current?.focus(), 150);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao identificar cliente.");
    }
  };

  // 2. Bipagem do Produto no Balcão (por Código de Barras EAN ou Tag QR Code)
  const handleBiparProdutoBalcao = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const codigo = codigoProdutoInput.trim();
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

  // 3. Conferência na Frente do Cliente & Confirmação com ENTER (Pós-Pago)
  const handleConfirmarVendaBalcao = async () => {
    if (!comandaBalcaoAtiva || !produtoConferencia) return;

    try {
      await api.post(`/comandas/${comandaBalcaoAtiva.id}/itens`, {
        produto_id: produtoConferencia.id,
        quantidade: qtdConferencia
      });

      // Recarrega a comanda ativa para atualizar o saldo
      const res = await api.get(`/comandas/${comandaBalcaoAtiva.id}`);
      setComandaBalcaoAtiva(res.data);
      
      const msg = `${qtdConferencia}x ${produtoConferencia.nome} lançado na conta de ${res.data.nome_cliente || res.data.identificador_cartao}!`;
      setSucessoFeedback(msg);
      setTimeout(() => setSucessoFeedback(null), 4000);

      // Limpa a conferência e volta o foco para o próximo produto
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
    setCartaoClienteInput('');
    setProdutoConferencia(null);
    setQtdConferencia(1);
    setTimeout(() => inputCartaoRef.current?.focus(), 100);
  };

  // Modal Tradicional Nova Comanda
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

  const getProdutoNome = (id: number) => {
    const prod = produtos.find(p => p.id === id);
    return prod ? prod.nome : `Produto #${id}`;
  };

  return (
    <div className="space-y-6" onKeyDown={handleKeyDownBalcao}>
      
      {/* Barra de Controle de Modos */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="text-blue-600 w-8 h-8" />
            Comandas & PDV Balcão
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Atendimento presencial no balcão com identificação do cliente por QR/Cartão ou gestão por mesas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ações de Cartão Coringa (Visitantes) */}
          <button
            onClick={() => setIsModalAssociarCoringaOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <UserPlus size={15} />
            <span>Entregar Cartão Coringa</span>
          </button>

          <button
            onClick={() => setIsModalDevolverCoringaOpen(true)}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={15} />
            <span>Devolver Cartão</span>
          </button>

          <div className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            <button 
              onClick={() => { setModoBalcaoRapido(true); setTimeout(() => inputCartaoRef.current?.focus(), 150); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${modoBalcaoRapido ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <Zap size={14} className="text-amber-500" />
              Balcão Rápido
            </button>
            <button 
              onClick={() => setModoBalcaoRapido(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${!modoBalcaoRapido ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <ClipboardList size={14} />
              Mesas
            </button>
          </div>
        </div>
      </div>

      {/* FEEDBACK FLUTUANTE */}
      {sucessoFeedback && (
        <div className="bg-emerald-500 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-semibold animate-bounce">
          <Check size={18} /> {sucessoFeedback}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO 1: BALCÃO RÁPIDO (OPERADOR BIPA CARTÃO DO CLIENTE + PRODUTO) */}
      {/* ============================================================== */}
      {modoBalcaoRapido && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Lado Esquerdo: Área Operacional de Bipagem */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* ETAPA 1: Identificar o Cliente / Destinatário */}
            <div className={`p-6 rounded-2xl border transition-all ${comandaBalcaoAtiva ? 'bg-white border-emerald-200 ring-2 ring-emerald-500/20' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={16} className="text-blue-600" /> Passo 1: Destinatário da Venda
                </span>
                {comandaBalcaoAtiva && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
                    <Check size={14} /> Cliente Ativo
                  </span>
                )}
              </div>

              {!comandaBalcaoAtiva ? (
                <form onSubmit={handleIdentificarClienteBalcao} className="flex gap-2">
                  <div className="relative flex-1">
                    <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      ref={inputCartaoRef}
                      type="text" 
                      value={cartaoClienteInput} 
                      onChange={e => setCartaoClienteInput(e.target.value)}
                      placeholder="Bipe o Cartão QR Code ou digite o CPF do cliente..."
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                      autoFocus
                    />
                  </div>
                  <button type="submit" className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm flex items-center gap-1.5">
                    <span>Identificar</span>
                    <ArrowRight size={16} />
                  </button>
                </form>
              ) : (
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <h3 className="font-extrabold text-lg text-gray-900">{comandaBalcaoAtiva.nome_cliente || 'Cliente Identificado'}</h3>
                    <p className="text-xs text-gray-500">
                      Cartão/Tag: <span className="font-mono font-semibold">{comandaBalcaoAtiva.identificador_cartao || `#${comandaBalcaoAtiva.id}`}</span> • Comanda #{comandaBalcaoAtiva.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs text-gray-400 uppercase">Gasto Acumulado</div>
                      <div className="font-black text-xl text-blue-600">R$ {(comandaBalcaoAtiva.total || 0).toFixed(2)}</div>
                    </div>
                    <button 
                      onClick={finalizarAtendimentoBalcao}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold"
                    >
                      Trocar Cliente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ETAPA 2 & 3: Bipagem do Produto e Conferência */}
            <div className={`p-6 rounded-2xl border bg-white ${!comandaBalcaoAtiva ? 'opacity-50 pointer-events-none border-gray-200' : 'border-blue-200 shadow-sm'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode size={16} className="text-purple-600" /> Passo 2: Bipar QR Code de Fábrica ou Código de Barras
                </span>
                <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium">Lata / Garrafa / Embalagem</span>
              </div>

              <form onSubmit={handleBiparProdutoBalcao} className="flex gap-2 mb-6">
                <div className="relative flex-1">
                  <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    ref={inputProdutoRef}
                    type="text" 
                    value={codigoProdutoInput} 
                    onChange={e => setCodigoProdutoInput(e.target.value)}
                    placeholder="Bipe o QR Code de fábrica ou código de barras da lata..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 text-base font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-inner font-mono text-sm"
                    disabled={!comandaBalcaoAtiva}
                  />
                </div>
                <button type="submit" disabled={!comandaBalcaoAtiva} className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-sm">
                  Buscar
                </button>
              </form>

              {/* Card de Conferência na Frente do Cliente */}
              {produtoConferencia ? (
                <div className="p-5 bg-blue-50/70 border-2 border-blue-400 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-100 px-2 py-0.5 rounded-full">
                        Conferir com o Cliente
                      </span>
                      <h3 className="text-2xl font-black text-gray-900 mt-1">{produtoConferencia.nome}</h3>
                      <p className="text-xs text-gray-500">{produtoConferencia.marca ? `Marca: ${produtoConferencia.marca} • ` : ''}Preço Unitário: R$ {produtoConferencia.preco_venda.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Subtotal</span>
                      <div className="text-3xl font-extrabold text-blue-700">
                        R$ {(produtoConferencia.preco_venda * qtdConferencia).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700">Quantidade:</span>
                      <div className="flex items-center border border-gray-300 rounded-xl bg-white overflow-hidden">
                        <button 
                          type="button" 
                          onClick={() => setQtdConferencia(Math.max(1, qtdConferencia - 1))}
                          className="px-3 py-1.5 hover:bg-gray-100 text-base font-bold text-gray-700"
                        >-</button>
                        <span className="px-4 py-1.5 font-bold text-base text-gray-900">{qtdConferencia}</span>
                        <button 
                          type="button" 
                          onClick={() => setQtdConferencia(qtdConferencia + 1)}
                          className="px-3 py-1.5 hover:bg-gray-100 text-base font-bold text-gray-700"
                        >+</button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        type="button" 
                        onClick={() => setProdutoConferencia(null)}
                        className="px-4 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl text-sm font-semibold"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="button" 
                        onClick={handleConfirmarVendaBalcao}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-md shadow-emerald-500/20"
                      >
                        <span>Confirmar Saída [Enter]</span>
                        <Check size={18} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 text-center italic">
                    Ao confirmar, a cerveja é liberada imediatamente. O cliente <strong>não precisa pagar nesta hora</strong> (pós-pago na comanda).
                  </p>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400">
                  <Barcode className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-medium">Aguardando bipagem do produto no leitor...</p>
                </div>
              )}
            </div>
          </div>

          {/* Lado Direito: Histórico da Comanda do Cliente em Tempo Real */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full min-h-[450px]">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Itens Consumidos na Conta</h3>
                <p className="text-xs text-gray-400">Extrato atualizado da comanda ativa</p>
              </div>
              {comandaBalcaoAtiva && (
                <button 
                  onClick={() => fecharComanda(comandaBalcaoAtiva.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold"
                >
                  Encerrar Conta
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {!comandaBalcaoAtiva ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center py-16">
                  <CreditCard className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm font-medium">Nenhum cliente ativo no momento.</p>
                  <p className="text-xs text-gray-400">Bipe o cartão na etapa 1 para abrir a conta.</p>
                </div>
              ) : comandaBalcaoAtiva.itens.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center py-16">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mb-2" />
                  <p className="text-sm font-medium">Comanda vazia.</p>
                  <p className="text-xs text-gray-400">Bipe produtos para registrar os consumos.</p>
                </div>
              ) : (
                comandaBalcaoAtiva.itens.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{item.quantidade}x {item.produto_nome || getProdutoNome(item.produto_id)}</div>
                      <div className="text-[11px] text-gray-400">R$ {item.valor_unitario.toFixed(2)} cada</div>
                    </div>
                    <div className="font-black text-gray-900 text-sm">
                      R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                    </div>
                  </div>
                ))
              )}
            </div>

            {comandaBalcaoAtiva && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <span className="font-bold text-gray-600">Total Acumulado:</span>
                <span className="font-black text-2xl text-blue-600">R$ {(comandaBalcaoAtiva.total || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO 2: VISÃO GERAL DE MESAS E COMANDAS (VISÃO CONVENCIONAL) */}
      {/* ============================================================== */}
      {!modoBalcaoRapido && (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-14rem)] gap-6">
          {/* Coluna Esquerda: Lista de Comandas */}
          <div className="w-full lg:w-1/2 flex flex-col border-r border-gray-200 pr-6 h-full">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="font-bold text-xl text-gray-800">Contas Abertas</h2>
              <button 
                onClick={() => setIsModalNovaOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={16} /> Abrir Conta
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {loading ? (
                <div className="text-center text-gray-400 py-10">Carregando comandas...</div>
              ) : comandas.length === 0 ? (
                <div className="text-center text-gray-400 py-10">Nenhuma comanda aberta.</div>
              ) : (
                comandas.map(comanda => (
                  <div 
                    key={comanda.id}
                    onClick={() => setComandaSelecionada(comanda)}
                    className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${comandaSelecionada?.id === comanda.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="text-blue-500" size={18} />
                        <span className="font-bold text-gray-900">{comanda.identificador_cartao || `Mesa #${comanda.id}`}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${comanda.status === 'ABERTA' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                        {comanda.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-gray-500">
                        Cliente: {comanda.nome_cliente || 'Anônimo'} <br/>
                        Abertura: {new Date(comanda.data_abertura).toLocaleTimeString()}
                      </div>
                      <div className="text-lg font-black text-gray-900">
                        R$ {(comanda.total || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Coluna Direita: Detalhes da Comanda Selecionada */}
          <div className="w-full lg:w-1/2 flex flex-col h-full bg-gray-50 rounded-2xl p-6 border border-gray-200">
            {comandaSelecionada ? (
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-black text-gray-900">{comandaSelecionada.identificador_cartao || `Mesa #${comandaSelecionada.id}`}</h3>
                    <p className="text-xs text-gray-500">{comandaSelecionada.nome_cliente || 'Cliente Balcão'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Total da Conta</span>
                    <div className="text-2xl font-black text-blue-600">R$ {(comandaSelecionada.total || 0).toFixed(2)}</div>
                  </div>
                </div>

                {comandaSelecionada.status === 'ABERTA' && (
                  <form onSubmit={adicionarItemManual} className="flex gap-2 mb-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                    <select 
                      required
                      value={produtoSelecionadoId} 
                      onChange={e => setProdutoSelecionadoId(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm bg-white outline-none"
                    >
                      <option value="" disabled>Selecione um Produto...</option>
                      {produtos.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} - R$ {p.preco_venda.toFixed(2)}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      min="1" 
                      required 
                      value={quantidadeItem} 
                      onChange={e=>setQuantidadeItem(e.target.value)} 
                      className="w-16 px-2 py-2 border rounded-lg text-sm text-center" 
                    />
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm">
                      Lançar
                    </button>
                  </form>
                )}

                <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-inner mb-4">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 font-semibold text-gray-600">
                      <tr>
                        <th className="p-3">Qtd</th>
                        <th className="p-3">Produto</th>
                        <th className="p-3 text-right">V. Unit</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comandaSelecionada.itens.map((it, i) => (
                        <tr key={i}>
                          <td className="p-3 font-bold">{it.quantidade}x</td>
                          <td className="p-3">{it.produto_nome || getProdutoNome(it.produto_id)}</td>
                          <td className="p-3 text-right text-gray-500">R$ {it.valor_unitario.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold text-gray-900">R$ {(it.quantidade * it.valor_unitario).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {comandaSelecionada.status === 'ABERTA' && (
                  <button 
                    onClick={() => fecharComanda(comandaSelecionada.id)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle size={18} /> Encerrar Comanda e Registrar Receita
                  </button>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <ClipboardList className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm font-medium">Selecione uma comanda ao lado para visualizar.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Comanda */}
      {isModalNovaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Abrir Nova Conta / Mesa</h3>
              <button onClick={() => setIsModalNovaOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={abrirNovaComanda} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Identificador (Nº Mesa ou Cartão)</label>
                <input type="text" required value={identificadorCartao} onChange={e=>setIdentificadorCartao(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: MESA-04 ou CARTAO-88" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Nome do Cliente (Opcional)</label>
                <input type="text" value={nomeCliente} onChange={e=>setNomeCliente(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: João Silva" />
              </div>
              
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalNovaOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-sm">Abrir Conta</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Associar Cartão Coringa Reutilizável (Opção B - Visitante) */}
      {isModalAssociarCoringaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-indigo-50/50">
              <div>
                <h3 className="text-lg font-extrabold text-indigo-950 flex items-center gap-2">
                  <UserPlus className="text-indigo-600" size={20} />
                  Entregar Cartão Coringa Reutilizável
                </h3>
                <p className="text-xs text-indigo-600/80">Opção B: Cliente sem cadastro no app que usará cartão temporário do bar.</p>
              </div>
              <button onClick={() => setIsModalAssociarCoringaOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAssociarCoringa} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bipar ou Digitar Código do Cartão *</label>
                <input 
                  type="text" 
                  required 
                  value={coringaCodigo} 
                  onChange={e=>setCoringaCodigo(e.target.value)} 
                  className="w-full px-3.5 py-2.5 border border-indigo-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30 font-mono font-bold" 
                  placeholder="Ex: CARD-001 ou bipe a tag RFID/QR"
                  autoFocus 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">CPF do Cliente * (Obrigatório para multitenant)</label>
                <input 
                  type="text" 
                  required 
                  value={coringaCpf} 
                  onChange={e=>setCoringaCpf(e.target.value)} 
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="000.000.000-00" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo *</label>
                <input 
                  type="text" 
                  required 
                  value={coringaNome} 
                  onChange={e=>setCoringaNome(e.target.value)} 
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="Nome do visitante" 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Telefone (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={coringaTelefone} 
                    onChange={e=>setCoringaTelefone(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                  <input 
                    type="email" 
                    value={coringaEmail} 
                    onChange={e=>setCoringaEmail(e.target.value)} 
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="email@exemplo.com" 
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                O cartão ficará vinculado ao CPF deste cliente durante toda a sua estadia. Ao final do expediente ou saída, o cliente devolve o cartão e o operador faz a desassociação segura.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalAssociarCoringaOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm">
                  Associar e Ativar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Devolver Cartão Coringa (Check-out) */}
      {isModalDevolverCoringaOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-amber-50/50">
              <div>
                <h3 className="text-lg font-extrabold text-amber-950 flex items-center gap-2">
                  <RotateCcw className="text-amber-600" size={20} />
                  Devolução de Cartão (Check-out)
                </h3>
                <p className="text-xs text-amber-600/80">Libera o cartão físico para a gaveta mantendo o histórico de auditoria.</p>
              </div>
              <button onClick={() => setIsModalDevolverCoringaOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <form onSubmit={handleDevolverCoringa} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Bipar ou Digitar Código do Cartão</label>
                <input 
                  type="text" 
                  required 
                  value={devolverCodigoCartao} 
                  onChange={e=>setDevolverCodigoCartao(e.target.value)} 
                  className="w-full px-3.5 py-2.5 border border-amber-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50/30 font-mono font-bold" 
                  placeholder="Ex: CARD-001"
                  autoFocus 
                />
              </div>

              <p className="text-[11px] text-gray-500">
                Ao confirmar, a comanda do cliente será finalizada, o vínculo será desativado com data/hora registradas e o cartão voltará ao status <strong>DISPONÍVEL</strong>.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalDevolverCoringaOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-medium">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm">
                  Confirmar Devolução
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
