import { Difficulty } from '@/types/game';
import { BoardState } from './engine';

export type XOPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'playing'
  | 'game-result'
  | 'round-result'
  | 'session-complete'
  | 'challenge-complete';

export type XOMode = 'normal' | 'challenge';

export type GameOutcome = 'win' | 'loss' | 'draw';

/** One finished game inside a round's best-of-3. */
export interface GameRecord {
  outcome: GameOutcome;
}

export interface XOGameState {
  phase: XOPhase;
  mode: XOMode;
  difficulty: Difficulty | null;

  /** 1-based round index within the session/challenge. */
  round: number;
  totalRounds: number;

  /** 1-based game index within the current round's best-of-3. */
  gameIndex: number;

  board: BoardState;
  /** Selected piece's cell, movement phase only; null otherwise. */
  selected: number | null;
  /** True while the bot's "thinking" delay is running — drives the pulse. */
  botThinking: boolean;

  /** Outcomes of games finished so far in the round in progress. */
  roundGames: GameRecord[];
  /** The game that just finished — drives the game-result screen. */
  lastGame: GameRecord | null;

  /** One entry per finished round, each out of 10. */
  roundScores: number[];
  totalScore: number;
  isNewBestSession: boolean;

  /** Aggregate record across the whole session/challenge, for deciding
   *  whether the final screen counts as an overall win (→ celebrate). */
  sessionWins: number;
  sessionLosses: number;
  sessionDraws: number;
}
