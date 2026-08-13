import { Difficulty } from '@/types/game';
import { round2 } from '@/utils/scoring';

/**
 * Time Sense: SHOW a duration once (a bar fills over it, exactly), then
 * RECREATE it from feel by holding a button for what you believe was the
 * same length of time. Feedback during the hold is what actually separates
 * the difficulties — the target range widens too, but the harder rounds are
 * mostly harder because you're told less while you're doing it.
 */
export interface TimeSenseDifficultyConfig {
  label: string;
  /** Target duration range, in seconds (2dp). */
  minSeconds: number;
  maxSeconds: number;
  color: string;
  glow: string;
  /** Easy only: RECREATE renders a glow that grows while held (no numbers). */
  showHoldGlow: boolean;
  /** Hard only: the stage breathes at DECOY_HZ during RECREATE, deliberately
   *  out of step with any real target, to fight the player's internal count. */
  decoy: boolean;
}

export const TIME_SENSE_DIFFICULTY: Record<Difficulty, TimeSenseDifficultyConfig> = {
  easy: {
    label: 'Easy',
    minSeconds: 1.5,
    maxSeconds: 3.0,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
    showHoldGlow: true,
    decoy: false,
  },
  medium: {
    label: 'Medium',
    minSeconds: 1.0,
    maxSeconds: 4.5,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    showHoldGlow: false,
    decoy: false,
  },
  hard: {
    label: 'Hard',
    minSeconds: 2.0,
    maxSeconds: 6.0,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    showHoldGlow: false,
    decoy: true,
  },
};

/** Hard's decoy background pulse tempo — fixed and unrelated to any target
 *  duration, so it can't accidentally line up with the answer. */
export const DECOY_HZ = 0.8;

/** Easy's hold glow saturates on this fixed timescale, independent of the
 *  round's own target — it shows "you're holding", not "you're close", so a
 *  player can't back-calculate the answer from how bright it's gotten. */
export const HOLD_GLOW_SATURATION_MS = 4000;

/**
 * Draws one target duration for a difficulty, in seconds to 2dp. Pure and
 * seed-friendly: pass `Math.random` for solo rounds, or a seeded `rand` (see
 * `challenge.ts`) so a challenge code produces identical targets everywhere.
 */
export function makeDuration(difficulty: Difficulty, rand: () => number = Math.random): number {
  const cfg = TIME_SENSE_DIFFICULTY[difficulty];
  const seconds = cfg.minSeconds + rand() * (cfg.maxSeconds - cfg.minSeconds);
  return round2(seconds);
}

/** Formats a millisecond duration the way the player sees it, e.g. "2.40s". */
export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Signed miss readout, e.g. "+0.32s over" / "−0.18s under" / "Exact!". */
export function formatSignedError(errorMs: number): string {
  const rounded = Math.round(errorMs);
  if (rounded === 0) return 'Exact!';
  const sign = rounded > 0 ? '+' : '−';
  const direction = rounded > 0 ? 'over' : 'under';
  return `${sign}${(Math.abs(rounded) / 1000).toFixed(2)}s ${direction}`;
}
