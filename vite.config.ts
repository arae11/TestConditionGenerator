import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // When running `netlify dev`, Netlify proxies both the Vite server and
      // the functions on a single port, so this proxy is only needed if you
      // run `vite` directly against a separately running functions server.
      '/.netlify/functions': {
        target: 'http://localhost:9999',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
