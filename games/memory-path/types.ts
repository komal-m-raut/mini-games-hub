import { Difficulty, Rating } from '@/types/game';
import { Cell } from './pathGen';

export type PathPhase =
  | 'selecting-difficulty'
  | 'revealing'
  | 'memorize'
  | 'fading'
  | 'tracing'
  | 'results'
  | 'session-complete';

export interface PathResult {
  accuracy: number;
  correct: number;
  mistakes: number;
  /** Seconds spent tracing. */
  seconds: number;
  rating: Rating;
  /** Round score out of 10. */
  score: number;
  /** Correctness per traced cell, for the highlighted replay. */
  marks: boolean[];
  pathLength: number;
}

export interface PathGameState {
  phase: PathPhase;
  difficulty: Difficulty | null;
  path: Cell[];
  /** How many path cells are lit so far during the reveal. */
  revealCount: number;
  traced: Cell[];
  /** Live stopwatch for the tracing phase, in ms. */
  traceMs: number;
  round: number;
  totalRounds: number;
  score: number;
  totalScore: number;
  roundScores: number[];
  result: PathResult | null;
  isNewBestSession: boolean;
}
