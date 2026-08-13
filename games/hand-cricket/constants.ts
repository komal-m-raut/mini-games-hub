import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';

export const GAME_ID = 'hand-cricket';

/** Both solo and challenge play 3 matches. */
export const TOTAL_MATCHES = 3;

/** Suspense beat between the player's pick and both hands flipping. */
export const REVEAL_MS = 400;

/** How long a resolved ball's outcome stays on screen before the next ball
 *  (or the innings/match transition) is queued up. */
export const RESULT_LINGER_MS = 900;

export interface HandCricketDifficultyConfig {
  label: string;
  qualifier: string;
  color: string;
  glow: string;
}

export const HAND_CRICKET_DIFFICULTY: Record<Difficulty, HandCricketDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Bowls and bats at random',
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Never repeats its last throw',
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Reads your patterns',
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

export type MatchResult = 'win' | 'tie' | 'loss';

/** Second-innings target: one more than the player's first-innings total —
 *  the classic hand cricket convention (equal scores are a tie, not a win). */
export function getTarget(playerRuns: number): number {
  return playerRuns + 1;
}

/**
 * Match score out of 10. The player always bats first, so a "win" only
 * happens by bowling the bot out before it reaches the target — there is no
 * separate "win batting" case.
 *  - win: 7 plus up to 3 more, scaled by how many runs short of the target
 *    the bot fell (margin = target − botRuns), maxed out at a 20-run
 *    margin.
 *  - tie: a flat 5 — the bot went out exactly one run short of the target
 *    (botRuns === playerRuns), so neither side is credited a win.
 *  - loss: up to 4.9 (never a full 5, since letting the chase complete
 *    costs something), scaled by how much of the target the player's own
 *    first-innings total represents.
 */
export function scoreMatch(
  result: MatchResult,
  playerRuns: number,
  botRuns: number,
  target: number
): number {
  if (result === 'tie') return 5;
  if (result === 'win') {
    const margin = target - botRuns;
    return round2(7 + clamp(margin / 20, 0, 1) * 3);
  }
  return round2(clamp((playerRuns / target) * 5, 0, 4.9));
}
