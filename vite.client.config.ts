import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'FlowsClient',
      fileName: () => 'flows-client.js',
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
      external: ['svelte', 'svelte/store', '@supabase/supabase-js', '@thepia/flows-auth'],
    },
  },
  resolve: {
    alias: {
      '@thepia/flows-client/types': resolve(__dirname, 'src/types/index.ts'),
    },
  },
});
