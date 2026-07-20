import { promises as fs } from 'fs';
import path from 'path';
import { ScoreEntry } from '@/types/game';
import { hasRedis, redisCommand } from './redis';

/**
 * Game-agnostic score storage. Every game uses the same schema:
 * entries (ScoreEntry) grouped by gameId and board, where a board is any
 * leaderboard bucket — a challenge code, `daily-YYYYMMDD`, `global`, …
 *
 * - Local dev / single server: JSON file in `.data/` (gitignored). Zero setup.
 * - Production (serverless): set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   and scores persist in Upstash Redis via its REST API — no npm package needed.
 */
interface ScoreStore {
  getBoard(gameId: string, board: string): Promise<ScoreEntry[]>;
  saveBoard(gameId: string, board: string, entries: ScoreEntry[]): Promise<void>;
}

// ── File store (dev default) ────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), '.data', 'scores.json');

type FileLayout = Record<string, Record<string, ScoreEntry[]>>;

const fileStore: ScoreStore = {
  async getBoard(gameId, board) {
    try {
      const all: FileLayout = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
      return all[gameId]?.[board] ?? [];
    } catch {
      return [];
    }
  },
  async saveBoard(gameId, board, entries) {
    let all: FileLayout = {};
    try {
      all = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
    } catch {
      // first write
    }
    all[gameId] = { ...all[gameId], [board]: entries };
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2));
  },
};

// ── Upstash Redis store (production) ────────────────────────────────

const redisKey = (gameId: string, board: string) => `mgh:scores:${gameId}:${board}`;

const redisStore: ScoreStore = {
  async getBoard(gameId, board) {
    const result = await redisCommand<string | null>(['GET', redisKey(gameId, board)]);
    return result ? (JSON.parse(result) as ScoreEntry[]) : [];
  },
  async saveBoard(gameId, board, entries) {
    await redisCommand(['SET', redisKey(gameId, board), JSON.stringify(entries)]);
  },
};

// ── Store selection ─────────────────────────────────────────────────

export const scoreStore: ScoreStore = hasRedis ? redisStore : fileStore;

// Boards are stored and shipped whole, so cap them at the top N entries.
// Keeps Redis payloads and API responses bounded no matter how many players
// submit; anyone knocked off re-enters by beating the cut.
const MAX_BOARD_SIZE = 100;

/** Insert or improve a player's entry; each player keeps their best run. */
export async function upsertScore(
  gameId: string,
  board: string,
  entry: ScoreEntry
): Promise<ScoreEntry[]> {
  const entries = await scoreStore.getBoard(gameId, board);
  const existing = entries.find((e) => e.playerId === entry.playerId);

  let next: ScoreEntry[];
  if (!existing) {
    next = [...entries, entry];
  } else if (entry.score > existing.score) {
    next = entries.map((e) => (e.playerId === entry.playerId ? entry : e));
  } else {
    // Keep the better run but always honor a name change.
    next = entries.map((e) =>
      e.playerId === entry.playerId ? { ...e, name: entry.name } : e
    );
  }

  next.sort(
    (a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt)
  );
  next = next.slice(0, MAX_BOARD_SIZE);
  await scoreStore.saveBoard(gameId, board, next);
  return next;
}
