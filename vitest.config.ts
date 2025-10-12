import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Exclude Playwright tests and demo tests
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/*.spec.ts',
			'**/*.spec.js',
			'**/playwright/**',
			'**/examples/**'
		],
		// Only run tests in the tests directory
		include: ['tests/**/*.test.ts', 'tests/**/*.test.js'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/**', 'tests/**', '*.config.js', '*.config.ts']
		}
	}
});
