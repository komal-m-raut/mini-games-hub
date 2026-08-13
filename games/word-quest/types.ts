import { Rating } from '@/types/game';
import { GuessRow } from './engine';

export type WordQuestPhase =
  | 'menu'
  | 'challenge-intro'
  | 'playing'
  | 'round-result'
  | 'solo-result'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface WordQuestRoundResult {
  answer: string;
  /** Guesses used to solve, 1-6; null if the round was not solved. */
  solvedIn: number | null;
  /** Round score out of 10. */
  score: number;
  rating: Rating;
  rows: GuessRow[];
}

export interface WordQuestGameState {
  phase: WordQuestPhase;
  mode: GameMode;
  /** The word this round's guesses are checked against. Empty before the
   *  first round starts. */
  answer: string;
  /** Completed guesses this round, each already evaluated. */
  rows: GuessRow[];
  /** Letters typed so far for the guess in progress. */
  currentGuess: string;
  round: number;
  totalRounds: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: WordQuestRoundResult | null;
  isNewBestSession: boolean;
  /** "Not enough letters" / "Not in word list" — cleared automatically a
   *  couple seconds after it's shown. */
  toast: string | null;
  /** Bumped every rejected submit, so the grid's shake animation retriggers
   *  even when the same invalid word is resubmitted back to back. */
  invalidNonce: number;
}

export type { GuessRow } from './engine';
