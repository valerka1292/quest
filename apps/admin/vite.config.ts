import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5174, allowedHosts: true, proxy: { '/api': 'http://localhost:3001' } },
  build: { outDir: 'dist', emptyOutDir: true },
});
