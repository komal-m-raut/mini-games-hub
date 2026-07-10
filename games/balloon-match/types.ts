import { Difficulty, GamePhase, GameResult } from '@/types/game';

export interface BalloonGameState {
  phase: GamePhase;
  difficulty: Difficulty | null;
  targetUnits: number;
  targetColor: string;
  currentUnits: number;
  observeTimeLeft: number;
  round: number;
  score: number;
  highScore: number;
  isNewHighScore: boolean;
  result: GameResult | null;
  isHolding: boolean;
}
