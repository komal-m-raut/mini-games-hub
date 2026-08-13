import { Difficulty, GameMode } from '@/types/game';

export type PairChasePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'playing'
  | 'round-complete'
  | 'session-complete'
  | 'challenge-complete';

export interface PairChaseResult {
  flips: number;
  elapsedSeconds: number;
  /** Round score out of 10. */
  score: number;
}

export interface PairChaseGameState {
  phase: PairChasePhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** Current round's board — one emoji per cell, each value appearing
   *  exactly twice. Length is always `2 * pairs` for the round's difficulty. */
  board: string[];
  /** Indices permanently face-up (a confirmed pair). */
  matched: number[];
  /** Indices currently face-up but not yet resolved this turn — 0, 1, or 2
   *  entries. Stays at 2 for the 600ms mismatch hold before clearing. */
  pending: number[];
  /** True while `pending` holds a confirmed mismatch, during its 600ms hold
   *  before the two cards flip back down — lets the grid style them apart
   *  from an in-progress (not-yet-resolved) single flip. */
  mismatch: boolean;
  /** Total card flips this round (idempotent taps don't count). */
  flips: number;
  /** Seconds elapsed this round, counting up — paused while the tab is
   *  hidden. Only shapes score via the difficulty's time par; there is no
   *  hard time limit. */
  elapsedSeconds: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: PairChaseResult | null;
  isNewBestSession: boolean;
}
