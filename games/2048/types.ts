import { Direction } from './engine';

export type Game2048Mode = 'solo' | 'challenge';

export type Game2048Phase =
  | 'menu'
  | 'challenge-intro'
  | 'countdown'
  | 'playing'
  | 'round-results'
  | 'challenge-complete'
  | 'game-over';

export type { Direction };

/** Snapshot the single undo slot can restore — solo mode only. */
export interface UndoSnapshot {
  board: number[];
  score: number;
  moves: number;
}

export interface Game2048RoundResult {
  /** Raw merge points scored this round. */
  points: number;
  /** Round score out of 10 (calculateSprintScore(points)). */
  score10: number;
}

export interface Game2048State {
  phase: Game2048Phase;
  mode: Game2048Mode;

  board: number[];
  /** Raw merge points — endless running total in solo, per-round total in
   *  challenge (reset each round). */
  score: number;
  moves: number;
  bestTileThisRun: number;

  /** True once this run's board has reached a 2048 tile — sticky for the
   *  rest of the run so "Keep Going" doesn't retrigger the banner on the
   *  next merge past 2048. */
  won: boolean;
  /** Whether the "You reached 2048!" banner is currently showing. */
  showWonBanner: boolean;

  /** One-shot undo, solo mode only. `undoUsed` latches true the moment it's
   *  spent and never resets until a new game starts. */
  undoSnapshot: UndoSnapshot | null;
  undoUsed: boolean;

  /** True immediately after a move actually slid/merged something, so the
   *  UI can play a pop/slide animation; cleared on the next tick. */
  lastMoveDir: Direction | null;

  // ── Challenge-only fields ──────────────────────────────────────────
  round: number;
  totalRounds: number;
  countdown: number;
  timeLeft: number;
  roundScores: number[];
  result: Game2048RoundResult | null;

  // ── Solo session-complete fields ───────────────────────────────────
  isNewBestScore: boolean;
}
