import { Difficulty, Rating } from '@/types/game';

export type PourPhase =
  | 'selecting-difficulty'
  | 'filling'
  | 'observing'
  | 'pouring'
  | 'results'
  | 'session-complete';

export interface PourResult {
  /** Fill the player had to match, 0–100. */
  targetFill: number;
  /** Fill the player poured, 0–100. */
  actualFill: number;
  /** Absolute miss in percentage points. */
  diff: number;
  accuracy: number;
  rating: Rating;
  /** Round score out of 10. */
  score: number;
}

export interface PourGameState {
  phase: PourPhase;
  difficulty: Difficulty | null;
  targetFill: number;
  currentFill: number;
  observeTimeLeft: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: PourResult | null;
  isPouring: boolean;
  isNewBestSession: boolean;
}
