import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente baseadas no modo atual (development, production)
  const env = loadEnv(mode, process.cwd(), '');
  const targetServer = (env.VITE_API_URL || 'http://localhost:8080').replace(/\/+$/, '');

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
        // 1. Roteamento de rotas com prefixo /api (reescreve removendo /api para casar com o Spring Boot)
        '/api': {
          target: targetServer,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        // 2. Roteamento de rotas de Pedidos diretas (/orders)
        '/orders': {
          target: targetServer,
          changeOrigin: true,
          secure: false,
        },
        // 3. Roteamento de rotas de Pagamentos diretas (/payments e /payment)
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
        // 4. Roteamento de rotas de Autenticação (/auth)
        '/auth': {
          target: targetServer,
          changeOrigin: true,
          secure: false,
        },
        // 5. Roteamento de rotas de Produtos (/product)
        '/product': {
          target: targetServer,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
