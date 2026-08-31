import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import portsConfig from '../config/ports.config.json';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  esbuild: {
    // Drop console and debugger in production builds for PHI hygiene
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    port: portsConfig?.FRONTEND?.PORT || 7123,
    strictPort: true,
    host: true,
    proxy: {
      '/api': {
        target: portsConfig?.BACKEND?.URL || 'http://localhost:7722',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: portsConfig?.FRONTEND?.PORT || 7123,
    strictPort: true,
    host: true,
  },
}));
