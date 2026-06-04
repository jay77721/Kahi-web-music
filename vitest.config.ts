// @ts-nocheck - Vitest config, not part of Next.js app

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.ts'],
    include: [
      'tests/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/helpers/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'stores/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
      exclude: ['node_modules/', 'tests/', '**/*.d.ts'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    alias: {
      '@': path.resolve(__dirname, './'),
    },
    testTimeout: 10000,
  },
});
