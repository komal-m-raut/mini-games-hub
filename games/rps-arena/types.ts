import { Difficulty } from '@/types/game';

export type Throw = 'rock' | 'paper' | 'scissors';

/** Outcome of a single throw, always from the player's perspective. */
export type ThrowOutcome = 'win' | 'lose' | 'tie';

/** One resolved throw. This is the "habit" the bot reads — see bot.ts. */
export interface ThrowRecord {
  player: Throw;
  bot: Throw;
  result: ThrowOutcome;
}

/** Outcome of a whole match (first-to-5, capped), player perspective. */
export type MatchOutcome = 'won' | 'lost' | 'drawn';

export type RpsPhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  /** Player is choosing rock/paper/scissors for the next throw. */
  | 'choosing'
  /** 3-2-1 cadence, then both hands reveal. */
  | 'revealing'
  /** Hands are shown; the win/lose/tie flash plays, then auto-advances. */
  | 'throw-result'
  /** One match just finished — score, tally and Next/Results button. */
  | 'match-result'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export interface RpsGameState {
  phase: RpsPhase;
  mode: GameMode;
  difficulty: Difficulty | null;
  /** 1-based index of the match in progress (or just finished). */
  match: number;
  /** Matches in this session — 3 for both solo and challenge. */
  totalRounds: number;

  // ── Current match ────────────────────────────────────────────────
  playerWins: number;
  botWins: number;
  /** Every throw played this match, oldest first — the bot's only memory. */
  history: ThrowRecord[];
  /** Consecutive throw wins; resets on a loss, unaffected by a tie. */
  playerStreak: number;

  // ── In-flight throw ─────────────────────────────────────────────
  playerThrow: Throw | null;
  botThrow: Throw | null;
  /** 3 → 2 → 1 → 0 during `revealing`; 0 means both hands are visible. */
  revealCount: number;
  throwResult: ThrowOutcome | null;

  // ── Most recently finished match ────────────────────────────────
  matchOutcome: MatchOutcome | null;
  /** Latest completed match's score, out of 10. */
  score: number;

  // ── Session ──────────────────────────────────────────────────────
  totalScore: number;
  roundScores: number[];
  isNewBestSession: boolean;
}
