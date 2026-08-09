import { NextRequest } from 'next/server';
import { ScoreEntry } from '@/types/game';
import { CHALLENGE_ROUND_COUNT, MAX_CHALLENGE_SCORE } from '@/lib/challenge';
import { MAX_ROUND_SCORE, round2 } from '@/utils/scoring';
import { scoreStore, upsertScore } from '@/lib/server/scoreStore';
import { createRateLimiter, getClientIp, rateLimitResponse } from '@/lib/server/rateLimit';
import { sanitizeName } from '@/lib/moderation';

/**
 * Shared scores API for every game: /api/scores/{gameId}/{board}
 * A board is any leaderboard bucket — challenge code, daily-YYYYMMDD, global.
 * New games only need an entry in GAME_RULES.
 */
interface GameRules {
  maxScore: number;
  /** Set for round-based games: score is derived from roundScores server-side. */
  rounds?: { count: number; maxPerRound: number };
}

// Every round-based challenge game shares the same 3-round shape.
const CHALLENGE_RULES: GameRules = {
  maxScore: MAX_CHALLENGE_SCORE,
  rounds: { count: CHALLENGE_ROUND_COUNT, maxPerRound: MAX_ROUND_SCORE },
};

const GAME_RULES: Record<string, GameRules> = {
  'balloon-match': CHALLENGE_RULES,
  'perfect-pour': CHALLENGE_RULES,
  'memory-path': CHALLENGE_RULES,
  'timing-tap': CHALLENGE_RULES,
};

const BOARD_PATTERN = /^[a-z0-9-]{1,40}$/;

/**
 * Scores support up to 2 decimal places (R2). A plain `Math.round(s*100) ===
 * s*100` step check fails for legitimate values (float artefacts like
 * `7.1 * 100 === 709.9999999999999`), so instead: round `s` to 2dp via the
 * same float-safe `round2` used everywhere else, and accept it if that's
 * within float noise of the original — i.e. `s` was already (at most) a 2dp
 * value, not a 3dp one sneaking past a naive check.
 */
function isValidRoundScore(s: unknown, max: number): s is number {
  return (
    typeof s === 'number' &&
    Number.isFinite(s) &&
    s >= 0 &&
    s <= max &&
    Math.abs(s - round2(s)) < 1e-9
  );
}

// Scores POST is the more "expensive"/impactful write (feeds public
// leaderboards); keep it tighter than the events limiter below.
const scoresRateLimit = createRateLimiter(10, 60_000);

type Params = { params: Promise<{ gameId: string; board: string }> };

async function validateParams(params: Params['params']) {
  const { gameId, board } = await params;
  if (!GAME_RULES[gameId] || !BOARD_PATTERN.test(board)) return null;
  return { gameId, board, rules: GAME_RULES[gameId] };
}

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;

/**
 * Clamp a query param to a whole number in range, falling back on garbage.
 *
 * The absent/empty check has to come first: `Number(null)` and `Number('')`
 * are both `0`, not `NaN`, so a missing `limit` would otherwise pass the
 * integer test and clamp to `min` — serving one row per page instead of the
 * default five.
 */
function intParam(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * GET /api/scores/{gameId}/{board}?offset=&limit=
 *
 * Paged so the client can render the first few rows and pull the rest as the
 * player scrolls, instead of shipping up to MAX_BOARD_SIZE entries to draw
 * five. `total` is the post-pruning board size, so it already excludes
 * entries that have aged out of the retention window.
 *
 * The store still reads the whole board behind this — boards are one JSON
 * blob per key, so paging here bounds the *response*, not the backend read.
 * Making it bound both means per-entry keys plus a sorted set, which is a
 * storage-layer change well beyond this endpoint.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const parsed = await validateParams(params);
  if (!parsed) {
    return Response.json({ error: 'Unknown game or board' }, { status: 400 });
  }

  const all = await scoreStore.getBoard(parsed.gameId, parsed.board);
  const limit = intParam(req.nextUrl.searchParams.get('limit'), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = intParam(req.nextUrl.searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER);

  const entries = all.slice(offset, offset + limit);
  const nextOffset = offset + entries.length < all.length ? offset + entries.length : null;

  return Response.json({ entries, total: all.length, nextOffset });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { limited, retryAfterSeconds } = scoresRateLimit(getClientIp(req));
  if (limited) return rateLimitResponse(retryAfterSeconds);

  const parsed = await validateParams(params);
  if (!parsed) {
    return Response.json({ error: 'Unknown game or board' }, { status: 400 });
  }
  const { gameId, board, rules } = parsed;

  let body: Partial<ScoreEntry>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { playerId, name, roundScores } = body;
  if (
    typeof playerId !== 'string' ||
    playerId.length < 8 ||
    playerId.length > 64 ||
    typeof name !== 'string' ||
    name.trim().length === 0
  ) {
    return Response.json({ error: 'Invalid score submission' }, { status: 400 });
  }

  // Round-based games: score is always derived server-side from the rounds.
  let score: number;
  if (rules.rounds) {
    const valid =
      Array.isArray(roundScores) &&
      roundScores.length === rules.rounds.count &&
      roundScores.every((s) => isValidRoundScore(s, rules.rounds!.maxPerRound));
    if (!valid) {
      return Response.json({ error: 'Invalid round scores' }, { status: 400 });
    }
    score = round2(roundScores.reduce((a, b) => a + b, 0));
  } else {
    score = typeof body.score === 'number' ? body.score : NaN;
  }

  // Scores support up to 2 decimal places (R2) — same float-safe bounds +
  // step check as the per-round validation above, not an integer check.
  if (!isValidRoundScore(score, rules.maxScore)) {
    return Response.json({ error: 'Invalid score' }, { status: 400 });
  }

  const cleanName = sanitizeName(name);
  if (cleanName === null) {
    return Response.json(
      { error: 'That name is not allowed, please try something else.' },
      { status: 400 }
    );
  }

  const entry: ScoreEntry = {
    playerId,
    name: cleanName,
    score,
    ...(rules.rounds ? { roundScores } : {}),
    createdAt: new Date().toISOString(),
  };

  const entries = await upsertScore(gameId, board, entry);
  // Every challenge result also feeds the all-time board (best run per player)
  if (board !== 'global') {
    await upsertScore(gameId, 'global', entry);
  }
  return Response.json({ entries });
}
