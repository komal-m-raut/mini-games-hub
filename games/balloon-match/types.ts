import { Difficulty, GameMode, GamePhase, GameResult } from '@/types/game';

export interface BalloonGameState {
  phase: GamePhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  targetUnits: number;
  targetColor: string;
  currentUnits: number;
  observeTimeLeft: number;
  inflateTimeLeft: number;
  round: number;
  /** Challenge mode: fixed number of rounds. Normal mode: null (endless). */
  totalRounds: number | null;
  /** Latest round score, out of 10. Resets every round/new game. */
  score: number;
  /** Challenge mode: running total across rounds (max 30). */
  totalScore: number;
  /** Challenge mode: per-round scores. */
  roundScores: number[];
  /** Best single-round score (out of 10), from localStorage. */
  highScore: number;
  isNewHighScore: boolean;
  result: GameResult | null;
  isHolding: boolean;
}
