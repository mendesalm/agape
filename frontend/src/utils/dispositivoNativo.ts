import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

export const isDispositivoNativo = Capacitor.isNativePlatform();

/**
 * Inicializa os recursos nativos do sistema operacional quando a aplicação monta.
 */
export async function inicializarDispositivoNativo() {
  if (!isDispositivoNativo) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#070E1C' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }

    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await SplashScreen.hide({ fadeOutDuration: 400 });
  } catch (erro) {
    console.debug('Aviso na inicialização de recursos nativos (Ágape):', erro);
  }
}

/**
 * Configura o listener do botão físico de voltar do Android (Hardware Back Button).
 */
export function configurarBotaoVoltarNativo(onVoltar?: () => boolean | void) {
  if (!isDispositivoNativo) return () => {};

  const listenerPromise = App.addListener('backButton', ({ canGoBack }) => {
    if (onVoltar) {
      const consumido = onVoltar();
      if (consumido) return;
    }

    if (canGoBack) {
      window.history.back();
    } else {
      App.minimizeApp();
    }
  });

  return () => {
    listenerPromise.then(l => l.remove()).catch(() => {});
  };
}

export const feedbackTatil = {
  clique: async () => {
    if (!isDispositivoNativo) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (_) {}
  },
  acaoMedia: async () => {
    if (!isDispositivoNativo) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (_) {}
  },
  sucesso: async () => {
    if (!isDispositivoNativo) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (_) {}
  },
  aviso: async () => {
    if (!isDispositivoNativo) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (_) {}
  },
  erro: async () => {
    if (!isDispositivoNativo) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (_) {}
  }
};
