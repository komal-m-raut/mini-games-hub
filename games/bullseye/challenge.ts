import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { BOARD_RADIUS, BULLSEYE_DIFFICULTY, DARTS_PER_ROUND, LEG_SCALE_COUNT, makeWobble } from './constants';

const GAME_ID = 'bullseye';

/** One dart's fully-seeded throw: both aim-line starting phases, Hard's
 *  per-leg drift on each axis, and the landing wobble — everything the
 *  player doesn't control but a fair challenge still has to pin down. */
export interface DartConfig {
  /** Radians — vertical aim line's phase at the moment aiming starts. */
  yPhase: number;
  /** Radians — horizontal aim line's phase at the moment aiming starts. */
  xPhase: number;
  /** Per-leg duration drift for the vertical read; `[1]` outside Hard. */
  yLegScales: number[];
  /** Per-leg duration drift for the horizontal read; `[1]` outside Hard. */
  xLegScales: number[];
  wobble: { dx: number; dy: number };
}

export interface BullseyeChallengeRound {
  difficulty: Difficulty;
  /** Exactly DARTS_PER_ROUND entries, thrown in order. */
  darts: DartConfig[];
}

/**
 * One dart's seeded config for a difficulty, drawn from `rand`. Shared by
 * the challenge generator below and by solo rounds (called with
 * `Math.random`) so a dart's shape — two phases, optional drift, one wobble
 * — lives in exactly one place, the same reasoning as Timing Tap's
 * `makeTapRound`.
 */
function makeDart(difficulty: Difficulty, rand: () => number): DartConfig {
  const cfg = BULLSEYE_DIFFICULTY[difficulty];
  const yPhase = rand() * 2 * Math.PI;
  const xPhase = rand() * 2 * Math.PI;
  const legScale = () =>
    cfg.legDriftPercent === 0 ? 1 : 1 - cfg.legDriftPercent + rand() * (2 * cfg.legDriftPercent);
  const yLegScales = Array.from({ length: LEG_SCALE_COUNT }, legScale);
  const xLegScales = Array.from({ length: LEG_SCALE_COUNT }, legScale);
  const wobble = makeWobble(cfg.wobbleRadiusPercent * BOARD_RADIUS, rand);
  return { yPhase, xPhase, yLegScales, xLegScales, wobble };
}

/** A full round's 5 darts for a difficulty, drawn from `rand` in throw order. */
export function makeBullseyeRound(
  difficulty: Difficulty,
  rand: () => number
): Omit<BullseyeChallengeRound, 'difficulty'> {
  return { darts: Array.from({ length: DARTS_PER_ROUND }, () => makeDart(difficulty, rand)) };
}

/** Same 3 seeded rounds (easy → medium → hard, 5 darts each) for a code on
 *  every device. */
export function getBullseyeChallengeRounds(code: string): BullseyeChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    ...makeBullseyeRound(difficulty, rand),
  }));
}
