/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdfjs-vendor';
          }
          if (id.includes('node_modules/mammoth')) {
            return 'mammoth-vendor';
          }
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'genai-vendor';
          }
        },
      },
    },
  },
});
