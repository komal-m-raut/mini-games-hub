'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw } from 'lucide-react';
import { ScoreEntry } from '@/types/game';
import { MAX_CHALLENGE_SCORE } from '@/lib/challenge';
import { RANK_COLORS } from '@/lib/constants';
import { formatScore } from '@/utils/scoring';

interface ChallengeLeaderboardProps {
  gameId: string;
  code: string;
  /** Current player's ID — their row gets highlighted. */
  playerId?: string;
  /** Bump to force a refetch (e.g. after submitting a score). */
  refreshKey?: number;
}

export function ChallengeLeaderboard({
  gameId,
  code,
  playerId,
  refreshKey = 0,
}: ChallengeLeaderboardProps) {
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scores/${gameId}/${code}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (cancelled) return;
        setError(false);
        setEntries(data.entries ?? []);
      } catch {
        if (cancelled) return;
        setError(true);
        setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId, code, refreshKey, tick]);

  // Manual refresh: back to the skeleton, then refetch
  const load = useCallback(() => {
    setEntries(null);
    setTick((t) => t + 1);
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-brand-yellow" strokeWidth={1.5} />
          <h3 className="font-display font-bold text-white text-base">Challenge Leaderboard</h3>
        </div>
        <button
          onClick={load}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/55 hover:text-white/80 hover:bg-white/5 transition-all"
          aria-label="Refresh challenge leaderboard"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {entries === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-11 rounded-lg bg-white/3 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-white/55 text-sm py-6 text-center">Couldn&apos;t load scores. Try refreshing.</p>
      ) : entries.length === 0 ? (
        <p className="text-white/55 text-sm py-6 text-center">
          No scores yet — be the first on the board!
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {entries.map((entry, i) => {
            const rank = i + 1;
            const isSelf = playerId && entry.playerId === playerId;
            return (
              <motion.div
                key={entry.playerId}
                className={`leaderboard-row ${isSelf ? 'border border-brand-purple/40 bg-brand-purple/10' : ''}`}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-7 flex justify-center shrink-0">
                    {rank <= 3 ? (
                      <Trophy
                        className="w-4 h-4"
                        style={{
                          color: RANK_COLORS[rank - 1],
                          filter: `drop-shadow(0 0 6px ${RANK_COLORS[rank - 1]})`,
                        }}
                        strokeWidth={1.5}
                      />
                    ) : (
                      <span className="text-white/55 font-mono text-sm">{rank}</span>
                    )}
                  </div>
                  <p className="text-white font-medium truncate">
                    {entry.name}
                    {isSelf && <span className="text-brand-violet text-xs font-mono ml-2">you</span>}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {entry.roundScores && (
                    <p className="font-mono text-xs text-white/55 hidden sm:block">
                      {entry.roundScores.map(formatScore).join(' · ')}
                    </p>
                  )}
                  <p className="font-display font-bold text-brand-purple">
                    {formatScore(entry.score)}
                    <span className="text-white/55 text-xs">/{MAX_CHALLENGE_SCORE}</span>
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
