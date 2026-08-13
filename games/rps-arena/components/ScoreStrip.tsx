'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface ScoreStripProps {
  match: number;
  totalMatches: number;
  playerWins: number;
  botWins: number;
  /** Consecutive throw wins this match — a flame shows once it hits 3. */
  playerStreak: number;
  accent: string;
}

const STREAK_THRESHOLD = 3;

/**
 * The in-match tally: which match this is, the running game score inside
 * it, and a flame once the player's throw-win streak gets hot. Distinct
 * from `ScoreCard` (which reports the *previous* match's final score) —
 * this is the live read on the match still in progress.
 */
export function ScoreStrip({ match, totalMatches, playerWins, botWins, playerStreak, accent }: ScoreStripProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <p className="font-ui text-xs text-ink-3 uppercase tracking-wide">
        Match {match}/{totalMatches}
      </p>
      <p className="font-score text-xl leading-none" style={{ color: accent }}>
        {playerWins}
        <span className="text-ink-4 text-sm"> – </span>
        {botWins}
      </p>
      <AnimatePresence>
        {playerStreak >= STREAK_THRESHOLD && (
          <motion.div
            key={playerStreak}
            initial={{ opacity: 0, scale: 0.6, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="flex items-center gap-1 text-brand-yellow font-ui text-sm"
            aria-label={`${playerStreak} throw win streak`}
          >
            <Flame className="w-4 h-4" strokeWidth={2} fill="currentColor" />
            {playerStreak}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
