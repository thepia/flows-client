/**
 * Vite config for building the service worker
 * This builds the service worker as part of the @thepia/flows-db package
 */
import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/service-worker/index.ts'),
			name: 'flows-sw',
			fileName: () => 'flows-sw.js',
			formats: ['es']
		},
		outDir: 'dist',
		emptyOutDir: false,
		sourcemap: true,
		rollupOptions: {
			output: {
				inlineDynamicImports: true
			}
		}
	},
	resolve: {
		alias: {
			'@thepia/flows-db/types': resolve(__dirname, 'src/types/index.ts')
		}
	}
});
