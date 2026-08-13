import { Difficulty, Rating } from '@/types/game';

/** The six ink/word colours the pool draws from, by difficulty. */
export type StroopColorName = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'PURPLE' | 'ORANGE';

export type StroopPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'countdown'
  | 'running'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/**
 * One trial: a colour WORD rendered in an INK colour. The player taps the
 * INK, never the word — `word === ink` is a congruent trial (no conflict),
 * anything else is incongruent (the Stroop conflict itself).
 */
export interface Trial {
  word: StroopColorName;
  ink: StroopColorName;
}

/** A finished round: the raw tally, the net score it produced, and the curve. */
export interface StroopResult {
  difficulty: Difficulty;
  correct: number;
  wrong: number;
  /** max(0, correct − wrong). */
  net: number;
  /** Net that earns a full 10 at this difficulty. */
  par: number;
  /** Round score out of 10. */
  score: number;
  rating: Rating;
}

export interface StroopGameState {
  phase: StroopPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 3 → 2 → 1 before each round; 0 while the round runs. */
  countdown: number;
  round: number;
  totalRounds: number;
  /** Seconds left in the running round, drives the live GameTimer. */
  timeLeft: number;
  /** This round's pre-generated trial sequence. */
  trials: Trial[];
  /** Index into `trials` for the trial currently on screen. */
  trialIndex: number;
  correct: number;
  wrong: number;
  /** Consecutive correct taps, resets to 0 on a miss. */
  streak: number;
  bestStreak: number;
  /** Outcome of the most recently resolved trial — drives the flash. */
  lastAnswer: 'correct' | 'wrong' | null;
  /** Bumped on every trial resolution so the flash animation restarts. */
  flashSeq: number;
  /** Latest completed round's result, shown on the 'results' phase. */
  result: StroopResult | null;
  /** Latest round score, out of 10. */
  score: number;
  totalScore: number;
  roundScores: number[];
  isNewBestSession: boolean;
}
