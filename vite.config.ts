import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual (development, production)
  // O terceiro argumento '' permite carregar todas as variáveis do .env
  const env = loadEnv(mode, process.cwd(), '');
  const targetServer = env.VITE_API_URL || 'http://localhost:8080';

  return {
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
          target: targetServer,
          changeOrigin: true,
          secure: false,
        },
        // 2. Roteamento de rotas de Autenticação (que estão mapeadas na raiz /auth no Spring Boot)
        '/auth': {
          target: targetServer,
          changeOrigin: true,
          secure: false,
        },
        // 3. Roteamento de rotas do Catálogo de Produtos (mapeadas na raiz /product no Spring Boot)
        '/product': {
          target: targetServer,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
