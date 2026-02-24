import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.claude/worktrees', 'public/assets']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Prevent console.log in production code (allow warn/error for legitimate logging)
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Allow underscore-prefixed variables/args to signal intentionally unused
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // Downgrade to warn: pre-existing codebase issues to fix incrementally
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['functions/**/*.{ts,js}', 'workers/**/*.{ts,js}', 'scripts/**/*.{ts,js,mjs,cjs}'],
    rules: {
      // Serverless handlers and operational workers/scripts intentionally use console logging.
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.{ts,js,mjs,cjs}'],
    rules: {
      // Analysis/maintenance scripts often process arbitrary JSON payloads.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
])
