import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esigma.agape',
  appName: 'e-Sigma Ágape',
  webDir: 'dist',
  server: {
    url: 'https://agape.e-sigma.app',
    cleartext: true
  }
};

export default config;
