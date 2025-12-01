import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://watcha.cn',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
