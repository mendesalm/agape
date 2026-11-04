import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { inicializarDispositivoNativo, configurarBotaoVoltarNativo } from './utils/dispositivoNativo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Inicialização de hardware móvel (Capacitor StatusBar, Splash, Keyboard, Back Button)
inicializarDispositivoNativo();
configurarBotaoVoltarNativo();

// Registro do Service Worker PWA para suporte offline e instalabilidade (mesmo molde e-Sigma / Lojas / Harmonia)
if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.debug('Falha não-bloqueante no registro do Service Worker (Ágape):', err);
    });
  });
}
