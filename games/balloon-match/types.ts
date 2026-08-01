import { Difficulty, GameMode, GamePhase, GameResult } from '@/types/game';

/**
 * Balloon Match's own phase list. Extends the shared `GamePhase` with
 * `adjusting` (U8): releasing the hold no longer scores the round directly —
 * it drops into a fine-adjust step with −/+ controls and a "Lock In" action,
 * which is also the C4 keyboard-play fix (real buttons with aria-labels).
 * Declared locally rather than editing the shared `GamePhase` union.
 */
export type BalloonPhase = GamePhase | 'adjusting';

export interface BalloonGameState {
  phase: BalloonPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  targetUnits: number;
  targetColor: string;
  currentUnits: number;
  observeTimeLeft: number;
  inflateTimeLeft: number;
  round: number;
  /** Fixed rounds per session: 5 in normal mode, 3 in challenge mode. */
  totalRounds: number | null;
  /** Latest round score, out of 10. Resets every round/new game. */
  score: number;
  /** Running total across the session's rounds (max 50 normal / 30 challenge). */
  totalScore: number;
  /** Per-round scores for the current session. */
  roundScores: number[];
  /** Latest round beat the stored best single-round score. */
  isNewHighScore: boolean;
  /** Normal mode: this session's total beat the stored best session. */
  isNewBestSession: boolean;
  result: GameResult | null;
  isHolding: boolean;
}
