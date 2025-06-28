import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./mocks/setup.ts'],
    // Suppress console output globally during tests
    silent: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});