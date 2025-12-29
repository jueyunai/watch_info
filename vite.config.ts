import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        annual: fileURLToPath(new URL('./annual.html', import.meta.url)),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://watcha.cn',
        changeOrigin: true,
        secure: true,
      },
      '/llm-proxy/zhipu': {
        target: 'https://ai.bytenote.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-proxy\/zhipu/, ''),
      },
      '/llm-proxy/minimax': {
        target: 'https://api.minimax.chat',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-proxy\/minimax/, ''),
      },
      '/llm-proxy/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/llm-proxy\/deepseek/, ''),
      },
    },
  },
});

