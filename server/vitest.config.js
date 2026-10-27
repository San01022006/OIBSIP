import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
