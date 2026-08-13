import { Difficulty, GameMode } from '@/types/game';
import { Board } from './engine';

export type MinesweeperPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'playing'
  | 'round-complete'
  | 'session-complete'
  | 'challenge-complete';

export interface MinesweeperResult {
  won: boolean;
  timeSeconds: number;
  safeRevealed: number;
  safeTotal: number;
  /** Round score out of 10. */
  score: number;
}

export interface MinesweeperGameState {
  phase: MinesweeperPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  board: Board | null;
  /** Solo only: mines are placed lazily on the first reveal (so that click
   *  is guaranteed safe) — false until that first reveal happens. Challenge
   *  boards are seeded up front, so this is always true in challenge mode. */
  minesPlaced: boolean;
  /** True once any tap/flag has happened this round — gates the timer, so
   *  a challenge board's pre-revealed opening region doesn't itself start
   *  the clock. */
  hasInteracted: boolean;
  /** Touch-friendly toggle: while on, a plain tap flags instead of
   *  revealing (long-press/right-click always flags either way). */
  flagMode: boolean;
  /** Seconds elapsed this round, counting up from the first interaction —
   *  paused while the tab is hidden. */
  elapsedSeconds: number;
  /** The mine that ended the round, once lost. */
  lostIndex: number | null;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: MinesweeperResult | null;
  isNewBestSession: boolean;
}
