import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    fs: { allow: ['..'] },
    proxy: {
      // Forward /api/* to the Express server during development.
      // Run `node server/server.js` alongside `npm run dev`.
      '/api': { target: 'http://localhost:8787', changeOrigin: true }
    }
  }
});
