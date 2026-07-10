export type Difficulty = 'easy' | 'medium' | 'hard';

export type GamePhase =
  | 'selecting-difficulty'
  | 'observing'
  | 'inflating'
  | 'results';

export type Rating = 'Perfect' | 'Great' | 'Good' | 'Try Again';

export interface GameResult {
  accuracy: number;
  targetSize: number;
  actualSize: number;
  sizeDiffPercent: number;
  rating: Rating;
  score: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  accuracy: number;
  gamesPlayed: number;
  createdAt: string;
}

export interface LeaderboardData {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  global: LeaderboardEntry[];
  friends: LeaderboardEntry[];
  totalPlayers: number;
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
