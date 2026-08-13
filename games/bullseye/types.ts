import { Difficulty } from '@/types/game';

export type BullseyePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'aiming-y'
  | 'aiming-x'
  | 'landing'
  | 'round-result'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/** Cosmetic ring a landed dart fell in — display only, never part of scoring. */
export type RingLabel = 'BULLSEYE' | '50' | '25' | '10' | '5' | 'MISS';

export interface DartResult {
  /** Final board position, 0–100 (board-percent), after wobble. */
  x: number;
  y: number;
  /** Distance from board centre (50, 50), in board-percent. */
  dist: number;
  /** 0–100, `dartAccuracy(dist, BOARD_RADIUS)`. */
  accuracy: number;
  ring: RingLabel;
}

export interface BullseyeGameState {
  phase: BullseyePhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 1..totalRounds — a round is 5 darts. */
  round: number;
  totalRounds: number;
  /** 1..DARTS_PER_ROUND — which dart of the current round is in flight. */
  dartIndex: number;
  /** Darts landed so far this round. */
  darts: DartResult[];
  /** Y locked while aiming X; null before the first lock of a dart. */
  lockedY: number | null;
  /** Live oscillator sample, 0–100, driving whichever aim line is moving. */
  aimPosition: number;
  /** Most recently landed dart, for the HUD ring flash. */
  lastDart: DartResult | null;
  /** Latest completed round's score, out of 10. */
  score: number;
  /** Latest completed round's mean accuracy, 0–100. */
  roundAccuracy: number;
  totalScore: number;
  roundScores: number[];
  isNewBestSession: boolean;
}
