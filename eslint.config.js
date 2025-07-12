import js from '@eslint/js'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import jsdocPlugin from 'eslint-plugin-jsdoc'
import preferArrowPlugin from 'eslint-plugin-prefer-arrow'

export default [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'zotero-make-it-red/**',
      'zotero-date-from-last-modified-master/**',
      'zotero-source/**',
      'zotero-*/**',
      '.taskmaster/**',
      '.git/**',
      'client/**',
      '*.xpi',
      '**/*.min.js',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module',
      },
      globals: {
        Zotero: 'readonly',
        Components: 'readonly',
        Services: 'readonly',
        ChromeUtils: 'readonly',
        dump: 'readonly',
        ZoteroPane: 'readonly',
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      jsdoc: jsdocPlugin,
      'prefer-arrow': preferArrowPlugin,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-explicit-any': 'off', // Zotero APIs often use any
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // General JavaScript rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-trailing-spaces': 'error',
      'semi': ['error', 'never'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'comma-dangle': ['error', 'always-multiline'],

      // Import rules - simplified for now
      'import/order': ['error', {
        'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'never',
      }],

      // Disable some JSDoc rules that are too strict for this project
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
    },
  },
  {
    files: ['*.js', 'esbuild.js', 'eslint.config.js'],
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': 'off', // Allow console in build scripts
    },
  },
  {
    files: ['bootstrap.ts'],
    rules: {
      'prefer-arrow/prefer-arrow-functions': 'off',
      'no-var': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]