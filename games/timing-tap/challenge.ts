import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { MIN_START_OFFSET, SPEED_SCALE_COUNT, TAP_DIFFICULTY } from './constants';

const GAME_ID = 'timing-tap';

export interface TapChallengeRound {
  difficulty: Difficulty;
  /** Indicator start position on the bar, 0–100 — seeded so everyone gets it. */
  startPosition: number;
  /** 1 = moving right, -1 = moving left. */
  direction: 1 | -1;
  /** Per-leg speed multipliers, cycled at each bounce (Hard's drift). */
  speedScales: number[];
}

// The offsets are symmetric around the 50 centre (6..94), so this is the
// farthest a start position can sit from centre either side.
const MAX_START_DISTANCE = 50 - MIN_START_OFFSET;

/**
 * One round's start/direction/speed for a difficulty, drawn from `rand`.
 * Shared by the seeded challenge generator below and by solo rounds (which
 * call it with `Math.random`) so the "never start inside the zone" rule
 * lives in exactly one place.
 *
 * The start distance is drawn from the span that is both inside
 * [MIN_START_OFFSET, MAX_START_OFFSET] and outside the Perfect Zone
 * (`zoneHalfWidth`, exclusive), then given a side — by construction, not by
 * rejection-sampling, so it stays deterministic for a seeded `rand`.
 */
export function makeTapRound(
  difficulty: Difficulty,
  rand: () => number
): Omit<TapChallengeRound, 'difficulty'> {
  const cfg = TAP_DIFFICULTY[difficulty];
  const distance = cfg.zoneHalfWidth + rand() * (MAX_START_DISTANCE - cfg.zoneHalfWidth);
  const side = rand() < 0.5 ? -1 : 1;
  const startPosition = 50 + side * distance;
  const direction: 1 | -1 = rand() < 0.5 ? -1 : 1;

  const speedScales = Array.from({ length: SPEED_SCALE_COUNT }, () =>
    cfg.speedJitter === 0 ? 1 : 1 - cfg.speedJitter + rand() * (2 * cfg.speedJitter)
  );

  return { startPosition, direction, speedScales };
}

/** Same 3 seeded rounds (easy → medium → hard) for a code on every device. */
export function getTapChallengeRounds(code: string): TapChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    ...makeTapRound(difficulty, rand),
  }));
}
