import { NextRequest } from 'next/server';
import { createInitialState } from '@/games/fading-xo/engine';
import { publicRoom, type LiveDuelRoom } from '@/lib/liveDuel';
import { sanitizeName } from '@/lib/moderation';
import { createRateLimiter, getClientIp, rateLimitResponse } from '@/lib/server/rateLimit';
import { liveDuelStore } from '@/lib/server/liveDuelStore';

const createLimit = createRateLimiter(8, 60_000);
const CODE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

function makeCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
}

export async function POST(req: NextRequest) {
  const { limited, retryAfterSeconds } = createLimit(getClientIp(req));
  if (limited) return rateLimitResponse(retryAfterSeconds);

  let body: { playerId?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    typeof body.playerId !== 'string' ||
    body.playerId.length < 8 ||
    body.playerId.length > 64 ||
    typeof body.name !== 'string'
  ) {
    return Response.json({ error: 'Invalid player' }, { status: 400 });
  }
  const name = sanitizeName(body.name);
  if (!name) return Response.json({ error: 'Choose a different name' }, { status: 400 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = makeCode();
    const now = new Date().toISOString();
    const room: LiveDuelRoom = {
      code,
      players: { X: { playerId: body.playerId, name }, O: null },
      engine: createInitialState('X'),
      status: 'waiting',
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    if (await liveDuelStore.create(room)) {
      return Response.json({ room: publicRoom(room), role: 'X' }, { status: 201 });
    }
  }

  return Response.json({ error: 'Could not create a room' }, { status: 503 });
}
