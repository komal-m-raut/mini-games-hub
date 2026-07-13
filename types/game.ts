export type Difficulty = 'easy' | 'medium' | 'hard';

export type GamePhase =
  | 'selecting-difficulty'
  | 'challenge-intro'
  | 'observing'
  | 'inflating'
  | 'results'
  | 'challenge-complete';

export type GameMode = 'normal' | 'challenge';

export type Rating = 'Perfect' | 'Great' | 'Good' | 'Try Again';

export interface GameResult {
  accuracy: number;
  targetSize: number;
  actualSize: number;
  sizeDiffPercent: number;
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
  description: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  glowColor: string;
  isAvailable: boolean;
  href: string;
  tags: string[];
}

export interface AdPlacement {
  id: string;
  slot: string;
  format: 'banner' | 'rectangle' | 'leaderboard';
  enabled: boolean;
}
