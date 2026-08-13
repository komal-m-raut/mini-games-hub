import { Difficulty, GameMode } from '@/types/game';

export type ShapeType = 'rectangle' | 'ellipse' | 'triangle';

export type ShapePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'flashing'
  | 'recreating'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

/**
 * Target geometry. `cx`/`cy`/`width` are fractions of the (square) stage,
 * 0-1, so the same numbers describe the shape at any rendered pixel size.
 * `ratio` is height/width for rectangle and ellipse; triangle ignores it and
 * uses `width` alone (an equilateral triangle has one degree of freedom).
 * `rotation` is degrees, 0-180.
 */
export interface ShapeGeom {
  type: ShapeType;
  cx: number;
  cy: number;
  width: number;
  ratio: number;
  rotation: number;
}

/**
 * The player's recreated shape. Same `type` and `ratio` as the target — the
 * aspect ratio is given, not recreated (see spec) — only position, size and
 * rotation are under the player's control.
 */
export interface GuessGeom {
  cx: number;
  cy: number;
  width: number;
  rotation: number;
}

export interface ShapeResult {
  target: ShapeGeom;
  guess: GuessGeom;
  /** Each component clamped to [0, 1] before weighting. */
  posAcc: number;
  sizeAcc: number;
  rotAcc: number;
  /** 0-100, one decimal place. */
  accuracy: number;
  /** Round score out of 10. */
  score: number;
}

export interface ShapeGameState {
  phase: ShapePhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  target: ShapeGeom;
  guess: GuessGeom;
  /** Whole seconds left in the current flash, for the numeric countdown. */
  flashTimeLeft: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: ShapeResult | null;
  isNewBestSession: boolean;
}
