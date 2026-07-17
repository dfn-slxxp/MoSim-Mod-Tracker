import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: false,
    // Allow the dev server to serve /steps.json from the repo root (one
    // directory above this package).
    fs: { allow: ['..'] }
  }
});
