import { Difficulty, Rating } from '@/types/game';
import { MathQuestion } from './constants';

export type MathPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'countdown'
  | 'playing'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface MathRoundResult {
  difficulty: Difficulty;
  correct: number;
  /** Wrong submissions plus skips. */
  wrong: number;
  /** Round score out of 10. */
  score: number;
  rating: Rating;
}

export interface MathGameState {
  phase: MathPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 3 → 2 → 1 before each round; 0 while the round runs. */
  countdown: number;
  /** Seconds left in the current 30s round. */
  timeLeft: number;
  round: number;
  totalRounds: number;
  question: MathQuestion | null;
  /** Digits typed so far for the current question. */
  input: string;
  /** True while the wrong-answer shake/flash plays. */
  isWrong: boolean;
  correctCount: number;
  /** Wrong submissions plus skips, this round. */
  wrongCount: number;
  /** Consecutive correct answers, this round — resets on a wrong or a skip. */
  streak: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: MathRoundResult | null;
  isNewBestSession: boolean;
}
