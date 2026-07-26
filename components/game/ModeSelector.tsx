'use client';

import { motion } from 'framer-motion';
import { Swords, User } from 'lucide-react';

interface ModeSelectorProps {
  /** Game accent colour, used for the Multiplayer card highlight. */
  accent?: string;
  onSolo: () => void;
  onMultiplayer: () => void;
}

/**
 * First screen of every game: pick how you want to play. Solo runs the normal
 * free-play session; Multiplayer opens Challenge Mode (same seeded rounds for
 * everyone + a shared leaderboard).
 */
export function ModeSelector({ accent = '#06B6D4', onSolo, onMultiplayer }: ModeSelectorProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mb-1">
          How do you want to play?
        </h2>
        <p className="text-white/40 text-sm font-mono">Pick a mode to begin</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          onClick={onSolo}
          className="mode-card group"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          style={{ '--mode-accent': '#8B5CF6' } as React.CSSProperties}
        >
          <span className="mode-icon">
            <User className="w-7 h-7" strokeWidth={1.5} />
          </span>
          <span className="font-display font-bold text-white text-lg">Solo</span>
          <span className="text-white/45 text-sm">Free play · 5 rounds · beat your own best</span>
        </motion.button>

        <motion.button
          onClick={onMultiplayer}
          className="mode-card group"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          whileHover={{ y: -3 }}
          style={{ '--mode-accent': accent } as React.CSSProperties}
        >
          <span className="mode-icon">
            <Swords className="w-7 h-7" strokeWidth={1.5} />
          </span>
          <span className="font-display font-bold text-white text-lg">Multiplayer</span>
          <span className="text-white/45 text-sm">
            Same rounds for everyone · shared leaderboard
          </span>
        </motion.button>
      </div>
    </div>
  );
}
