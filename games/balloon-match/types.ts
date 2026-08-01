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
  /** Fixed rounds per session: 5 in normal mode, 3 in challenge mode. */
  totalRounds: number | null;
  /** Latest round score, out of 10. Resets every round/new game. */
  score: number;
  /** Running total across the session's rounds (max 50 normal / 30 challenge). */
  totalScore: number;
  /** Per-round scores for the current session. */
  roundScores: number[];
  /** Latest round beat the stored best single-round score. */
  isNewHighScore: boolean;
  /** Normal mode: this session's total beat the stored best session. */
  isNewBestSession: boolean;
  result: GameResult | null;
  isHolding: boolean;
}
