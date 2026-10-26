import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
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
  };
});
