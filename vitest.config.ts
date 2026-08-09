import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Must run before any test module imports the score store, which reads
    // SCORES_DATA_FILE once at module scope.
    setupFiles: ['tests/setup/scoresDataFile.ts'],
  },
});
