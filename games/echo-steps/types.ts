import { Difficulty, Rating } from '@/types/game';

export type EchoStepsPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'playback'
  | 'input'
  | 'level-complete'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface EchoStepsResult {
  /** Longest sequence length fully repeated this round (start-1 if the
   *  very first playback was never matched). */
  len: number;
  /** Round score out of 10, from `len` against the difficulty's par. */
  score: number;
  rating: Rating;
}

export interface EchoStepsGameState {
  phase: EchoStepsPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** Sequence length currently being played back or recalled. */
  length: number;
  /** This round's sequence, sliced to `length` (a prefix of the round's
   *  master sequence). */
  sequence: number[];
  /** Index within `sequence` currently lit during playback; null once
   *  playback ends or between light/gap steps. */
  playbackIndex: number | null;
  /** Correct taps registered so far during input, in order. */
  inputProgress: number;
  /** Pad most recently tapped correctly — brief press pulse during input. */
  tappedPad: number | null;
  /** Pad tapped incorrectly — flashes red until the round ends. */
  wrongPad: number | null;
  /** The pad that *should* have been tapped, revealed alongside `wrongPad`. */
  revealPad: number | null;
  /** Longest sequence length fully repeated so far this round (start-1 if
   *  none yet). */
  peak: number;
  round: number;
  totalRounds: number;
  score: number;
  totalScore: number;
  roundScores: number[];
  result: EchoStepsResult | null;
  isNewBestSession: boolean;
}
