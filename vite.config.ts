import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * The dev server proxies /api to the ground station, so the browser stays on a
 * single origin: no CORS preflight, and the WebSocket upgrade travels the same
 * path as the REST calls. Point VITE_BACKEND_URL elsewhere to drive a remote
 * ground station without touching any code.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.PORT) || 3000,
      allowedHosts: true as const,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  };
});
