import { Difficulty } from '@/types/game';

export type FrenzyPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'countdown'
  | 'running'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/**
 * A target currently live in the arena. Position and starting radius are
 * fixed for the target's whole lifetime — only its shrink/fade progress
 * (driven separately, see useTapFrenzyGame's `progress` MotionValue)
 * animates, so this never needs to change once spawned.
 */
export interface LiveTarget {
  id: number;
  /** Fraction 0–1, converted to arena px at render time. */
  x: number;
  y: number;
  /** Starting radius in px, from the difficulty config. */
  radius: number;
  lifetimeMs: number;
}

/**
 * Running tally for the round in progress — also the exact shape
 * `scoreRound` takes, so the live state and the final score share one
 * definition.
 */
export interface RoundStats {
  /** Targets that fully appeared this round, hit or not. */
  spawned: number;
  hits: number;
  /** Sum of hit latencies (ms) — divide by `hits` for the mean. */
  totalLatencyMs: number;
  bestCombo: number;
}

export interface RoundResult extends RoundStats {
  hitRate: number;
  /** 0 when `hits` is 0 — there is nothing to average. */
  meanHitMs: number;
  /** Round score out of 10. */
  score: number;
}

export interface FrenzyGameState {
  phase: FrenzyPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 3 → 2 → 1 before each round; 0 while the round runs. */
  countdown: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: RoundResult | null;
  isNewBestSession: boolean;

  // Live HUD + in-progress tally — meaningful only in the 'running' phase,
  // reset at the start of every round.
  /** Whole seconds left in the current 30s round. */
  timeLeft: number;
  /** The one target currently visible, or null during the brief post-miss gap. */
  target: LiveTarget | null;
  spawned: number;
  hits: number;
  totalLatencyMs: number;
  combo: number;
  bestCombo: number;
}
