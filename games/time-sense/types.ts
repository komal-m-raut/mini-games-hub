import { Difficulty, Rating } from '@/types/game';

export type TimeSensePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'show'
  | 'recreate'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface TimeSenseResult {
  /** Duration the player had to recreate, in milliseconds. */
  targetMs: number;
  /** Duration the player actually held, in milliseconds. */
  heldMs: number;
  /** heldMs − targetMs: positive = held too long ("over"), negative = released too early ("under"). */
  errorMs: number;
  accuracy: number;
  rating: Rating;
  /** Round score out of 10. */
  score: number;
}

export interface TimeSenseGameState {
  phase: TimeSensePhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** Target duration for the current round, in milliseconds. */
  targetMs: number;
  /** Live SHOW-phase fill elapsed, 0 → targetMs. Cosmetic only — never fed
   *  into scoring, which uses a single performance.now() delta instead. */
  showElapsedMs: number;
  /** Live RECREATE-phase hold elapsed, uncapped. Easy's glow-only feedback
   *  reads this; Medium/Hard never render it. Cosmetic only, same as above. */
  holdElapsedMs: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: TimeSenseResult | null;
  isHolding: boolean;
  isNewBestSession: boolean;
}
