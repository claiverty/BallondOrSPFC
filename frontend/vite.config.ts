import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: {
      '@awards/contracts': fileURLToPath(
        new URL('../packages/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
  server: { port: 5174, proxy: { '/api': 'http://localhost:3001' } },
});
