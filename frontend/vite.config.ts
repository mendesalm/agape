import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { execSync } from 'node:child_process';
import pkg from './package.json' with { type: 'json' };

let gitHash = 'local';
try {
  gitHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  // ignore if git is unavailable
}
const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ');

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version || '1.0.0'),
    __BUILD_HASH__: JSON.stringify(gitHash),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    tailwindcss(),
    basicSsl()
  ],
  server: {
    host: true,
    port: 5179,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8007',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
