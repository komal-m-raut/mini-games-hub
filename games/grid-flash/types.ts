import { Difficulty, Rating } from '@/types/game';

export type GridFlashPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'flash'
  | 'recall'
  | 'level-complete'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface GridFlashResult {
  /** Highest level (lit-tile count) fully reproduced this round. 2 if none. */
  peak: number;
  /** Round score out of 10, from `peak` against the difficulty's par. */
  score: number;
  rating: Rating;
  /** How many of the round's 3 lives were spent on wrong taps. */
  livesLost: number;
  /** Levels fully cleared this round (peak - 2, floored at 0). */
  levelsCleared: number;
}

export interface GridFlashGameState {
  phase: GridFlashPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** Current level's lit-tile count — starts at 3, +1 per level cleared. */
  level: number;
  /** Current level's lit cell indices. Only meaningful during 'flash' (and
   *  briefly 'level-complete', once fully matched by `selected`). */
  pattern: number[];
  /** Cells correctly tapped so far this level, in tap order. */
  selected: number[];
  /** The most recent wrong tap, flashing red until it clears itself. */
  wrongCell: number | null;
  /** Lives remaining this round (round-scoped, starts at 3). */
  lives: number;
  /** Highest level completed so far this round (2 if none yet). */
  peak: number;
  /** Bumped every time a level's flash (re)starts — including a
   *  visibility-driven replay of the *same* level — so the memorize bar's
   *  width animation always has a fresh key to restart from. */
  flashKey: number;
  round: number;
  totalRounds: number;
  score: number;
  totalScore: number;
  roundScores: number[];
  result: GridFlashResult | null;
  isNewBestSession: boolean;
}
