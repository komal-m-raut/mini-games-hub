import { NextRequest } from 'next/server';
import { ScoreEntry } from '@/types/game';
import { CHALLENGE_ROUND_COUNT, MAX_CHALLENGE_SCORE } from '@/lib/challenge';
import { MAX_ROUND_SCORE } from '@/utils/scoring';
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
};

const BOARD_PATTERN = /^[a-z0-9-]{1,40}$/;

// Scores POST is the more "expensive"/impactful write (feeds public
// leaderboards); keep it tighter than the events limiter below.
const scoresRateLimit = createRateLimiter(10, 60_000);

type Params = { params: Promise<{ gameId: string; board: string }> };

async function validateParams(params: Params['params']) {
  const { gameId, board } = await params;
  if (!GAME_RULES[gameId] || !BOARD_PATTERN.test(board)) return null;
  return { gameId, board, rules: GAME_RULES[gameId] };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const parsed = await validateParams(params);
  if (!parsed) {
    return Response.json({ error: 'Unknown game or board' }, { status: 400 });
  }
  const entries = await scoreStore.getBoard(parsed.gameId, parsed.board);
  return Response.json({ entries });
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
      roundScores.every(
        (s) => Number.isInteger(s) && s >= 0 && s <= rules.rounds!.maxPerRound
      );
    if (!valid) {
      return Response.json({ error: 'Invalid round scores' }, { status: 400 });
    }
    score = roundScores.reduce((a, b) => a + b, 0);
  } else {
    score = typeof body.score === 'number' ? body.score : NaN;
  }

  // NOTE: scores are integers-only for now (Number.isInteger below). A later
  // change allows two decimal places (e.g. 7.46) — when that lands, this
  // becomes a bounds + step check instead of an integer check. Don't touch
  // the round-score validation above in the meantime; it has the same
  // assumption baked in.
  if (!Number.isInteger(score) || score < 0 || score > rules.maxScore) {
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
