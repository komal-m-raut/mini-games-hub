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
  /**
   * Insert or improve `entry` on the board as one read-modify-write unit.
   * Implementations are responsible for making this atomic against other
   * concurrent `upsertBoard` calls on the same board — a plain
   * getBoard-then-saveBoard sequence at the call site is exactly the lost-
   * update race this exists to avoid.
   */
  upsertBoard(
    gameId: string,
    board: string,
    entry: ScoreEntry,
    maxSize: number
  ): Promise<ScoreEntry[]>;
}

// Boards are capped at the top N entries. Keeps Redis payloads bounded no
// matter how many players submit; anyone knocked off re-enters by beating
// the cut. (The API pages over this, so a response is never the whole 100.)
const MAX_BOARD_SIZE = 100;

/**
 * Leaderboards only cover the last seven days. An entry older than this is
 * dropped on the next read or write of its board, so a score earned eight
 * days ago is gone whether or not anyone has played since.
 *
 * Enforced on read as well as write on purpose: a board nobody has posted to
 * in a fortnight would otherwise keep serving stale entries forever, because
 * pruning-on-write alone never runs for it.
 */
export const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Drop entries that have aged out. Entries whose `createdAt` won't parse are
 * kept rather than discarded — silently deleting a real score because of a
 * malformed timestamp is the worse failure of the two.
 */
export function pruneExpired(entries: ScoreEntry[], now = Date.now()): ScoreEntry[] {
  return entries.filter((e) => {
    const t = Date.parse(e.createdAt);
    return Number.isFinite(t) ? now - t <= RETENTION_MS : true;
  });
}

/**
 * Pure merge: given the current board, fold in `entry` (insert, improve, or
 * just honor a name change on a worse run), re-sort, and cap the size.
 * Shared by every backend so the merge policy lives in exactly one place.
 */
function mergeEntry(entries: ScoreEntry[], entry: ScoreEntry, maxSize: number): ScoreEntry[] {
  // Prune before merging, so an aged-out entry can't hold a slot against a
  // live one when the board is at MAX_BOARD_SIZE — and so a returning player
  // whose week-old run has expired starts clean rather than having to beat
  // a score that should no longer exist.
  entries = pruneExpired(entries);
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

  next.sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt));
  return next.slice(0, maxSize);
}

// ── File store (dev default) ────────────────────────────────────────

/**
 * Overridable so the test suite can point at a scratch file. Two test files
 * were each backing up and restoring the real `.data/scores.json` while
 * running in parallel workers, so they clobbered one another's snapshot and
 * left residue that failed a later run — and they were writing to the same
 * file the dev server uses.
 */
const DATA_FILE =
  process.env.SCORES_DATA_FILE ?? path.join(process.cwd(), '.data', 'scores.json');

type FileLayout = Record<string, Record<string, ScoreEntry[]>>;

async function readFileLayout(): Promise<FileLayout> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch {
    return {};
  }
}

// Read-modify-write on a shared JSON file is only safe if the *entire*
// read -> merge -> write sequence is serialized, not just the write. Two
// concurrent upserts that both read before either writes will compute
// conflicting `next` arrays from the same snapshot, and the second write
// silently clobbers the first (the exact race this mutex exists to close).
// This promise-chain mutex is single-process-safe only (each Next.js server
// process gets its own `queue`); a multi-instance deploy needs Redis (the
// store below).
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

const fileStore: ScoreStore = {
  async getBoard(gameId, board) {
    const all = await readFileLayout();
    return pruneExpired(all[gameId]?.[board] ?? []);
  },
  upsertBoard(gameId, board, entry, maxSize) {
    // The whole read -> merge -> write cycle is one critical section, so a
    // second concurrent upsert always sees the first one's result.
    return serialize(async () => {
      const all = await readFileLayout();
      const current = all[gameId]?.[board] ?? [];
      const next = mergeEntry(current, entry, maxSize);
      all[gameId] = { ...all[gameId], [board]: next };
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(all, null, 2));
      return next;
    });
  },
};

// ── Upstash Redis store (production) ────────────────────────────────

const redisKey = (gameId: string, board: string) => `mgh:scores:${gameId}:${board}`;

const redisStore: ScoreStore = {
  async getBoard(gameId, board) {
    const result = await redisCommand<string | null>(['GET', redisKey(gameId, board)]);
    return result ? pruneExpired(JSON.parse(result) as ScoreEntry[]) : [];
  },
  // NOTE (known race, not fixed here): this is GET-then-SET, not atomic.
  // Two concurrent upserts against the same board on two different
  // serverless instances (or two overlapping requests on one instance) can
  // both GET the same snapshot and then SET, and the second SET clobbers
  // the first — the same lost-update failure the file store's mutex
  // prevents, except an in-process mutex *cannot* fix it here because
  // separate instances don't share memory.
  //
  // Why this isn't closed with a Lua/EVAL script instead: doing that
  // correctly (atomic GET+decode+merge+encode+SET server-side) needs to be
  // verified against Upstash's actual REST EVAL behavior and Lua sandbox
  // (e.g. whether cjson is available for the JSON encode/decode the merge
  // needs) against a live Upstash instance — this environment has no
  // Upstash credentials or network access to do that safely, and shipping
  // an unverified Lua script for the score-storage write path is riskier
  // than the documented race it would replace. The real fix is either that
  // EVAL script (verified against a live instance) or Upstash's optimistic
  // WATCH/MULTI-style primitives, or per-player keys with a sorted set
  // (ZADD is atomic) instead of one JSON blob per board.
  async upsertBoard(gameId, board, entry, maxSize) {
    const key = redisKey(gameId, board);
    const result = await redisCommand<string | null>(['GET', key]);
    const current: ScoreEntry[] = result ? JSON.parse(result) : [];
    const next = mergeEntry(current, entry, maxSize);
    await redisCommand(['SET', key, JSON.stringify(next)]);
    // Belt and braces on top of the per-entry pruning: a board nobody posts
    // to again would otherwise sit in Redis forever holding entries that can
    // never be served. One retention window of slack so the key always
    // outlives the newest entry inside it.
    await redisCommand(['EXPIRE', key, String(Math.ceil((RETENTION_MS * 2) / 1000))]);
    return next;
  },
};

// ── Store selection ─────────────────────────────────────────────────

export const scoreStore: ScoreStore = hasRedis ? redisStore : fileStore;

/** Insert or improve a player's entry; each player keeps their best run. */
export function upsertScore(
  gameId: string,
  board: string,
  entry: ScoreEntry
): Promise<ScoreEntry[]> {
  return scoreStore.upsertBoard(gameId, board, entry, MAX_BOARD_SIZE);
}
