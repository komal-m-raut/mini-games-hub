import os from 'os';
import path from 'path';

/**
 * Give every test worker its own score file, before any test module imports
 * the store (which reads this env var once at module scope).
 *
 * Without it, the suites that exercise the file-backed store all read and
 * write the real `.data/scores.json` — the same file the dev server uses —
 * and their backup/restore blocks raced each other across parallel workers,
 * leaving residue that failed subsequent runs.
 */
process.env.SCORES_DATA_FILE = path.join(
  os.tmpdir(),
  `mgh-scores-${process.pid}-${Math.random().toString(36).slice(2)}.json`
);
