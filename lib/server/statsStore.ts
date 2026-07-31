import { promises as fs } from 'fs';
import path from 'path';
import { hasRedis, redisCommand } from './redis';

/**
 * Game-agnostic play/player tracking. Same dual-backend pattern as scoreStore:
 * `.data/stats.json` locally, Upstash Redis in production.
 *
 * Redis keys:
 * - mgh:stats:plays:total                    INCR — all plays, all games
 * - mgh:stats:plays:{gameId}:{YYYY-MM-DD}    INCR — plays per game per day
 * - mgh:stats:players:all                    PFADD — unique players ever (HyperLogLog)
 * - mgh:stats:players:{gameId}:{YYYY-MM-DD}  PFADD — unique daily players per game
 */
export interface SiteStats {
  totalPlayers: number;
  totalPlays: number;
}

interface StatsStore {
  recordPlay(gameId: string, playerId: string): Promise<void>;
  getStats(): Promise<SiteStats>;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── File store (dev default) ────────────────────────────────────────

const DATA_FILE = path.join(process.cwd(), '.data', 'stats.json');

interface FileLayout {
  playsTotal: number;
  playsByDay: Record<string, number>; // "{gameId}:{date}" -> count
  playersAll: string[];
  playersByDay: Record<string, string[]>; // "{gameId}:{date}" -> playerIds
}

const EMPTY: FileLayout = { playsTotal: 0, playsByDay: {}, playersAll: [], playersByDay: {} };

async function readFileStats(): Promise<FileLayout> {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) };
  } catch {
    return { ...EMPTY };
  }
}

// Same read-modify-write hazard as scoreStore.ts: serialize writes with an
// in-process promise-chain mutex. Single-process-safe only — a multi-instance
// deploy needs the Redis store below.
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

const fileStore: StatsStore = {
  recordPlay(gameId, playerId) {
    return serialize(async () => {
      const stats = await readFileStats();
      const day = `${gameId}:${todayKey()}`;
      stats.playsTotal += 1;
      stats.playsByDay[day] = (stats.playsByDay[day] ?? 0) + 1;
      if (!stats.playersAll.includes(playerId)) stats.playersAll.push(playerId);
      const daily = (stats.playersByDay[day] ??= []);
      if (!daily.includes(playerId)) daily.push(playerId);
      await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
      await fs.writeFile(DATA_FILE, JSON.stringify(stats, null, 2));
    });
  },
  async getStats() {
    const stats = await readFileStats();
    return { totalPlayers: stats.playersAll.length, totalPlays: stats.playsTotal };
  },
};

// ── Upstash Redis store (production) ────────────────────────────────

const redisStore: StatsStore = {
  async recordPlay(gameId, playerId) {
    const day = todayKey();
    await Promise.all([
      redisCommand(['INCR', 'mgh:stats:plays:total']),
      redisCommand(['INCR', `mgh:stats:plays:${gameId}:${day}`]),
      redisCommand(['PFADD', 'mgh:stats:players:all', playerId]),
      redisCommand(['PFADD', `mgh:stats:players:${gameId}:${day}`, playerId]),
    ]);
  },
  async getStats() {
    const [players, plays] = await Promise.all([
      redisCommand<number>(['PFCOUNT', 'mgh:stats:players:all']),
      redisCommand<string | null>(['GET', 'mgh:stats:plays:total']),
    ]);
    return { totalPlayers: players ?? 0, totalPlays: Number(plays ?? 0) };
  },
};

export const statsStore: StatsStore = hasRedis ? redisStore : fileStore;
