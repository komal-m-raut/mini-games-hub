'use client';

import { useState, useCallback } from 'react';
import { LeaderboardData, LeaderboardEntry } from '@/types/game';

// Placeholder leaderboard data — replace with real API calls when auth is ready.
const MOCK_LEADERBOARD: LeaderboardData = {
  daily: [
    { rank: 1, playerName: 'NeonPanda', score: 8750, accuracy: 97.2, gamesPlayed: 12, createdAt: new Date().toISOString() },
    { rank: 2, playerName: 'CyberFox', score: 7200, accuracy: 94.1, gamesPlayed: 9, createdAt: new Date().toISOString() },
    { rank: 3, playerName: 'PixelNinja', score: 6800, accuracy: 91.5, gamesPlayed: 8, createdAt: new Date().toISOString() },
    { rank: 4, playerName: 'StarlightX', score: 6300, accuracy: 89.8, gamesPlayed: 11, createdAt: new Date().toISOString() },
    { rank: 5, playerName: 'VoidWalker', score: 5900, accuracy: 87.3, gamesPlayed: 7, createdAt: new Date().toISOString() },
  ],
  weekly: [
    { rank: 1, playerName: 'ArcadeKing', score: 52400, accuracy: 95.8, gamesPlayed: 67, createdAt: new Date().toISOString() },
    { rank: 2, playerName: 'NeonPanda', score: 48900, accuracy: 93.2, gamesPlayed: 58, createdAt: new Date().toISOString() },
    { rank: 3, playerName: 'GlitchByte', score: 45200, accuracy: 91.0, gamesPlayed: 52, createdAt: new Date().toISOString() },
    { rank: 4, playerName: 'CyberFox', score: 41700, accuracy: 89.4, gamesPlayed: 49, createdAt: new Date().toISOString() },
    { rank: 5, playerName: 'NightOwl', score: 38500, accuracy: 87.6, gamesPlayed: 45, createdAt: new Date().toISOString() },
  ],
  global: [
    { rank: 1, playerName: 'Legendary_G', score: 1204500, accuracy: 98.7, gamesPlayed: 1843, createdAt: new Date().toISOString() },
    { rank: 2, playerName: 'UltraProMax', score: 987300, accuracy: 97.1, gamesPlayed: 1521, createdAt: new Date().toISOString() },
    { rank: 3, playerName: 'ArcadeKing', score: 845700, accuracy: 95.8, gamesPlayed: 1287, createdAt: new Date().toISOString() },
    { rank: 4, playerName: 'NeonGhost', score: 723100, accuracy: 94.3, gamesPlayed: 1102, createdAt: new Date().toISOString() },
    { rank: 5, playerName: 'ByteWitch', score: 654800, accuracy: 93.1, gamesPlayed: 998, createdAt: new Date().toISOString() },
  ],
  friends: [],
  totalPlayers: 14823,
};

export type LeaderboardTab = 'daily' | 'weekly' | 'global' | 'friends';

export function useLeaderboard(gameId: string) {
  const [data, setData] = useState<LeaderboardData>(MOCK_LEADERBOARD);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('daily');
  const [isLoading, setIsLoading] = useState(false);

  // Ready for real API integration — replace body with fetch call
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // simulate network
    setData(MOCK_LEADERBOARD);
    setIsLoading(false);
  }, [gameId]);

  const submitScore = useCallback(
    async (entry: Omit<LeaderboardEntry, 'rank' | 'createdAt'>) => {
      // Future: POST to /api/leaderboard with auth token
      console.log('[Leaderboard] Score submitted (auth required):', entry);
    },
    []
  );

  const entries: LeaderboardEntry[] = data[activeTab] ?? [];

  return { entries, activeTab, setActiveTab, isLoading, refresh, submitScore };
}
