import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';
import { MatchOutcome, Throw, ThrowOutcome } from './types';

export const GAME_ID = 'rps-arena';

export interface RpsDifficultyConfig {
  label: string;
  qualifier: string;
  color: string;
  glow: string;
}

export const RPS_DIFFICULTY: Record<Difficulty, RpsDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Pure luck — every throw is random',
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Reads your favourite throw',
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Reads your patterns, throw to throw',
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** Matches per session — solo and challenge both play 3. */
export const MATCHES_PER_SESSION = 3;

export const THROW_LABEL: Record<Throw, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
};

export const THROW_EMOJI: Record<Throw, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

/** Player-perspective outcome of one throw. */
export function judgeThrow(player: Throw, bot: Throw): ThrowOutcome {
  if (player === bot) return 'tie';
  const playerBeats: Record<Throw, Throw> = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  return playerBeats[player] === bot ? 'win' : 'lose';
}

// ── Match progression ────────────────────────────────────────────────
// A MATCH is first-to-5 wins. Ties don't count as a "game" — they replay —
// but every throw (including ties) counts against a hard cap, so a runaway
// tie streak can't stall a match forever.

/** First to this many decisive (non-tie) wins takes the match. */
export const WINS_TO_TAKE_MATCH = 5;
/** Decisive throws are also capped here — belt-and-braces alongside the
 *  throw cap below. In practice first-to-5 always resolves before this can
 *  trigger (5 + 4 = 9 is the most decisive throws a match can ever need). */
export const MAX_GAMES_PER_MATCH = 9;
/** Every throw counts here, ties included, bounding worst-case tie streaks. */
export const MAX_THROWS_PER_MATCH = 15;

export interface MatchProgress {
  playerWins: number;
  botWins: number;
  /** Decisive (non-tie) throws played so far. */
  games: number;
  /** Every throw played so far, ties included. */
  throws: number;
}

export function initMatchProgress(): MatchProgress {
  return { playerWins: 0, botWins: 0, games: 0, throws: 0 };
}

/** Folds one resolved throw into match progress. A tie only bumps the
 *  throw count — it "replays": no game is consumed, no win awarded. */
export function applyThrowToMatch(progress: MatchProgress, outcome: ThrowOutcome): MatchProgress {
  const throws = progress.throws + 1;
  if (outcome === 'tie') return { ...progress, throws };
  return {
    playerWins: progress.playerWins + (outcome === 'win' ? 1 : 0),
    botWins: progress.botWins + (outcome === 'lose' ? 1 : 0),
    games: progress.games + 1,
    throws,
  };
}

/**
 * Whether the match is decided after this throw — call immediately after
 * every `applyThrowToMatch`. `null` means "keep playing".
 *
 * Reaching 5 wins ends it outright. Otherwise, if either cap is hit first
 * (the throw cap, in practice — see `MAX_GAMES_PER_MATCH`'s note), whoever
 * has more wins takes it; an equal tally is a drawn match.
 */
export function matchOutcome(progress: MatchProgress): MatchOutcome | null {
  const { playerWins, botWins, games, throws } = progress;
  if (playerWins >= WINS_TO_TAKE_MATCH) return 'won';
  if (botWins >= WINS_TO_TAKE_MATCH) return 'lost';
  if (games >= MAX_GAMES_PER_MATCH || throws >= MAX_THROWS_PER_MATCH) {
    if (playerWins > botWins) return 'won';
    if (botWins > playerWins) return 'lost';
    return 'drawn';
  }
  return null;
}

// ── Match scoring ───────────────────────────────────────────────────

/**
 * Match score out of 10, to 2dp. A won match starts at a perfect 10 and
 * loses a point for every game the bot still took off you; a lost match
 * earns 1.2 points per game you managed to win anyway, so even a loss can
 * bank partial credit; a drawn match (only reachable via the throw cap,
 * since first-to-5 always resolves before the games cap can) is a flat 5 —
 * a genuine coin-flip result, not a partial win or a partial loss.
 */
export function scoreMatch(playerWins: number, botWins: number, outcome: MatchOutcome): number {
  if (outcome === 'won') return round2(clamp(10 - botWins * 1.0, 0, 10));
  if (outcome === 'lost') return round2(clamp(playerWins * 1.2, 0, 10));
  return round2(clamp(5, 0, 10));
}
