import { react } from '@vllnt/eslint-config'

export default [
  {
    ignores: ['node_modules/**', 'eslint.config.js', 'coverage/**'],
  },
  ...react,
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off',
      // Analytics properties use snake_case to match industry conventions (GA, Mixpanel, etc.)
      '@typescript-eslint/naming-convention': 'off',
      // Technical documentation uses passive voice and specific words
      'write-good-comments/write-good-comments': 'off',
      // Consent APIs return null to indicate "no consent stored"
      'unicorn/no-null': 'off',
      // Queue processing requires loops
      'functional/no-loop-statements': 'off',
      // Analytics provider manages multiple states
      'max-lines-per-function': 'off',
      // Passing undefined is clearer than omitting
      'unicorn/no-useless-undefined': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
    rules: {
      // Tests often use mocks with empty implementations
      '@typescript-eslint/no-empty-function': 'off',
      // React Testing Library patterns
      'react/display-name': 'off',
      // Test helpers can be nested
      'unicorn/consistent-function-scoping': 'off',
      // Some test patterns need any
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
    },
  },
]
