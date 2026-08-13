import { Difficulty } from '@/types/game';
import { BallRecord } from './bot';
import { MatchResult } from './constants';

export type HandCricketPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'innings1'
  | 'innings-break'
  | 'innings2'
  | 'match-result'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

/** Where the current ball is in its reveal cadence: waiting for a pick,
 *  hands committed but hidden during the suspense beat, or shown. */
export type BallState = 'ready' | 'revealing' | 'revealed';

export interface MatchRecord {
  difficulty: Difficulty;
  result: MatchResult;
  playerRuns: number;
  botRuns: number;
  target: number;
  /** Match score out of 10. */
  score: number;
}

export interface HandCricketGameState {
  phase: HandCricketPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 1-based index of the match in progress. */
  match: number;
  totalMatches: number;

  // Current match — reset at the start of every match.
  /** Every resolved ball this match, across both innings. */
  history: BallRecord[];
  playerRuns: number;
  playerBalls: number;
  botRuns: number;
  botBalls: number;
  /** Innings 2's target (playerRuns + 1). Set once innings 1 ends. */
  target: number;

  // Current ball.
  ballState: BallState;
  playerPick: number | null;
  botPick: number | null;
  /** True while the most recently resolved ball's outcome is a wicket. */
  isOut: boolean;

  matchResult: MatchResult | null;
  /** Latest completed match's score, out of 10. */
  score: number;
  totalScore: number;
  /** Completed match scores this session — feeds SessionSummary / ChallengeComplete. */
  roundScores: number[];
  result: MatchRecord | null;
  isNewBestSession: boolean;
}
