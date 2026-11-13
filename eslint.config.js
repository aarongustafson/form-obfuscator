import config from '@open-wc/eslint-config';

export default [
	...config,
	{
		ignores: [
			'node_modules/**',
			'package-lock.json',
			'demo/**',
			'coverage/**',
			'test-results/**',
			'playwright-report/**',
		],
	},
	{
		rules: {
			'arrow-parens': ['error', 'always'],
			'class-methods-use-this': 'off',
		},
	},
	{
		files: ['**/*.test.js', 'test/**/*.js', '*config.js'],
		rules: {
			'import-x/no-extraneous-dependencies': [
				'error',
				{ devDependencies: true },
			],
		},
	},
];
