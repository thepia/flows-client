/**
 * Vite config for building the service worker
 * This builds the service worker as part of the @thepia/flows-client package
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/service-worker/index.ts'),
      name: 'flows-sw',
      fileName: () => 'flows-sw.js',
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@thepia/flows-client/types': resolve(__dirname, 'src/types/index.ts'),
    },
  },
});
