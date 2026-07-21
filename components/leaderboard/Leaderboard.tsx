'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, RefreshCw } from 'lucide-react';
import { useLeaderboard, LeaderboardTab } from '@/hooks/useLeaderboard';
import { useSiteStats } from '@/hooks/useSiteStats';
import { MAX_CHALLENGE_SCORE } from '@/lib/challenge';
import { usePlayerId } from '@/lib/player';
import { ScoreEntry } from '@/types/game';

const TABS: { id: LeaderboardTab; label: string }[] = [
  { id: 'today', label: "Today's Challenge" },
  { id: 'alltime', label: 'All Time' },
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

function LeaderboardRow({
  entry,
  rank,
  isSelf,
}: {
  entry: ScoreEntry;
  rank: number;
  isSelf: boolean;
}) {
  return (
    <motion.div
      className={`leaderboard-row ${isSelf ? 'border border-brand-purple/40 bg-brand-purple/10' : ''}`}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (rank - 1) * 0.06 }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-7 flex justify-center shrink-0">
          <RankBadge rank={rank} />
        </div>
        <p className="text-white font-medium truncate">
          {entry.name}
          {isSelf && <span className="text-brand-violet text-xs font-mono ml-2">you</span>}
        </p>
      </div>

      <div className="flex items-center gap-6 shrink-0">
        {entry.roundScores && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/40 font-mono">Rounds</p>
            <p className="text-white/70 font-mono text-sm">{entry.roundScores.join(' · ')}</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-xs text-white/40 font-mono">Score</p>
          <p className="font-display font-bold text-brand-purple">
            {entry.score}
            <span className="text-white/30 text-xs">/{MAX_CHALLENGE_SCORE}</span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function Leaderboard({ gameId }: LeaderboardProps) {
  const { entries, activeTab, setActiveTab, isLoading, refresh } = useLeaderboard(gameId);
  const stats = useSiteStats();
  const playerId = usePlayerId();

  return (
    <section id="leaderboard" className="glass-card p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-white/5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-yellow" strokeWidth={1.5} />
            <h3 className="font-display font-bold text-white text-lg sm:text-xl">Leaderboard</h3>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-mono whitespace-nowrap">
              <Users className="w-3.5 h-3.5 shrink-0" />
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
        ) : entries && entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
            <p className="text-white/40">No scores yet — play a challenge to get on the board!</p>
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
              {(entries ?? []).map((entry, i) => (
                <LeaderboardRow
                  key={entry.playerId}
                  entry={entry}
                  rank={i + 1}
                  isSelf={Boolean(playerId) && entry.playerId === playerId}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
