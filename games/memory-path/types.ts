import { Difficulty, Rating } from '@/types/game';
import { Cell } from './pathGen';

export type PathPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'revealing'
  | 'memorize'
  | 'fading'
  | 'tracing'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

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
  mode: GameMode;
  difficulty: Difficulty | null;
  path: Cell[];
  /** How many path cells are lit so far during the reveal. */
  revealCount: number;
  traced: Cell[];
  /** Live stopwatch for the tracing phase, in ms. */
  traceMs: number;
  /** True the instant the trace completes, ~380ms before scoring lands
   *  (phase is still 'tracing'). Drives disabling trace controls early. */
  locked: boolean;
  round: number;
  totalRounds: number;
  score: number;
  totalScore: number;
  roundScores: number[];
  result: PathResult | null;
  isNewBestSession: boolean;
}
