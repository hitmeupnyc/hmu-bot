import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./mocks/setup.ts'],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});