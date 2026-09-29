import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/db/**/*.test.ts'],
    setupFiles: ['./tests/db/setup.ts'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
