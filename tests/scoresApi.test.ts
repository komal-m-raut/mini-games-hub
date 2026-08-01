import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/scores/[gameId]/[board]/route';

/**
 * Validation coverage for the scores API (R2): round scores now support up
 * to 2 decimal places, so `Number.isInteger` checks were replaced with a
 * float-safe bounds + step check. This exercises that check directly
 * through the route handler rather than re-testing it in isolation, so a
 * regression in how the two pieces are wired together (route vs the
 * `isValidRoundScore` helper) would actually be caught.
 *
 * Writes go through the real file-backed store, so back up/restore
 * `.data/scores.json` the same way tests/scoreStore.test.ts does.
 */
const DATA_FILE = path.join(process.cwd(), '.data', 'scores.json');
const GAME_ID = 'balloon-match';

let backup: string | null = null;

beforeEach(async () => {
  try {
    backup = await fs.readFile(DATA_FILE, 'utf8');
  } catch {
    backup = null;
  }
});

afterEach(async () => {
  if (backup === null) {
    await fs.rm(DATA_FILE, { force: true });
  } else {
    await fs.writeFile(DATA_FILE, backup);
  }
});

function post(board: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/scores/${GAME_ID}/${board}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ gameId: GAME_ID, board }) });
}

function submission(roundScores: number[]) {
  return {
    playerId: 'test-player-id-1234',
    name: 'Tester',
    roundScores,
  };
}

describe('POST /api/scores — round score validation (R2)', () => {
  it('accepts valid 2dp round scores', async () => {
    const res = await post('test-api-valid', submission([7.46, 9.34, 5.98]));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries[0].score).toBe(22.78);
  });

  it('rejects a 3dp round score', async () => {
    const res = await post('test-api-3dp', submission([7.461, 9.34, 5.98]));
    expect(res.status).toBe(400);
  });

  it('rejects an out-of-range round score', async () => {
    const res = await post('test-api-range', submission([10.01, 9.34, 5.98]));
    expect(res.status).toBe(400);
  });

  it('rejects a negative round score', async () => {
    const res = await post('test-api-negative', submission([-0.01, 9.34, 5.98]));
    expect(res.status).toBe(400);
  });

  it('accepts a float-noisy 2dp value (e.g. 7.1) that round-trips cleanly', async () => {
    // 7.1 alone isn't 3dp — it must not be rejected just because raw
    // multiplication (7.1 * 100) produces float noise under the hood.
    const res = await post('test-api-float-noise', submission([7.1, 9.34, 5.98]));
    expect(res.status).toBe(200);
  });
});
