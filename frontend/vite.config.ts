import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const nonBlockingStylesheet: Plugin = {
  name: 'non-blocking-app-stylesheet',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)"\s*\/?>/,
        '<link rel="preload" as="style" href="$1" crossorigin />\n    <link rel="stylesheet" crossorigin href="$1" media="print" data-app-stylesheet onload="this.media=\'all\'" />\n    <noscript><link rel="stylesheet" crossorigin href="$1" /></noscript>',
      );
    },
  },
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), nonBlockingStylesheet],
  resolve: {
    alias: {
      '@awards/contracts': fileURLToPath(
        new URL('../packages/contracts/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
