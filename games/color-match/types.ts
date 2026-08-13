import { Difficulty, Rating } from '@/types/game';
import { RGB } from './colorMath';

export type ColorPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'observing'
  | 'matching'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/** Shared ratings plus "Amazing" for the 95%+ band — see `getColorRating`. */
export type ColorRating = Rating | 'Amazing';

export interface ColorResult {
  /** Colour the player had to recreate. */
  target: RGB;
  /** Colour the player submitted. */
  actual: RGB;
  accuracy: number;
  rating: ColorRating;
  /** Round score out of 10. */
  score: number;
}

export interface ColorGameState {
  phase: ColorPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  target: RGB;
  /** The player's live slider colour. */
  current: RGB;
  observeTimeLeft: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: ColorResult | null;
  isNewBestSession: boolean;
}
