import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
      // 1. Roteamento de rotas de Pedidos e Pagamentos (que usam o prefixo /api)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // 2. Roteamento de rotas de Autenticação (que estão mapeadas na raiz /auth no Spring Boot)
      '/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      // 3. Roteamento de rotas do Catálogo de Produtos (mapeadas na raiz /product no Spring Boot)
      '/product': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
