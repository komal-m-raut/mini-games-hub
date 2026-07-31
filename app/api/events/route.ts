import { NextRequest } from 'next/server';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { statsStore } from '@/lib/server/statsStore';
import { createRateLimiter, getClientIp, rateLimitResponse } from '@/lib/server/rateLimit';

/**
 * Fire-and-forget gameplay events. Currently one type:
 * { type: 'play', gameId, playerId } — sent when a player completes a round.
 */
const eventsRateLimit = createRateLimiter(60, 60_000);

export async function POST(req: NextRequest) {
  const { limited, retryAfterSeconds } = eventsRateLimit(getClientIp(req));
  if (limited) return rateLimitResponse(retryAfterSeconds);

  let body: { type?: string; gameId?: string; playerId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, gameId, playerId } = body;
  const knownGame = GAME_REGISTRY.some((g) => g.id === gameId && g.isAvailable);

  if (
    type !== 'play' ||
    !knownGame ||
    typeof playerId !== 'string' ||
    playerId.length < 8 ||
    playerId.length > 64
  ) {
    return Response.json({ error: 'Invalid event' }, { status: 400 });
  }

  await statsStore.recordPlay(gameId!, playerId);
  return new Response(null, { status: 204 });
}
