import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  Barcode, 
  Check, 
  Plus, 
  Minus, 
  CreditCard, 
  RefreshCw, 
  AlertCircle,
  RotateCcw,
  Sparkles,
  Undo2,
  Trash2,
  ShoppingCart
} from 'lucide-react';
import { api } from '../services/api';

/**
 * Interface do item da comanda retornado pelo backend
 */
interface ItemComanda {
  id: number;
  produto_id: number;
  produto_nome?: string;
  quantidade: number;
  valor_unitario: number;
  status?: string;
}

/**
 * Interface da comanda
 */
interface Comanda {
  id: number;
  cliente_id?: number;
  operador_id?: number;
  nome_cliente?: string;
  cliente_cim?: string;
  cliente_foto?: string;
  identificador_cartao?: string;
  status: 'ABERTA' | 'FECHADA' | 'CANCELADA';
  data_abertura: string;
  total?: number;
  itens: ItemComanda[];
}

/**
 * Interface de produto cadastrado no Bar
 */
interface Produto {
  id: number;
  nome: string;
  preco_venda: number;
  quantidade_gondola?: number;
  quantidade_estoque: number;
  codigo_barras?: string;
  qr_code_tag?: string;
  marca?: string;
  foto_url?: string;
}

interface PdvMobileScannerModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoSolicitarFechamento: (comanda: Comanda) => void;
  aoAtualizarDadosGerais?: () => void;
}

/**
 * Emite um bipe sonoro simulando leitor de código de barras profissional
 */
const emitirBeepSonoro = (sucesso = true) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(sucesso ? 1200 : 400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (sucesso ? 0.1 : 0.25));

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (sucesso ? 0.1 : 0.25));
  } catch {
    // Silencioso se bloqueado pelo navegador
  }
};

/**
 * Renderiza o avatar do Irmão com foto (se disponível) ou monograma/iniciais
 */
const renderAvatarIrmao = (nome?: string, fotoUrl?: string) => {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome || 'Irmão'}
        className="w-10 h-10 rounded-xl object-cover border border-[#10B981]/50 shrink-0"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  const iniciais = nome
    ? nome
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0].toUpperCase())
        .join('')
    : 'IR';
  return (
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981]/20 to-[#0B1326] border border-[#10B981]/40 text-[#4EDEA3] flex items-center justify-center font-extrabold text-xs shrink-0 tracking-wider font-mono">
      {iniciais}
    </div>
  );
};

/**
 * Componente PDV Mobile Scanner Contínuo (Design System: Tactile Velocity)
 * 100% responsivo, simétrico e à prova de cliques acidentais.
 */
export const PdvMobileScannerModal: React.FC<PdvMobileScannerModalProps> = ({
  aberto,
  aoFechar,
  aoSolicitarFechamento,
  aoAtualizarDadosGerais
}) => {
  // Estados do Fluxo Operacional
  const [passo, setPasso] = useState<'CLIENTE' | 'PRODUTO'>('CLIENTE');
  const [comandaAtiva, setComandaAtiva] = useState<Comanda | null>(null);
  const [produtoConferencia, setProdutoConferencia] = useState<Produto | null>(null);
  const [qtdConferencia, setQtdConferencia] = useState<number>(1);
  const [ultimoItemBipado, setUltimoItemBipado] = useState<{ id: number; nome: string; valor: number; qtd: number } | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState<'SCANNER' | 'CARRINHO'>('SCANNER');

  // Estados de Interface e Câmera
  const [carregandoAcao, setCarregandoAcao] = useState<boolean>(false);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [tipoAlerta, setTipoAlerta] = useState<'sucesso' | 'erro' | 'info'>('info');
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState<number>(0);

  // Refs de controle de ciclo de leitura
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausadoRef = useRef<boolean>(false);
  const passoRef = useRef<'CLIENTE' | 'PRODUTO'>('CLIENTE');
  const comandaAtivaRef = useRef<Comanda | null>(null);
  const containerId = 'agape-pdv-camera-viewport';

  useEffect(() => {
    passoRef.current = passo;
  }, [passo]);

  useEffect(() => {
    comandaAtivaRef.current = comandaAtiva;
  }, [comandaAtiva]);

  /**
   * Encerra com segurança o hardware da câmera
   */
  const pararScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch {
        // Ignora erros ao parar
      }
      scannerRef.current = null;
    }
  };

  /**
   * Inicialização da Câmera
   */
  useEffect(() => {
    if (!aberto || modoVisualizacao === 'CARRINHO') {
      pararScanner();
      return;
    }

    let cancelado = false;
    pausadoRef.current = false;
    setErroCamera(null);

    const iniciarCamera = async () => {
      try {
        await pararScanner();
        if (cancelado) return;

        const elemento = document.getElementById(containerId);
        if (!elemento) return;

        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        let listaCameras: { id: string; label: string }[] = [];
        try {
          listaCameras = await Html5Qrcode.getCameras();
          if (!cancelado && listaCameras.length > 0) {
            setCameras(listaCameras);
          }
        } catch {
          // Fallback facingMode
        }

        const config = {
          fps: 16,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        };

        const onScanSuccess = (codigoLido: string) => {
          if (pausadoRef.current || !codigoLido) return;
          processarCodigo(codigoLido.trim());
        };

        if (listaCameras.length > 0) {
          let idxEscolhido = cameraIdx % listaCameras.length;
          if (cameraIdx === 0 && listaCameras.length > 1) {
            const backIdx = listaCameras.findIndex((c) =>
              /back|traseira|rear|environment/i.test(c.label)
            );
            if (backIdx >= 0) idxEscolhido = backIdx;
          }
          await scanner.start(listaCameras[idxEscolhido].id, config, onScanSuccess, () => {});
        } else {
          await scanner.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
        }
      } catch (err: unknown) {
        if (!cancelado) {
          const msg = err instanceof Error ? err.message : String(err);
          setErroCamera(`Não foi possível iniciar a câmera: ${msg}. Verifique as permissões.`);
        }
      }
    };

    iniciarCamera();

    return () => {
      cancelado = true;
      pararScanner();
    };
  }, [aberto, cameraIdx, modoVisualizacao]);

  /**
   * Dispara feedback sonoro e tátil
   */
  const dispararFeedback = (sucesso = true) => {
    emitirBeepSonoro(sucesso);
    try {
      if (navigator.vibrate) {
        navigator.vibrate(sucesso ? 80 : [100, 50, 100]);
      }
    } catch {
      // Ignora erro em browsers sem suporte
    }
  };

  /**
   * Processador de códigos escaneados
   */
  const processarCodigo = async (codigo: string) => {
    if (!codigo) return;
    pausadoRef.current = true;
    dispararFeedback(true);

    const passoAtual = passoRef.current;
    const comandaAtual = comandaAtivaRef.current;

    if (passoAtual === 'CLIENTE') {
      // Trava de segurança: impede que código de barras de produto seja lido como cliente
      if (/^(\d{13}|HEIN|COCA|AGUA|PROD)/i.test(codigo.trim())) {
        dispararFeedback(false);
        setMensagemStatus("Código de PRODUTO detectado! Aponte primeiro para o QR do Irmão.");
        setTipoAlerta('erro');
        setTimeout(() => {
          setMensagemStatus(null);
          pausadoRef.current = false;
        }, 2500);
        return;
      }

      setCarregandoAcao(true);
      setMensagemStatus(`Identificando Irmão / Cartão...`);
      setTipoAlerta('info');

      try {
        const res = await api.post('/comandas/identificar-cartao', {
          identificador_cartao: codigo
        });
        const comandaRecebida: Comanda = res.data;
        setComandaAtiva(comandaRecebida);
        setPasso('PRODUTO');
        setMensagemStatus(`Identificado: Ir.'. ${comandaRecebida.nome_cliente || comandaRecebida.identificador_cartao}`);
        setTipoAlerta('sucesso');

        if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();

        setTimeout(() => {
          setMensagemStatus(null);
          pausadoRef.current = false;
        }, 800);
      } catch (err: any) {
        dispararFeedback(false);
        const erroMsg = err.response?.data?.detail || "Cartão/Cliente não identificado. Tente novamente.";
        setMensagemStatus(erroMsg);
        setTipoAlerta('erro');
        setTimeout(() => {
          setMensagemStatus(null);
          pausadoRef.current = false;
        }, 2200);
      } finally {
        setCarregandoAcao(false);
      }
    } else {
      if (!comandaAtual) {
        setPasso('CLIENTE');
        pausadoRef.current = false;
        return;
      }

      setCarregandoAcao(true);
      setMensagemStatus(`Consultando produto...`);
      setTipoAlerta('info');

      try {
        const res = await api.get(`/produtos/codigo/${encodeURIComponent(codigo)}`);
        const produto: Produto = res.data;
        setProdutoConferencia(produto);
        setQtdConferencia(1);
        setMensagemStatus(null);
      } catch (err: any) {
        dispararFeedback(false);
        const erroMsg = err.response?.data?.detail || `Produto não cadastrado para o código lido.`;
        setMensagemStatus(erroMsg);
        setTipoAlerta('erro');
        setTimeout(() => {
          setMensagemStatus(null);
          pausadoRef.current = false;
        }, 2000);
      } finally {
        setCarregandoAcao(false);
      }
    }
  };

  /**
   * Adiciona o produto na comanda e reativa a câmera
   */
  const handleAdicionarEBiparProximo = async (irParaCarrinho = false) => {
    if (!comandaAtiva || !produtoConferencia) return;

    setCarregandoAcao(true);
    try {
      await api.post(`/comandas/${comandaAtiva.id}/itens`, {
        produto_id: produtoConferencia.id,
        quantidade: qtdConferencia
      });

      const res = await api.get(`/comandas/${comandaAtiva.id}`);
      const comandaAtualizada: Comanda = res.data;
      setComandaAtiva(comandaAtualizada);

      // Encontra o item recém-inserido para permitir o botão 'Anular' imediato
      const ultimoItem = comandaAtualizada.itens?.slice(-1)[0];
      if (ultimoItem) {
        setUltimoItemBipado({
          id: ultimoItem.id,
          nome: produtoConferencia.nome,
          valor: produtoConferencia.preco_venda,
          qtd: qtdConferencia
        });
      }

      dispararFeedback(true);
      setMensagemStatus(`+${qtdConferencia}x ${produtoConferencia.nome} lançado com sucesso!`);
      setTipoAlerta('sucesso');

      if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();

      setProdutoConferencia(null);
      setQtdConferencia(1);

      if (irParaCarrinho) {
        setModoVisualizacao('CARRINHO');
      } else {
        setTimeout(() => {
          setMensagemStatus(null);
          pausadoRef.current = false;
        }, 700);
      }
    } catch (err: any) {
      dispararFeedback(false);
      alert(err.response?.data?.detail || "Erro ao adicionar item à comanda.");
      pausadoRef.current = false;
    } finally {
      setCarregandoAcao(false);
    }
  };

  /**
   * Estorna / Anula o último item bipado diretamente da tela do leitor
   */
  const handleAnularUltimoBipado = async () => {
    if (!comandaAtiva || !ultimoItemBipado) return;
    setCarregandoAcao(true);
    try {
      const res = await api.delete(`/comandas/${comandaAtiva.id}/itens/${ultimoItemBipado.id}`);
      setComandaAtiva(res.data);
      setUltimoItemBipado(null);
      dispararFeedback(true);
      setMensagemStatus(`Item estornado com sucesso.`);
      setTipoAlerta('info');
      if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();
      setTimeout(() => setMensagemStatus(null), 2000);
    } catch (err: any) {
      dispararFeedback(false);
      alert(err.response?.data?.detail || "Erro ao anular item.");
    } finally {
      setCarregandoAcao(false);
    }
  };

  /**
   * Remove item a partir da visualização de carrinho
   */
  const handleRemoverItemCarrinho = async (itemId: number) => {
    if (!comandaAtiva) return;
    setCarregandoAcao(true);
    try {
      const res = await api.delete(`/comandas/${comandaAtiva.id}/itens/${itemId}`);
      setComandaAtiva(res.data);
      dispararFeedback(true);
      if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao remover item.");
    } finally {
      setCarregandoAcao(false);
    }
  };

  const handleTrocarCliente = () => {
    setComandaAtiva(null);
    setProdutoConferencia(null);
    setUltimoItemBipado(null);
    setPasso('CLIENTE');
    setModoVisualizacao('SCANNER');
    pausadoRef.current = false;
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1326] text-white flex flex-col font-sans select-none overflow-hidden animate-fadeIn">
      
      {/* ============================================================== */}
      {/* TOPO: STATUS DO TERMINAL, IDENTIFICAÇÃO E CONTROLES DE CÂMERA   */}
      {/* ============================================================== */}
      <header className="px-4 py-3 bg-[#131B2E] border-b border-[#334155] flex items-center justify-between shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {comandaAtiva ? (
            renderAvatarIrmao(comandaAtiva.nome_cliente, comandaAtiva.cliente_foto)
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-[#38BDF8] shrink-0 font-mono">
              PDV
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] flex items-center gap-1 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                {comandaAtiva ? 'Comanda Ativa' : 'Check-in do Irmão'}
              </span>
              {comandaAtiva?.cliente_cim && (
                <span className="text-[10px] text-slate-400 font-mono">
                  CIM: {comandaAtiva.cliente_cim}
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
              {comandaAtiva?.nome_cliente ? `Ir.'. ${comandaAtiva.nome_cliente}` : 'Aponte para o QR do Irmão'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {cameras.length > 1 && modoVisualizacao === 'SCANNER' && (
            <button
              onClick={() => setCameraIdx((prev) => prev + 1)}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-slate-300 border border-[#334155] flex items-center justify-center transition-colors cursor-pointer"
              title="Trocar Câmera"
            >
              <RefreshCw size={18} />
            </button>
          )}

          <button
            onClick={aoFechar}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[#1E293B] hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 border border-[#334155] flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* SELETOR DE MODO: LEITOR CONTÍNUO VS CARRINHO                   */}
      {/* ============================================================== */}
      {comandaAtiva && (
        <div className="grid grid-cols-2 bg-[#0B1326] p-2 gap-2 border-b border-[#334155]">
          <button
            type="button"
            onClick={() => setModoVisualizacao('SCANNER')}
            className={`min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              modoVisualizacao === 'SCANNER'
                ? 'bg-[#10B981] text-[#0B1326] shadow-md font-extrabold'
                : 'bg-[#131B2E] text-slate-300 border border-[#334155] hover:bg-[#1E293B]'
            }`}
          >
            <Barcode size={16} />
            <span>Leitor Contínuo</span>
          </button>

          <button
            type="button"
            onClick={() => setModoVisualizacao('CARRINHO')}
            className={`min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              modoVisualizacao === 'CARRINHO'
                ? 'bg-[#10B981] text-[#0B1326] shadow-md font-extrabold'
                : 'bg-[#131B2E] text-slate-300 border border-[#334155] hover:bg-[#1E293B]'
            }`}
          >
            <ShoppingCart size={16} />
            <span>Itens na Comanda ({comandaAtiva.itens?.length || 0})</span>
          </button>
        </div>
      )}

      {/* FEEDBACK DE STATUS FLUTUANTE */}
      {mensagemStatus && (
        <div className={`mx-4 mt-2 p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg animate-fadeIn z-30 ${
          tipoAlerta === 'sucesso' ? 'bg-[#10B981] text-[#0B1326] font-extrabold' :
          tipoAlerta === 'erro' ? 'bg-rose-600 text-white' : 'bg-[#38BDF8] text-[#0B1326] font-bold'
        }`}>
          {tipoAlerta === 'sucesso' ? <Check size={18} /> :
           tipoAlerta === 'erro' ? <AlertCircle size={18} /> : <Sparkles size={18} />}
          <span className="flex-1">{mensagemStatus}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* CORPO PRINCIPAL: CÂMERA SCANNER OU CARRINHO                   */}
      {/* ============================================================== */}
      {modoVisualizacao === 'SCANNER' ? (
        <main className="relative flex-1 bg-black flex flex-col justify-between overflow-hidden">
          
          {erroCamera ? (
            <div className="p-6 text-center max-w-sm mx-auto my-auto space-y-4">
              <AlertCircle size={48} className="mx-auto text-rose-500" />
              <p className="text-sm text-slate-300">{erroCamera}</p>
              <button
                onClick={() => setCameraIdx((prev) => prev + 1)}
                className="min-h-[48px] px-6 py-3 rounded-xl bg-[#10B981] text-[#0B1326] font-extrabold text-sm shadow-md cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          ) : (
            <>
              {/* Elemento de vídeo do scanner */}
              <div 
                id={containerId} 
                className="w-full h-full flex items-center justify-center [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
              />

              {/* RETÍCULO TÁTIL (Cantoneiras Âmbar / Esmeralda + Linha de Varredura) */}
              <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
                <div className={`w-64 h-64 border-2 rounded-2xl relative transition-all duration-300 ${
                  passo === 'CLIENTE' ? 'border-[#38BDF8]/80 shadow-[0_0_30px_rgba(56,189,248,0.25)]' : 'border-[#F59E0B]/80 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                }`}>
                  {/* Cantoneiras Táteis */}
                  <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

                  {/* Linha de Varredura */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-[#4EDEA3] to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Dica de Enquadramento */}
              <div className="absolute top-4 inset-x-4 text-center pointer-events-none">
                <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#0B1326]/85 backdrop-blur-md text-[11px] font-bold text-slate-200 border border-[#334155] shadow-lg">
                  {passo === 'CLIENTE' 
                    ? 'Centralize o QR Code do Irmão ou Cartão Genérico' 
                    : 'Aponte para o código de barras ou tag QR da bebida'}
                </span>
              </div>

              {/* BLOCO ÚLTIMO BIPADO COM BOTÃO ANULAR (Padrão Stitch) */}
              {ultimoItemBipado && passo === 'PRODUTO' && !produtoConferencia && (
                <div className="absolute bottom-20 inset-x-4 p-3 rounded-2xl bg-[#131B2E]/95 backdrop-blur-md border border-[#334155] flex items-center justify-between shadow-2xl z-20 animate-slideUp">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/20 border border-[#10B981]/40 flex items-center justify-center font-bold text-xs text-[#4EDEA3] shrink-0 font-mono">
                      {ultimoItemBipado.qtd}x
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-extrabold text-[#F59E0B] block tracking-wider">
                        Último Bipado
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                        {ultimoItemBipado.nome}
                      </h4>
                      <span className="text-xs font-mono font-bold text-[#4EDEA3]">
                        R$ {(ultimoItemBipado.valor * ultimoItemBipado.qtd).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnularUltimoBipado}
                    disabled={carregandoAcao}
                    className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 ml-2"
                  >
                    <Undo2 size={14} />
                    <span>Anular</span>
                  </button>
                </div>
              )}
            </>
          )}

        </main>
      ) : (
        /* VISUALIZAÇÃO DE CARRINHO / ITENS DA COMANDA */
        <main className="flex-1 bg-[#0B1326] p-4 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#334155]">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Itens Registrados ({comandaAtiva?.itens?.length || 0})
            </span>
            <button
              onClick={() => setModoVisualizacao('SCANNER')}
              className="text-xs font-bold text-[#4EDEA3] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Bipar Mais Itens</span>
            </button>
          </div>

          {!comandaAtiva?.itens?.length ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <ShoppingCart className="mx-auto text-slate-600" size={40} />
              <p className="text-sm font-bold">Nenhum item lançado ainda.</p>
              <p className="text-xs text-slate-500">Volte ao leitor para escanear cervejas, doses e porções.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {comandaAtiva.itens.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-[#131B2E] border border-[#334155] flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-white truncate">
                      {item.produto_nome || `Produto #${item.produto_id}`}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                      <span>{item.quantidade}x R$ {item.valor_unitario.toFixed(2)}</span>
                      <span>•</span>
                      <span className="text-[#4EDEA3] font-bold">
                        R$ {(item.quantidade * item.valor_unitario).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoverItemCarrinho(item.id)}
                    className="min-h-[42px] min-w-[42px] p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 flex items-center justify-center transition-colors cursor-pointer"
                    title="Remover Item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ============================================================== */}
      {/* BOTTOM SHEET: CONFERÊNCIA DE QUANTIDADE (Ajuste Rápido)        */}
      {/* ============================================================== */}
      {produtoConferencia && (
        <div className="bg-[#131B2E] border-t border-[#334155] p-5 rounded-t-3xl shadow-2xl z-40 animate-slideUp space-y-4">
          <div className="flex justify-between items-start">
            <div className="min-w-0 flex-1 pr-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#4EDEA3] bg-[#10B981]/15 border border-[#10B981]/30 px-2.5 py-0.5 rounded-md font-mono">
                Produto Identificado
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1.5 leading-snug truncate">
                {produtoConferencia.nome}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Unitário: R$ {produtoConferencia.preco_venda.toFixed(2)}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase text-slate-400 font-bold font-mono">Subtotal</span>
              <div className="text-2xl font-black text-[#4EDEA3] font-mono">
                R$ {(produtoConferencia.preco_venda * qtdConferencia).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Stepper Ergonômico de Quantidade */}
          <div className="flex items-center justify-between bg-[#0B1326] p-2.5 rounded-2xl border border-[#334155]">
            <span className="text-xs font-bold text-slate-300 ml-2">Quantidade:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQtdConferencia((prev) => Math.max(1, prev - 1))}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-extrabold flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Diminuir"
              >
                <Minus size={20} />
              </button>

              <span className="text-2xl font-black text-white min-w-[40px] text-center font-mono">
                {qtdConferencia}
              </span>

              <button
                type="button"
                onClick={() => setQtdConferencia((prev) => prev + 1)}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white font-extrabold flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                title="Aumentar"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Atalhos Rápidos (+1, +2, +5, +10) */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((incremento) => (
              <button
                key={incremento}
                type="button"
                onClick={() => setQtdConferencia((prev) => prev + incremento)}
                className="min-h-[42px] rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-[#F59E0B] font-mono flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              >
                +{incremento}
              </button>
            ))}
          </div>

          {/* Botões de Ação Simétricos com Confirmação Explícita */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={carregandoAcao}
              onClick={() => handleAdicionarEBiparProximo(false)}
              className="min-h-[52px] px-4 py-3 bg-[#10B981] hover:bg-[#059669] text-[#0B1326] rounded-xl font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-98"
            >
              <Check size={20} />
              <span>Adicionar e Continuar Bipando</span>
            </button>

            <button
              type="button"
              disabled={carregandoAcao}
              onClick={() => handleAdicionarEBiparProximo(true)}
              className="min-h-[52px] px-4 py-3 bg-[#1E293B] hover:bg-[#334155] text-slate-200 border border-[#334155] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <ShoppingCart size={18} />
              <span>Adicionar e Ir para Carrinho</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BARRA INFERIOR FIXA: TOTAIS E BOTÃO DE CHECK-OUT               */}
      {/* ============================================================== */}
      {!produtoConferencia && comandaAtiva && (
        <footer className="bg-[#131B2E] border-t border-[#334155] p-4 z-30 shadow-2xl flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-bold text-slate-200 truncate">
                Ir.'. {comandaAtiva.nome_cliente || `Cartão ${comandaAtiva.identificador_cartao}`}
              </span>
              <button
                onClick={handleTrocarCliente}
                className="text-[10px] text-[#38BDF8] hover:underline flex items-center gap-0.5 ml-1 cursor-pointer font-bold"
                title="Trocar Irmão"
              >
                <RotateCcw size={10} /> Trocar
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-[#4EDEA3] font-mono">
                R$ {(comandaAtiva.total || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({comandaAtiva.itens?.length || 0} {comandaAtiva.itens?.length === 1 ? 'item' : 'itens'})
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={!comandaAtiva.itens?.length}
            onClick={() => {
              aoFechar();
              aoSolicitarFechamento(comandaAtiva);
            }}
            className="min-h-[50px] px-6 py-3 bg-[#10B981] hover:bg-[#059669] active:scale-95 text-[#0B1326] rounded-xl font-extrabold text-sm shadow-lg flex items-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
          >
            <CreditCard size={18} />
            <span>Ir para Pagamento</span>
          </button>
        </footer>
      )}

    </div>
  );
};
