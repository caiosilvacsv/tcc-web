import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const targetServer = 'http://localhost:8080';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/orders': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/payments': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/payment': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/product': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/admin': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/config': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
      '/actuator': {
        target: targetServer,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
