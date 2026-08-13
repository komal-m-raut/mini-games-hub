import { Difficulty } from '@/types/game';
import { SnakeState } from './engine';

export type SnakePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'running'
  /** Challenge only: one round just ended (death or timeout) — shows the
   *  round's food/score before the next round or challenge-complete. */
  | 'results'
  /** Solo only: the endless run just ended — the custom result screen. */
  | 'game-over'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface SnakeGameState {
  phase: SnakePhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** The live pure engine state — null until the first run/round starts. */
  engine: SnakeState | null;
  round: number;
  /** 1 for solo (endless, not round-based) / 3 for challenge. */
  totalRounds: number;
  /** Completed challenge round scores, out of 10 each. */
  roundScores: number[];
  /** foodEaten banked for the round that just ended — challenge results screen. */
  lastRoundFoodEaten: number;
  /** Whether the round that just ended was cut short by death, as opposed
   *  to surviving the full 60 seconds — challenge results screen. */
  lastRoundDied: boolean;
  /** Solo only: whether the run just ended beat this difficulty's local best. */
  isNewBestSession: boolean;
  /** Solo only: this difficulty's best foodEaten, read fresh after a save. */
  bestForDifficulty: number;
  /** True while the run/round is frozen — manual pause, 'P', or the tab
   *  going hidden. See useSnakeGame.ts for how the deadlines shift. */
  paused: boolean;
  /** Challenge only: seconds left in the current round, for the timer. */
  timeLeft: number;
}
