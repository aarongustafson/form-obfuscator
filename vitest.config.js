import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'happy-dom',
		globals: true,
		setupFiles: ['./test/setup.js'],
		exclude: ['node_modules/**', 'test/browser/**'],
	},
});
