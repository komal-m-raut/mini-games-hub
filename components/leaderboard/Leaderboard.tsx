'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, RefreshCw, Lock } from 'lucide-react';
import { useLeaderboard, LeaderboardTab } from '@/hooks/useLeaderboard';
import { useSiteStats } from '@/hooks/useSiteStats';
import { LeaderboardEntry } from '@/types/game';

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'global', label: 'All Time' },
  { id: 'friends', label: 'Friends' },
];

const RANK_COLORS = ['#EAB308', '#94A3B8', '#D97706'];

interface LeaderboardProps {
  gameId: string;
}

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank - 1];
  if (rank <= 3) {
    return (
      <Trophy
        className="w-5 h-5"
        style={{ color, filter: `drop-shadow(0 0 6px ${color})` }}
        strokeWidth={1.5}
      />
    );
  }
  return <span className="text-white/30 font-mono text-sm w-5 text-center">{rank}</span>;
}

function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  return (
    <motion.div
      className="leaderboard-row"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 flex justify-center shrink-0">
          <RankBadge rank={entry.rank} />
        </div>
        <p className="text-white font-medium truncate">{entry.playerName}</p>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-white/40 font-mono">Accuracy</p>
          <p className="text-white/70 font-mono text-sm">{entry.accuracy.toFixed(1)}%</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-white/40 font-mono">Score</p>
          <p className="font-display font-bold text-brand-purple">
            {entry.score.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Leaderboard({ gameId }: LeaderboardProps) {
  const { entries, activeTab, setActiveTab, isLoading, refresh } = useLeaderboard(gameId);
  const stats = useSiteStats();

  useEffect(() => {
    refresh();
  }, [refresh, activeTab]);

  return (
    <section id="leaderboard" className="glass-card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-yellow" strokeWidth={1.5} />
            <h3 className="font-display font-bold text-white text-xl">Leaderboard</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono">
              <Users className="w-3.5 h-3.5" />
              {(stats?.totalPlayers ?? 0).toLocaleString()} player{stats?.totalPlayers === 1 ? '' : 's'}
            </div>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-all disabled:opacity-30"
              aria-label="Refresh leaderboard"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`lb-tab ${activeTab === tab.id ? 'lb-tab-active' : ''}`}
            >
              {tab.label}
              {tab.id === 'friends' && (
                <Lock className="w-3 h-3 ml-1 opacity-50" strokeWidth={1.5} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Entries */}
      <div className="px-4 py-3 min-h-[280px]">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'friends' ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Lock className="w-8 h-8 text-white/20" strokeWidth={1} />
            <p className="text-white/40 text-sm">Friends leaderboard requires login</p>
            <p className="text-white/20 text-xs">Authentication coming soon!</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <p className="text-white/40">No scores yet. Be the first!</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-1"
            >
              {entries.map((entry, i) => (
                <LeaderboardRow key={entry.rank} entry={entry} index={i} />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
