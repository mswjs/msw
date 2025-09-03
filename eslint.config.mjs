// @ts-check

import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  eslint.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    rules: {
      'no-console': [
        'error',
        {
          allow: [
            'log',
            'warn',
            'error',
            'group',
            'groupCollapsed',
            'groupEnd',
          ],
        },
      ],
      'no-async-promise-executor': 'off',
      'require-yield': 'off',
      'no-empty-pattern': 'off',
      'no-control-regex': 'off',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-namespace': [
        'error',
        {
          allowDeclarations: true,
        },
      ],
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Unused variables are useful in test files, and type test files
  {
    files: ['**/*.test.ts', '**/*.test-d.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  // @ts-expect-error tseslint adds strict typing to this configuration, eslint-plugin-prettier has an incompatible type
  eslintPluginPrettier,
)
