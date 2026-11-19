import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esigma.taverna',
  appName: 'e-Sigma Taverna',
  webDir: 'dist',
  server: {
    url: 'https://taverna.e-sigma.app',
    cleartext: true
  }
};

export default config;
