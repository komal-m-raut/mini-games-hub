import { promises as fs } from 'fs';
import path from 'path';
import { LiveDuelRoom, LIVE_DUEL_TTL_MS } from '@/lib/liveDuel';
import { hasRedis, redisCommand } from './redis';

interface LiveDuelStore {
  get(code: string): Promise<LiveDuelRoom | null>;
  create(room: LiveDuelRoom): Promise<boolean>;
  mutate(
    code: string,
    update: (room: LiveDuelRoom) => LiveDuelRoom | null
  ): Promise<LiveDuelRoom | null>;
}

const DATA_FILE = path.join(process.cwd(), '.data', 'live-duels.json');
type FileLayout = Record<string, LiveDuelRoom>;

function isFresh(room: LiveDuelRoom): boolean {
  return Date.now() - Date.parse(room.updatedAt) <= LIVE_DUEL_TTL_MS;
}

async function readLayout(): Promise<FileLayout> {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as FileLayout;
  } catch {
    return {};
  }
}

async function writeLayout(layout: FileLayout): Promise<void> {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(layout, null, 2));
}

let fileQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const result = fileQueue.then(task, task);
  fileQueue = result.catch(() => undefined);
  return result;
}

const fileStore: LiveDuelStore = {
  async get(code) {
    const layout = await readLayout();
    const room = layout[code];
    return room && isFresh(room) ? room : null;
  },
  create(room) {
    return serialize(async () => {
      const layout = await readLayout();
      if (layout[room.code] && isFresh(layout[room.code])) return false;
      layout[room.code] = room;
      await writeLayout(layout);
      return true;
    });
  },
  mutate(code, update) {
    return serialize(async () => {
      const layout = await readLayout();
      const room = layout[code];
      if (!room || !isFresh(room)) return null;
      const next = update(room);
      if (!next) return null;
      layout[code] = next;
      await writeLayout(layout);
      return next;
    });
  },
};

const duelKey = (code: string) => `mgh:live-duel:${code}`;
const lockKey = (code: string) => `mgh:live-duel-lock:${code}`;

async function withRedisLock<T>(code: string, task: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID();
  let acquired = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = await redisCommand<string | null>([
      'SET',
      lockKey(code),
      token,
      'NX',
      'PX',
      3000,
    ]);
    if (result === 'OK') {
      acquired = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!acquired) throw new Error('Live duel is busy');

  try {
    return await task();
  } finally {
    await redisCommand([
      'EVAL',
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
      1,
      lockKey(code),
      token,
    ]);
  }
}

const redisStore: LiveDuelStore = {
  async get(code) {
    const raw = await redisCommand<string | null>(['GET', duelKey(code)]);
    if (!raw) return null;
    const room = JSON.parse(raw) as LiveDuelRoom;
    return isFresh(room) ? room : null;
  },
  async create(room) {
    const result = await redisCommand<string | null>([
      'SET',
      duelKey(room.code),
      JSON.stringify(room),
      'NX',
      'EX',
      Math.ceil(LIVE_DUEL_TTL_MS / 1000),
    ]);
    return result === 'OK';
  },
  mutate(code, update) {
    return withRedisLock(code, async () => {
      const raw = await redisCommand<string | null>(['GET', duelKey(code)]);
      if (!raw) return null;
      const room = JSON.parse(raw) as LiveDuelRoom;
      if (!isFresh(room)) return null;
      const next = update(room);
      if (!next) return null;
      await redisCommand([
        'SET',
        duelKey(code),
        JSON.stringify(next),
        'EX',
        Math.ceil(LIVE_DUEL_TTL_MS / 1000),
      ]);
      return next;
    });
  },
};

export const liveDuelStore: LiveDuelStore = hasRedis ? redisStore : fileStore;
