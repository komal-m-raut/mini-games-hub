import { NextRequest } from 'next/server';
import { applyMove, isMovementPhase, type FadingXoMove } from '@/games/fading-xo/engine';
import {
  LIVE_DUEL_CODE_PATTERN,
  playerRole,
  publicRoom,
  type LiveDuelRoom,
} from '@/lib/liveDuel';
import { sanitizeName } from '@/lib/moderation';
import { createRateLimiter, getClientIp, rateLimitResponse } from '@/lib/server/rateLimit';
import { liveDuelStore } from '@/lib/server/liveDuelStore';

type Params = { params: Promise<{ code: string }> };
const writeLimit = createRateLimiter(120, 60_000);

class DuelActionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function response(room: LiveDuelRoom, playerId: string) {
  return Response.json({ room: publicRoom(room), role: playerRole(room, playerId) });
}

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const playerId = req.nextUrl.searchParams.get('playerId') ?? '';
  if (!LIVE_DUEL_CODE_PATTERN.test(code)) {
    return Response.json({ error: 'Invalid room' }, { status: 400 });
  }
  const room = await liveDuelStore.get(code);
  if (!room) return Response.json({ error: 'Room not found' }, { status: 404 });
  return response(room, playerId);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { limited, retryAfterSeconds } = writeLimit(getClientIp(req));
  if (limited) return rateLimitResponse(retryAfterSeconds);

  const { code } = await params;
  if (!LIVE_DUEL_CODE_PATTERN.test(code)) {
    return Response.json({ error: 'Invalid room' }, { status: 400 });
  }

  let body: {
    action?: unknown;
    playerId?: unknown;
    name?: unknown;
    cell?: unknown;
    version?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body.playerId !== 'string' || body.playerId.length < 8 || body.playerId.length > 64) {
    return Response.json({ error: 'Invalid player' }, { status: 400 });
  }

  let next: LiveDuelRoom | null;
  try {
    next = await liveDuelStore.mutate(code, (room) => {
    if (body.action === 'join') {
      const currentRole = playerRole(room, body.playerId as string);
      if (currentRole) return room;
      if (room.players.O) {
        throw new DuelActionError('Room is full', 409);
      }
      const name = typeof body.name === 'string' ? sanitizeName(body.name) : null;
      if (!name) {
        throw new DuelActionError('Choose a different name', 400);
      }
      return {
        ...room,
        players: { ...room.players, O: { playerId: body.playerId as string, name } },
        status: 'playing',
        version: room.version + 1,
        updatedAt: new Date().toISOString(),
      };
    }

    if (body.action === 'move') {
      const role = playerRole(room, body.playerId as string);
      if (!role) {
        throw new DuelActionError('You are not a player in this room', 403);
      }
      if (room.status !== 'playing' || room.engine.winner) {
        throw new DuelActionError('The duel is not active', 409);
      }
      if (body.version !== room.version) {
        throw new DuelActionError('The board changed—try again', 409);
      }
      if (room.engine.turn !== role) {
        throw new DuelActionError('Wait for your turn', 409);
      }
      if (!Number.isInteger(body.cell) || (body.cell as number) < 0 || (body.cell as number) > 8) {
        throw new DuelActionError('Invalid move', 400);
      }
      const cell = body.cell as number;
      if (room.engine.board[cell] !== null) {
        throw new DuelActionError('That cell is occupied', 409);
      }
      const move: FadingXoMove = isMovementPhase(room.engine, role)
        ? { type: 'move', from: room.engine.queues[role][0], to: cell }
        : { type: 'place', cell };
      const engine = applyMove(room.engine, move);
      return {
        ...room,
        engine,
        status: engine.winner ? 'complete' : 'playing',
        version: room.version + 1,
        updatedAt: new Date().toISOString(),
      };
    }

      throw new DuelActionError('Unknown action', 400);
    });
  } catch (reason) {
    if (reason instanceof DuelActionError) {
      return Response.json({ error: reason.message }, { status: reason.status });
    }
    throw reason;
  }

  if (!next) return Response.json({ error: 'Room not found' }, { status: 404 });
  return response(next, body.playerId);
}
