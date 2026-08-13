import { Difficulty } from '@/types/game';
import { FadingXoState, Player } from './engine';

export type FadingXoPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'playing'
  | 'game-result'
  | 'round-result'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/** Outcome of one best-of-3 game, from the human player's side. */
export type GameOutcome = 'win' | 'loss' | 'draw';

/** A completed round's best-of-3 record. */
export interface FadingXoRoundResult {
  difficulty: Difficulty;
  wins: number;
  draws: number;
  losses: number;
  outcomes: GameOutcome[];
  /** Round score out of 10 — see `score10` in constants.ts. */
  score: number;
}

export interface FadingXoGameState {
  phase: FadingXoPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  round: number;
  totalRounds: number;
  /** 1-based index of the game in progress within the current round's
   *  best-of-3 (1, 2 or 3). */
  gameIndex: number;
  /** This round's best-of-3 record so far. */
  wins: number;
  draws: number;
  losses: number;
  outcomes: GameOutcome[];
  /** The live board/queues/turn for the game in progress. */
  engine: FadingXoState;
  /** Who opened the game currently in progress. */
  starter: Player;
  /** Set the moment a single game ends; cleared when the next one starts. */
  lastOutcome: GameOutcome | null;
  isBotThinking: boolean;
  totalScore: number;
  roundScores: number[];
  result: FadingXoRoundResult | null;
  isNewBestSession: boolean;
}
