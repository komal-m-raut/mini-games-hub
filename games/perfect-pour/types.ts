import { Difficulty, Rating } from '@/types/game';

export type PourPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'filling'
  | 'observing'
  | 'pouring'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

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
  mode: GameMode;
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
