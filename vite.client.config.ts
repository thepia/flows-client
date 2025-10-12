import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, 'src/lib/flows-client.ts'),
			name: 'FlowsClient',
			fileName: () => 'flows-client.js',
			formats: ['es']
		},
		outDir: 'dist',
		emptyOutDir: false,
		sourcemap: true,
		rollupOptions: {
			output: {
				inlineDynamicImports: true
			},
			external: []
		}
	},
	resolve: {
		alias: {
			'@thepia/flows-db/types': resolve(__dirname, 'src/types/index.ts')
		}
	}
});
