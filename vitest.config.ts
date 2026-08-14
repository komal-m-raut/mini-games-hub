import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Several engine suites deliberately run hundreds of seeded games. Give
    // those stress checks room to finish on constrained CI runners while
    // keeping a firm per-test ceiling.
    testTimeout: 20_000,
    // Must run before any test module imports the score store, which reads
    // SCORES_DATA_FILE once at module scope.
    setupFiles: ['tests/setup/scoresDataFile.ts'],
  },
});
