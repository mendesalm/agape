import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  X, 
  UserCheck, 
  Barcode, 
  Check, 
  Plus, 
  Minus, 
  CreditCard, 
  RefreshCw, 
  AlertCircle,
  RotateCcw,
  Sparkles
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
}

interface PdvMobileScannerModalProps {
  aberto: boolean;
  aoFechar: () => void;
  aoSolicitarFechamento: (comanda: Comanda) => void;
  aoAtualizarDadosGerais?: () => void;
}

/**
 * Emite um bipe sonoro de alta frequência simulando leitor de código de barras profissional
 */
const emitirBeepSonoro = (sucesso = true) => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Frequência mais aguda para leitura de produto (1200Hz), grave para alerta (400Hz)
    osc.frequency.setValueAtTime(sucesso ? 1200 : 400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (sucesso ? 0.1 : 0.25));

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (sucesso ? 0.1 : 0.25));
  } catch {
    // Silencioso caso a política de áudio restrinja sem interação prévia
  }
};

/**
 * Componente PDV Mobile Scanner Contínuo
 * Transição automática e contínua:
 * Passo 1: Leitura do QR Code do Irmão/Cartão
 * Passo 2: Leitura direta do Código de Barras / QR Code de Fábrica do Produto
 * Passo 3: Conferência de Quantidade e Decisão (Bipar Próximo ou Fechar/Cobrar)
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

  // Estados de Interface e Câmera
  const [carregandoAcao, setCarregandoAcao] = useState<boolean>(false);
  const [mensagemStatus, setMensagemStatus] = useState<string | null>(null);
  const [tipoAlerta, setTipoAlerta] = useState<'sucesso' | 'erro' | 'info'>('info');
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState<number>(0);

  // Refs de controle de ciclo de leitura sem parar a câmera
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const pausadoRef = useRef<boolean>(false);
  const passoRef = useRef<'CLIENTE' | 'PRODUTO'>('CLIENTE');
  const comandaAtivaRef = useRef<Comanda | null>(null);
  const containerId = 'agape-pdv-camera-viewport';

  // Sincroniza refs para acesso síncrono no callback do scanner
  useEffect(() => {
    passoRef.current = passo;
  }, [passo]);

  useEffect(() => {
    comandaAtivaRef.current = comandaAtiva;
  }, [comandaAtiva]);

  /**
   * Encerra com segurança o scanner e libera o hardware da câmera
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
        // Ignora erros ao parar câmera já descartada
      }
      scannerRef.current = null;
    }
  };

  /**
   * Inicialização da Câmera
   */
  useEffect(() => {
    if (!aberto) {
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
          // Continua para fallback facingMode
        }

        const config = {
          fps: 14,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0
        };

        const onScanSuccess = (codigoLido: string) => {
          if (pausadoRef.current || !codigoLido) return;
          processarCodigo(codigoLido.trim());
        };

        if (listaCameras.length > 0) {
          let idxEscolhido = cameraIdx % listaCameras.length;
          // Prioriza câmera traseira se houver mais de uma
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
          setErroCamera(`Não foi possível iniciar a câmera: ${msg}. Verifique as permissões do dispositivo.`);
        }
      }
    };

    iniciarCamera();

    return () => {
      cancelado = true;
      pararScanner();
    };
  }, [aberto, cameraIdx]);

  /**
   * Dispara feedback tátil e sonoro
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
    pausadoRef.current = true; // Pausa novas leituras imediatas
    dispararFeedback(true);

    const passoAtual = passoRef.current;
    const comandaAtual = comandaAtivaRef.current;

    if (passoAtual === 'CLIENTE') {
      // 1. Identificar Cliente / Cartão
      setCarregandoAcao(true);
      setMensagemStatus(`Identificando cartão / cliente...`);
      setTipoAlerta('info');

      try {
        const res = await api.post('/comandas/identificar-cartao', {
          identificador_cartao: codigo
        });
        const comandaRecebida: Comanda = res.data;
        setComandaAtiva(comandaRecebida);
        setPasso('PRODUTO');
        setMensagemStatus(`Cliente identificado: ${comandaRecebida.nome_cliente || comandaRecebida.identificador_cartao}`);
        setTipoAlerta('sucesso');

        if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();

        // Breve pausa para o operador direcionar a câmera para o produto
        setTimeout(() => {
          setMensagemStatus(null);
          pausadoRef.current = false;
        }, 900);
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
      // 2. Identificar Produto
      if (!comandaAtual) {
        setPasso('CLIENTE');
        pausadoRef.current = false;
        return;
      }

      setCarregandoAcao(true);
      setMensagemStatus(`Buscando produto...`);
      setTipoAlerta('info');

      try {
        const res = await api.get(`/produtos/codigo/${encodeURIComponent(codigo)}`);
        const produto: Produto = res.data;
        setProdutoConferencia(produto);
        setQtdConferencia(1);
        setMensagemStatus(null);
        // Mantém pausadoRef = true enquanto o operador confere a quantidade no card
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
   * Adiciona o produto na comanda e reativa a câmera para bipar o próximo
   */
  const handleAdicionarEBiparProximo = async () => {
    if (!comandaAtiva || !produtoConferencia) return;

    setCarregandoAcao(true);
    try {
      await api.post(`/comandas/${comandaAtiva.id}/itens`, {
        produto_id: produtoConferencia.id,
        quantidade: qtdConferencia
      });

      // Atualiza os dados da comanda ativa
      const res = await api.get(`/comandas/${comandaAtiva.id}`);
      setComandaAtiva(res.data);

      dispararFeedback(true);
      setMensagemStatus(`+${qtdConferencia}x ${produtoConferencia.nome} lançado!`);
      setTipoAlerta('sucesso');

      if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();

      // Fecha a conferência e reativa o scanner
      setProdutoConferencia(null);
      setQtdConferencia(1);

      setTimeout(() => {
        setMensagemStatus(null);
        pausadoRef.current = false;
      }, 700);
    } catch (err: any) {
      dispararFeedback(false);
      alert(err.response?.data?.detail || "Erro ao adicionar item à comanda.");
      pausadoRef.current = false;
    } finally {
      setCarregandoAcao(false);
    }
  };

  /**
   * Adiciona o item atual (se houver) e abre o fluxo de fechamento/cobrança
   */
  const handleFinalizarECobrar = async () => {
    if (!comandaAtiva) return;

    // Se estiver com produto pendente de conferência, adiciona antes de fechar
    if (produtoConferencia) {
      setCarregandoAcao(true);
      try {
        await api.post(`/comandas/${comandaAtiva.id}/itens`, {
          produto_id: produtoConferencia.id,
          quantidade: qtdConferencia
        });
        const res = await api.get(`/comandas/${comandaAtiva.id}`);
        setComandaAtiva(res.data);
        if (aoAtualizarDadosGerais) aoAtualizarDadosGerais();
        setProdutoConferencia(null);
        aoSolicitarFechamento(res.data);
      } catch (err: any) {
        alert(err.response?.data?.detail || "Erro ao adicionar item.");
        return;
      } finally {
        setCarregandoAcao(false);
      }
    } else {
      aoSolicitarFechamento(comandaAtiva);
    }
  };

  /**
   * Reseta o cliente atual para iniciar atendimento de outro obreiro
   */
  const handleTrocarCliente = () => {
    setComandaAtiva(null);
    setProdutoConferencia(null);
    setQtdConferencia(1);
    setPasso('CLIENTE');
    setMensagemStatus(null);
    pausadoRef.current = false;
  };

  /**
   * Alterna a câmera utilizada
   */
  const alternarCamera = () => {
    if (cameras.length > 1) {
      setCameraIdx((prev) => (prev + 1) % cameras.length);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* ============================================================== */}
      {/* TOPO FIXO: BARRA DE NAVEGAÇÃO E IDENTIFICAÇÃO DO CLIENTE       */}
      {/* ============================================================== */}
      <header className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-20 shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-extrabold text-sm uppercase tracking-wide text-slate-200">
            PDV Celular Contínuo
          </span>
        </div>

        <div className="flex items-center gap-2">
          {cameras.length > 1 && (
            <button
              onClick={alternarCamera}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
              title="Trocar Câmera"
            >
              <RefreshCw size={18} />
            </button>
          )}

          <button
            onClick={aoFechar}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-300 flex items-center justify-center transition-colors"
            title="Fechar Scanner"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* BANNER DO PASSO ATIVO */}
      <div className={`px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center justify-between transition-colors shadow-sm ${
        passo === 'CLIENTE' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
      }`}>
        <div className="flex items-center gap-2">
          {passo === 'CLIENTE' ? <UserCheck size={18} /> : <Barcode size={18} />}
          <span>
            {passo === 'CLIENTE'
              ? 'PASSO 1: Aponte para o QR Code do Irmão / Cartão'
              : 'PASSO 2: Aponte para o Código de Barras / QR do Produto'}
          </span>
        </div>
        {passo === 'PRODUTO' && (
          <span className="text-[11px] bg-emerald-800/60 px-2 py-0.5 rounded-full font-mono">
            {comandaAtiva?.itens?.length || 0} itens
          </span>
        )}
      </div>

      {/* FEEDBACK DE STATUS / ALERTA FLUTUANTE */}
      {mensagemStatus && (
        <div className={`mx-4 mt-2 p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg animate-fadeIn z-30 ${
          tipoAlerta === 'sucesso' ? 'bg-emerald-500 text-white' :
          tipoAlerta === 'erro' ? 'bg-rose-600 text-white' : 'bg-blue-500 text-white'
        }`}>
          {tipoAlerta === 'sucesso' ? <Check size={18} /> :
           tipoAlerta === 'erro' ? <AlertCircle size={18} /> : <Sparkles size={18} />}
          <span className="flex-1">{mensagemStatus}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ÁREA DA CÂMERA (VIEWPORT RESPONSIVO EM TELA CHEIA)            */}
      {/* ============================================================== */}
      <main className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {erroCamera ? (
          <div className="p-6 text-center max-w-sm space-y-4">
            <AlertCircle size={48} className="mx-auto text-rose-500" />
            <p className="text-sm text-slate-300">{erroCamera}</p>
            <button
              onClick={() => setCameraIdx((prev) => prev + 1)}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            {/* Elemento onde a biblioteca html5-qrcode injeta o stream de vídeo */}
            <div 
              id={containerId} 
              className="w-full h-full flex items-center justify-center [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
            />

            {/* Guia visual de enquadramento (Mira do Leitor) */}
            <div className="absolute pointer-events-none inset-0 flex items-center justify-center">
              <div className={`w-64 h-64 border-2 rounded-3xl relative transition-all duration-300 ${
                passo === 'CLIENTE' ? 'border-blue-400/80 shadow-[0_0_30px_rgba(59,130,246,0.3)]' : 'border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
              }`}>
                {/* Cantoneiras estilizadas */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl" />

                {/* Linha de escaneamento animada */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Dica flutuante inferior sobre o visor */}
            <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
              <span className="inline-block px-3 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md text-[11px] font-medium text-slate-300 border border-slate-700/60 shadow-lg">
                {passo === 'CLIENTE' 
                  ? 'Centralize o QR Code do obreiro ou cartão de visitante' 
                  : 'Centralize o código de barras ou tag QR da garrafa/lata'}
              </span>
            </div>
          </>
        )}
      </main>

      {/* ============================================================== */}
      {/* BOTTOM SHEET: CONFERÊNCIA DO PRODUTO BIPADO                   */}
      {/* ============================================================== */}
      {produtoConferencia && (
        <div className="bg-slate-900 border-t border-slate-700 p-5 rounded-t-3xl shadow-2xl z-40 animate-slideUp space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                Produto Identificado
              </span>
              <h3 className="text-xl font-black text-white mt-1 leading-snug">
                {produtoConferencia.nome}
              </h3>
              <p className="text-xs text-slate-400">
                {produtoConferencia.marca ? `Marca: ${produtoConferencia.marca} • ` : ''}
                Unitário: R$ {produtoConferencia.preco_venda.toFixed(2)}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 font-bold">Subtotal</span>
              <div className="text-2xl font-black text-emerald-400">
                R$ {(produtoConferencia.preco_venda * qtdConferencia).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Seletor Ergonômico de Quantidade (Min 48px Touch Target) */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-2xl border border-slate-800">
            <span className="text-xs font-bold text-slate-300 ml-2">Quantidade:</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQtdConferencia((prev) => Math.max(1, prev - 1))}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold flex items-center justify-center transition-transform"
                title="Diminuir"
              >
                <Minus size={18} />
              </button>

              <span className="text-xl font-black text-white min-w-[36px] text-center">
                {qtdConferencia}
              </span>

              <button
                type="button"
                onClick={() => setQtdConferencia((prev) => prev + 1)}
                className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold flex items-center justify-center transition-transform"
                title="Aumentar"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Botões de Ação Imediata (Mínimo 48px de altura) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={carregandoAcao}
              onClick={handleAdicionarEBiparProximo}
              className="min-h-[50px] px-4 py-3 bg-blue-600 hover:bg-blue-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Plus size={18} />
              <span>Bipar Próximo</span>
            </button>

            <button
              type="button"
              disabled={carregandoAcao}
              onClick={handleFinalizarECobrar}
              className="min-h-[50px] px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <CreditCard size={18} />
              <span>Cobrar Venda</span>
            </button>
          </div>

          {/* Descartar leitura errônea */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setProdutoConferencia(null);
                setQtdConferencia(1);
                pausadoRef.current = false;
              }}
              className="text-xs text-slate-400 hover:text-slate-200 py-1"
            >
              Cancelar este item e voltar a escanear
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BARRA INFERIOR FIXA: RESUMO DA COMANDA E BOTÃO DE COBRANÇA     */}
      {/* ============================================================== */}
      {!produtoConferencia && comandaAtiva && (
        <footer className="bg-slate-900 border-t border-slate-800 p-4 z-30 shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-200 truncate">
                {comandaAtiva.nome_cliente || `Cartão ${comandaAtiva.identificador_cartao}`}
              </span>
              <button
                onClick={handleTrocarCliente}
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5 ml-1"
                title="Trocar cliente"
              >
                <RotateCcw size={10} /> Trocar
              </button>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-black text-emerald-400">
                R$ {(comandaAtiva.total || 0).toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400">
                ({comandaAtiva.itens?.length || 0} {comandaAtiva.itens?.length === 1 ? 'item' : 'itens'})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFinalizarECobrar}
            className="min-h-[48px] px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl font-bold text-sm shadow-md flex items-center gap-2 transition-transform"
          >
            <CreditCard size={18} />
            <span>Cobrar</span>
          </button>
        </footer>
      )}

    </div>
  );
};
