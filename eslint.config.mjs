// Flat ESLint config (ESLint 10).
// Enforces TS strictness, import hygiene, and the package-boundary rules from
// docs/architecture.md §2 / .cursor/rules/01-monorepo.mdc.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const PACKAGE_BOUNDARY_RULES = {
  // @wlist/core MUST stay platform-agnostic.
  core: ['react-dom', 'react-dom/*', '@telegram-apps/*', '@wlist/api/client/SupabaseApiClient'],
  // @wlist/api MUST NOT depend on UI runtimes.
  api: ['react', 'react-dom', '@telegram-apps/*'],
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.vite/**',
      '**/.turbo/**',
      '**/.vercel/**',
      'packages/api/src/generated/**',
      'plans/**',
      'docs/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  {
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: { ...globals.node, ...globals.browser },
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: ['./tsconfig.json'] })],
    },
    rules: {
      // TypeScript hygiene
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Import hygiene (rules that don't need a TS resolver)
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import-x/no-default-export': 'error',
      'import-x/no-cycle': 'error',
    },
  },

  // Package boundary: @wlist/core
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: PACKAGE_BOUNDARY_RULES.core.map((p) => ({
            group: [p],
            message: '`@wlist/core` must stay platform-agnostic — see docs/architecture.md §2.',
          })),
        },
      ],
    },
  },

  // Package boundary: @wlist/api
  {
    files: ['packages/api/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: PACKAGE_BOUNDARY_RULES.api.map((p) => ({
            group: [p],
            message: '`@wlist/api` must not depend on UI runtimes — see docs/architecture.md §2.',
          })),
        },
      ],
    },
  },

  // Allow default exports in app entry/config files, and relax import-x noise
  // around libraries that use both default + named exports (typescript-eslint).
  {
    files: [
      '**/*.config.{ts,mts,js,mjs,cjs}',
      'eslint.config.{js,mjs,cjs}',
      'apps/**/vite.config.*',
      'apps/**/tailwind.config.*',
    ],
    rules: {
      'import-x/no-default-export': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  // i18next exposes a default-exported singleton with chainable methods that
  // are also exported as standalone names. Calling `import i18n from 'i18next'`
  // is the documented entry point — silence the import-x noise just here.
  {
    files: ['apps/**/i18n.ts'],
    rules: {
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  // Edge Functions run in Deno, not Node. Tell the linter about Deno globals
  // (Deno.env, Deno.serve) and stop trying to resolve modules with the Node
  // resolver — Deno uses its own (`npm:`, `jsr:`, `https://`, plus an import
  // map in deno.json that aliases bare `zod` / `@supabase/supabase-js`).
  {
    files: ['supabase/functions/**/*.ts'],
    ignores: ['supabase/functions/**/*.{test,spec}.ts'],
    languageOptions: {
      globals: { Deno: 'readonly' },
    },
    rules: {
      'import-x/no-unresolved': 'off',
    },
  },

  // Disable formatting rules that conflict with Prettier — must be last.
  prettier,
);
