import js from '@eslint/js'
import hooks from 'eslint-plugin-react-hooks'

export default [
  { ignores: ['dist/**', '.npm-cache/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest', sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { document: 'readonly', window: 'readonly', process: 'readonly', console: 'readonly', URL: 'readonly', fetch: 'readonly', URLSearchParams: 'readonly', AbortController: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly' },
    },
    plugins: { 'react-hooks': hooks },
    rules: {
      ...hooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^_' }],
    },
  },
]
