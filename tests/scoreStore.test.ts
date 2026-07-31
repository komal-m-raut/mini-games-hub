import { promises as fs } from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScoreEntry } from '@/types/game';
import { scoreStore, upsertScore } from '@/lib/server/scoreStore';

// This suite exercises the real file-backed store (no Upstash env vars are
// set in the test environment, so `scoreStore` resolves to `fileStore`).
// It writes to the same `.data/scores.json` the dev server uses, so back up
// and restore it around the test to avoid clobbering local dev data.
const DATA_FILE = path.join(process.cwd(), '.data', 'scores.json');
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
});
