import { Difficulty } from '@/types/game';
import { Sweep } from './sweep';

export type BlockCountPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'sweeping'
  | 'guessing'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface BlockCountResult {
  /** True red-block count for the sweep just played. */
  actual: number;
  /** What the player typed on the number pad. */
  guess: number;
  /** Round score out of 10 — see `scoreGuess` in constants.ts. */
  score: number;
}

export interface BlockCountGameState {
  phase: BlockCountPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** The current round's generated sweep — null until the first round starts. */
  sweep: Sweep | null;
  /** `performance.now()` timestamp the current sweep animation began at.
   *  Bumped (not regenerated) when a hidden-tab pause restarts the same
   *  sweep from the beginning. */
  sweepStartAt: number;
  /** Digits typed so far on the number pad, as a string so a leading empty
   *  guess and backspace are easy to represent without a sentinel number. */
  guess: string;
  round: number;
  /** Fixed rounds per session: 5 in normal mode, 3 in challenge mode. */
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: BlockCountResult | null;
  isNewBestSession: boolean;
  /** Transient a11y/UI message (e.g. "Sweep restarted") — cleared automatically. */
  announcement: string | null;
}
