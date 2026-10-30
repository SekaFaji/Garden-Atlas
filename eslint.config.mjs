import tseslint from 'typescript-eslint';

/** Legacy modules are incrementally refactored; avoid mass stylistic rewrites. */
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'vite.config.ts', 'playwright.config.ts'],
    extends: [...tseslint.configs.recommended],
    rules: {
      // Strict TypeScript already fails unused locals/parameters during the build.
      '@typescript-eslint/no-unused-vars': 'off',
      // Existing browser storage and model validation perform explicit runtime narrowing.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
