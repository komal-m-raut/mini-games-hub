import { Difficulty } from '@/types/game';

/** 5-tier rating local to this game — the shared `Rating` only has 4 tiers
 *  and is used by other games, so it can't fit Timing Tap's finer bands. */
export type TapRating = 'Perfect' | 'Amazing' | 'Great' | 'Good' | 'Try Again';

export type TapPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'countdown'
  | 'running'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface TapResult {
  /** Where the indicator stopped, 0–100 across the bar. */
  position: number;
  /** Absolute distance from the bar's centre, in bar-percent. */
  distance: number;
  accuracy: number;
  rating: TapRating;
  /** Round score out of 10. */
  score: number;
  /** Zone half-width the round was judged against, for the result readout. */
  zoneHalfWidth: number;
}

export interface TapGameState {
  phase: TapPhase;
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
  result: TapResult | null;
  /** True while the Perfect slow-motion hold plays, before the result screen. */
  isSlowMotion: boolean;
  isNewBestSession: boolean;
}
