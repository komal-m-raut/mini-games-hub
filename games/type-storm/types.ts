import { Difficulty, Rating } from '@/types/game';

export type TypeStormPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'countdown'
  | 'playing'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface TypeStormRoundResult {
  difficulty: Difficulty;
  /** Words per minute, 2dp — see `scoreRound` in constants.ts. */
  wpm: number;
  /** 0–1, clamped. */
  accuracy: number;
  correct: number;
  /** Wrong submissions only (skips are tracked separately). */
  wrong: number;
  skips: number;
  /** Round score out of 10. */
  score: number;
  rating: Rating;
}

export interface TypeStormGameState {
  phase: TypeStormPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 3 → 2 → 1 before each round; 0 while the round runs. */
  countdown: number;
  /** Seconds left in the current 30s round. */
  timeLeft: number;
  round: number;
  totalRounds: number;
  /** This round's pre-generated word stream (~120 words — see makeWordStream). */
  words: string[];
  /** Index of the current word within `words`; the next two are the queue. */
  wordIndex: number;
  /** What's currently typed for the word in progress. */
  input: string;
  /** True while the wrong-submit shake/flash plays. */
  isWrong: boolean;
  /** Characters banked from correctly-submitted words, plus one per word for
   *  the space/enter separator — the numerator of accuracy and WPM. */
  correctChars: number;
  /** Every character a keystroke actually added to the input, correct or
   *  not — the denominator of accuracy. */
  typedChars: number;
  correctCount: number;
  /** Wrong submissions this round (skips tracked separately). */
  wrongCount: number;
  skipCount: number;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  result: TypeStormRoundResult | null;
  isNewBestSession: boolean;
}
