import { promises as fs } from 'fs';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/scores/[gameId]/[board]/route';
import { RETENTION_MS, upsertScore } from '@/lib/server/scoreStore';

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
// Per-worker scratch file, set by tests/setup/scoresDataFile.ts — never
// the real .data/scores.json the dev server uses.
const DATA_FILE = process.env.SCORES_DATA_FILE!;
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

describe('GET /api/scores — paging', () => {
  const BOARD = 'paging-board';

  /** Seed n players straight through the store, newest-first by score. */
  async function seed(n: number) {
    for (let i = 0; i < n; i++) {
      await upsertScore(GAME_ID, BOARD, {
        playerId: `pager-${String(i).padStart(2, '0')}`,
        name: `Pager ${i}`,
        score: 30 - i,
        createdAt: new Date().toISOString(),
      });
    }
  }

  function get(query: string) {
    const req = new NextRequest(`http://localhost/api/scores/${GAME_ID}/${BOARD}${query}`);
    return GET(req, { params: Promise.resolve({ gameId: GAME_ID, board: BOARD }) });
  }

  it('returns five rows by default and points at the next page', async () => {
    await seed(12);

    const first = await (await get('')).json();
    expect(first.entries).toHaveLength(5);
    expect(first.total).toBe(12);
    expect(first.nextOffset).toBe(5);
    expect(first.entries[0].name).toBe('Pager 0');
  });

  it('walks the whole board without repeating or skipping a row', async () => {
    await seed(12);

    const seen: string[] = [];
    let offset: number | null = 0;
    let guard = 0;

    while (offset !== null && guard++ < 10) {
      const page: { entries: { name: string }[]; nextOffset: number | null } = await (
        await get(`?offset=${offset}&limit=5`)
      ).json();
      seen.push(...page.entries.map((e) => e.name));
      offset = page.nextOffset;
    }

    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(12);
    // Descending by score is the board's own order — paging must not disturb it.
    expect(seen[0]).toBe('Pager 0');
    expect(seen[11]).toBe('Pager 11');
  });

  it('reports no next page once the board is exhausted', async () => {
    await seed(3);

    const page = await (await get('?offset=0&limit=5')).json();
    expect(page.entries).toHaveLength(3);
    expect(page.nextOffset).toBeNull();
  });

  it('clamps a junk limit instead of trusting it', async () => {
    await seed(12);

    // Over the cap, under the floor, and not a number at all.
    expect((await (await get('?limit=9999')).json()).entries.length).toBe(12);
    expect((await (await get('?limit=0')).json()).entries.length).toBe(1);
    expect((await (await get('?limit=abc')).json()).entries.length).toBe(5);
  });

  it('excludes aged-out entries from both the page and the total', async () => {
    await seed(3);
    await upsertScore(GAME_ID, BOARD, {
      playerId: 'expired-player',
      name: 'Expired',
      score: 30,
      createdAt: new Date(Date.now() - RETENTION_MS - 60_000).toISOString(),
    });

    const page = await (await get('?offset=0&limit=5')).json();
    expect(page.total).toBe(3);
    expect(page.entries.map((e: { name: string }) => e.name)).not.toContain('Expired');
  });
});
