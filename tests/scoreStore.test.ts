import { promises as fs } from 'fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreEntry } from '@/types/game';
import { pruneExpired, RETENTION_MS, scoreStore, upsertScore } from '@/lib/server/scoreStore';

// This suite exercises the real file-backed store (no Upstash env vars are
// set in the test environment, so `scoreStore` resolves to `fileStore`).
// It writes to the same `.data/scores.json` the dev server uses, so back up
// and restore it around the test to avoid clobbering local dev data.
// Per-worker scratch file, set by tests/setup/scoresDataFile.ts — never
// the real .data/scores.json the dev server uses.
const DATA_FILE = process.env.SCORES_DATA_FILE!;
const GAME_ID = '__test-concurrency__';
const BOARD = 'global';

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

function makeEntry(playerId: string, score: number): ScoreEntry {
  return { playerId, name: `player-${playerId}`, score, createdAt: new Date().toISOString() };
}

describe('scoreStore concurrent upserts (M14)', () => {
  it('does not lose an update when many upserts race on the same board', async () => {
    const players = Array.from({ length: 20 }, (_, i) => `player-${i}`);

    // Fire every upsert without awaiting in between so their read-modify-write
    // cycles genuinely overlap — this is what reproduces the lost-update race
    // when the read and the write aren't part of one critical section.
    await Promise.all(players.map((id, i) => upsertScore(GAME_ID, BOARD, makeEntry(id, i))));

    const board = await scoreStore.getBoard(GAME_ID, BOARD);
    const boardPlayerIds = new Set(board.map((e) => e.playerId));

    expect(board.length).toBe(players.length);
    for (const id of players) {
      expect(boardPlayerIds.has(id)).toBe(true);
    }
  });

  it('keeps a player\'s best score under concurrent submissions', async () => {
    const playerId = 'same-player';
    const scores = [3, 9, 1, 7, 5];

    await Promise.all(scores.map((score) => upsertScore(GAME_ID, BOARD, makeEntry(playerId, score))));

    const board = await scoreStore.getBoard(GAME_ID, BOARD);
    const entry = board.find((e) => e.playerId === playerId);

    expect(entry).toBeDefined();
    expect(entry!.score).toBe(Math.max(...scores));
  });

  it('orders a fractional-score tie by earliest submission (R2)', async () => {
    // Two different players land on the exact same 2dp total — the sort
    // comparator (`b.score - a.score`) must treat them as equal (not drift
    // apart from float noise) and fall through to the createdAt tiebreak.
    // Relative to now, not a fixed date: boards only retain seven days, so
    // hardcoded timestamps would age out and the entries would be pruned
    // before the assertion ever ran.
    const base = Date.now() - 60_000;
    const earlier: ScoreEntry = {
      playerId: 'tie-player-a',
      name: 'player-a',
      score: 7.46,
      createdAt: new Date(base).toISOString(),
    };
    const later: ScoreEntry = {
      playerId: 'tie-player-b',
      name: 'player-b',
      score: 7.46,
      createdAt: new Date(base + 1000).toISOString(),
    };

    // Insert out of order so the tiebreak, not insertion order, decides.
    await upsertScore(GAME_ID, BOARD, later);
    await upsertScore(GAME_ID, BOARD, earlier);

    const board = await scoreStore.getBoard(GAME_ID, BOARD);
    const tied = board.filter((e) => e.score === 7.46);

    expect(tied.map((e) => e.playerId)).toEqual(['tie-player-a', 'tie-player-b']);
  });
});

describe('scoreStore seven-day retention', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('keeps entries inside the window and drops ones past it', () => {
    const fresh = { playerId: 'a', name: 'a', score: 5, createdAt: ago(0) };
    const nearlyStale = {
      playerId: 'b',
      name: 'b',
      score: 5,
      createdAt: ago(RETENTION_MS - 60_000),
    };
    const stale = { playerId: 'c', name: 'c', score: 30, createdAt: ago(RETENTION_MS + 60_000) };

    const kept = pruneExpired([fresh, nearlyStale, stale]).map((e) => e.playerId);
    expect(kept).toEqual(['a', 'b']);
  });

  it('keeps entries whose timestamp will not parse, rather than deleting them', () => {
    // Losing a real score to a malformed timestamp is worse than serving one
    // that should have aged out, so unparseable dates fail open.
    const broken = { playerId: 'x', name: 'x', score: 5, createdAt: 'not-a-date' };
    expect(pruneExpired([broken])).toHaveLength(1);
  });

  it('does not serve an aged-out entry that is already on disk', async () => {
    await upsertScore(GAME_ID, BOARD, {
      playerId: 'ancient',
      name: 'ancient',
      score: 30,
      createdAt: ago(RETENTION_MS + 86_400_000),
    });

    const board = await scoreStore.getBoard(GAME_ID, BOARD);
    expect(board.some((e) => e.playerId === 'ancient')).toBe(false);
  });
});
