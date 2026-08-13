export type Difficulty = 'easy' | 'medium' | 'hard';

export type GamePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'observing'
  | 'inflating'
  | 'results'
  | 'session-complete'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export type Rating = 'Perfect' | 'Great' | 'Good' | 'Try Again';

export interface GameResult {
  accuracy: number;
  targetSize: number;
  actualSize: number;
  rating: Rating;
  score: number;
}

/**
 * A player's entry on any leaderboard. Shared schema for every game:
 * entries live on a board (challenge code, daily-YYYYMMDD, global, …)
 * under a gameId. `roundScores` is only set for round-based games.
 */
export interface ScoreEntry {
  playerId: string;
  name: string;
  score: number;
  roundScores?: number[];
  createdAt: string;
}

export interface GameMeta {
  id: string;
  title: string;
  /**
   * Long-form copy for search engines and social cards. Not rendered on the
   * hub — the card shows `tagline` and `howTo` instead, because three lines
   * of keyword-bearing prose per card is a description a crawler reads and a
   * player skips.
   */
  description: string;
  /**
   * Two or three words on the kind of game it is, e.g. "Focus & recall".
   * Rendered as an uppercase kicker above the title, so keep it short —
   * a sentence here wraps badly and stops reading as a category.
   */
  tagline: string;
  /** One sentence: literally what the player does. Shown on the card. */
  howTo: string;
  emoji: string;
  /**
   * The game's single identity colour, threaded to the card as `--game`.
   * Replaces the old gradientFrom/gradientTo/glowColor trio: the redesigned
   * card derives its panel tint, border and CTA from one hue, and `tags`
   * went with them when the pill row came off the card.
   */
  accent: string;
  isAvailable: boolean;
  href: string;
}

export interface AdPlacement {
  id: string;
  slot: string;
  format: 'banner' | 'rectangle' | 'leaderboard';
  enabled: boolean;
}
