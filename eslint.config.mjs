import eslint from '@eslint/js';
import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'coverage/', 'dist/', 'playwright-report/', 'test-results/'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['tests/{api,ui,integration,smoke}/**/*.spec.ts'],
    ...playwright.configs['flat/recommended'],
  },
  {
    files: ['tests/{api,ui,integration,smoke}/**/*.spec.ts'],
    rules: {
      'no-restricted-globals': ['error', { name: 'fetch', message: 'Use a domain API service fixture.' }],
      'no-restricted-syntax': [
        'error',
        { selector: "Literal[value='Authorization']", message: 'Authorization belongs to HttpTransport.' },
        { selector: 'TemplateElement[value.raw=/Bearer/]', message: 'Bearer auth belongs to HttpTransport.' },
      ],
    },
  },
  {
    files: ['scripts/**/*.cjs'],
    languageOptions: { globals: globals.node },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
