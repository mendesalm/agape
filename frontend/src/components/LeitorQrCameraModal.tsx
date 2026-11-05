import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, RefreshCw, X, QrCode, AlertCircle } from 'lucide-react';

interface LeitorQrCameraModalProps {
  aberto?: boolean;
  isOpen?: boolean;
  aoFechar?: () => void;
  onClose?: () => void;
  aoLerCodigo?: (codigo: string) => void;
  onScanSuccess?: (codigo: string) => void;
  titulo?: string;
  subtitulo?: string;
}

export const LeitorQrCameraModal: React.FC<LeitorQrCameraModalProps> = ({
  aberto,
  isOpen,
  aoFechar,
  onClose,
  aoLerCodigo,
  onScanSuccess,
  titulo = 'Leitor de QR Code & Código de Barras',
  subtitulo = 'Aponte a câmera para o QR Code do Irmão/Cartão ou para o código da embalagem'
}) => {
  const isModalOpen = aberto ?? isOpen ?? false;
  const fecharModal = aoFechar ?? onClose ?? (() => {});
  const processarCodigoLido = aoLerCodigo ?? onScanSuccess ?? (() => {});
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [iniciando, setIniciando] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraIdx, setCameraIdx] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lidoRef = useRef(false);
  const containerId = 'agape-qr-camera-reader';

  const pararScanner = async () => {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch {
        // Ignora erro ao parar câmera já encerrada
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      pararScanner();
      return;
    }

    lidoRef.current = false;
    setErroCamera(null);
    setIniciando(true);

    let cancelado = false;

    const iniciar = async () => {
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
          // Segue com facingMode environment
        }

        const config = {
          fps: 12,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };

        const onScan = (decodedText: string) => {
          if (lidoRef.current || !decodedText) return;
          lidoRef.current = true;
          try {
            if (navigator.vibrate) navigator.vibrate(100);
          } catch {
            // Ignora se vibração não suportada
          }
          pararScanner().finally(() => {
            processarCodigoLido(decodedText.trim());
            fecharModal();
          });
        };

        if (listaCameras.length > 0) {
          // Prioriza câmera traseira quando cameraIdx === 0
          let idxEscolhido = cameraIdx % listaCameras.length;
          if (cameraIdx === 0 && listaCameras.length > 1) {
            const backIdx = listaCameras.findIndex((c) =>
              /back|traseira|rear|environment/i.test(c.label)
            );
            if (backIdx >= 0) idxEscolhido = backIdx;
          }
          await scanner.start(
            listaCameras[idxEscolhido].id,
            config,
            onScan,
            () => {}
          );
        } else {
          await scanner.start(
            { facingMode: 'environment' },
            config,
            onScan,
            () => {}
          );
        }
      } catch (err: any) {
        if (!cancelado) {
          setErroCamera(
            'Não foi possível acessar a câmera. Verifique as permissões do navegador ou do aplicativo.'
          );
        }
      } finally {
        if (!cancelado) setIniciando(false);
      }
    };

    const timer = setTimeout(iniciar, 150);

    return () => {
      cancelado = true;
      clearTimeout(timer);
      pararScanner();
    };
  }, [isModalOpen, cameraIdx]);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="w-full max-w-md card-deep-blue-glass overflow-hidden border border-[#DDB96B]/40 shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-[#DDB96B]/20 flex items-center justify-between bg-[#0A1428]/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl vidro-destaque flex items-center justify-center">
              <Camera className="w-5 h-5 icon-sigma-gold" />
            </div>
            <div>
              <h3 className="text-base font-bold font-cinzel text-[#FDE68A]">
                {titulo}
              </h3>
              <p className="text-[11px] text-slate-400">{subtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fecharModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visor da Câmera */}
        <div className="p-5 space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-[#050B16] border-2 border-[#DDB96B]/30 min-h-[280px] flex items-center justify-center">
            <div id={containerId} className="w-full h-full" />

            {iniciando && !erroCamera && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070F1E]/90 text-[#FDE68A] gap-3">
                <div className="w-8 h-8 border-2 border-[#DDB96B] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Iniciando câmera...
                </span>
              </div>
            )}

            {erroCamera && (
              <div className="p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-200 leading-relaxed">{erroCamera}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <QrCode className="w-4 h-4 text-[#DDB96B]" />
              <span>Leitura automática ao focar o código</span>
            </div>

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={() => setCameraIdx((prev) => prev + 1)}
                className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-[#DDB96B]/30 text-xs font-semibold text-[#FDE68A] flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trocar Câmera</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#DDB96B]/20 bg-[#0A1428]/70 flex justify-end">
          <button
            type="button"
            onClick={fecharModal}
            className="px-5 py-2 rounded-full text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
          >
            Fechar Câmera
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeitorQrCameraModal;
