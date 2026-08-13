import { Difficulty, Rating } from '@/types/game';

export type RecallPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'display'
  | 'input'
  /** ~500ms beat after a correct entry, before the next (longer) number shows. */
  | 'level-up'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface RecallResult {
  /** Longest digit length correctly recalled this round (floored at start − 1). */
  reached: number;
  /** The digit string the player failed to reproduce. */
  target: string;
  /** What the player actually typed for that failed attempt. */
  entry: string;
  /** Index of the first digit where `entry` diverges from `target` — see
   *  `firstMismatchIndex` in constants.ts. Everything before it is the
   *  correct prefix (green); everything from it onward is wrong (red). */
  diffIndex: number;
  rating: Rating;
  /** Round score out of 10. */
  score: number;
}

export interface RecallGameState {
  phase: RecallPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** The digit string currently being shown/typed (length = current level). */
  target: string;
  /** Digits the player has entered so far for the current number. */
  entry: string;
  /** Current ladder level — a digit length, starting at the difficulty's
   *  start length and climbing by one on every correct recall. */
  level: number;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: RecallResult | null;
  /** Bumped every time a fresh display window begins (a new number, or a
   *  restart after the tab was hidden mid-display) — components key their
   *  progress-bar/number animation off it so a restart visibly replays. */
  displayAttempt: number;
  isNewBestSession: boolean;
}
