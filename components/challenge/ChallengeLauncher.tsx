'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, CalendarDays, Swords } from 'lucide-react';
import {
  challengePath,
  generateChallengeCode,
  getDailyChallengeCode,
} from '@/lib/challenge';

interface ChallengeLauncherProps {
  gameId: string;
  /** Back to the mode selector; omitted when shown standalone. */
  onBack?: () => void;
}

/**
 * Entry points into a game's Challenge Mode:
 * - Daily Challenge: everyone worldwide gets the same rounds today.
 * - Challenge a Friend: mints a fresh code and opens its lobby.
 * Both route to /games/{gameId}/challenge/{code}.
 */
export function ChallengeLauncher({ gameId, onBack }: ChallengeLauncherProps) {
  const router = useRouter();

  return (
    <motion.div
      className="flex flex-col items-center gap-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-center">
        <h2 className="font-display text-2xl sm:text-3xl mb-1">Multiplayer</h2>
        <p className="text-ink-3 text-sm font-ui">
          Same rounds for everyone · climb the shared board
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
        <button
          onClick={() => router.push(challengePath(gameId, getDailyChallengeCode()))}
          className="flex items-center gap-4 p-5 rounded-2xl border border-brand-cyan/25 bg-brand-cyan/5 hover:border-brand-cyan/60 hover:bg-brand-cyan/10 transition-all cursor-pointer group text-left"
        >
          <CalendarDays
            className="w-8 h-8 text-brand-cyan shrink-0 group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span>
            <span className="block font-display">Daily Challenge</span>
            <span className="block text-ink-3 text-sm">Same rounds worldwide today</span>
          </span>
        </button>

        <button
          onClick={() => router.push(challengePath(gameId, generateChallengeCode()))}
          className="flex items-center gap-4 p-5 rounded-2xl border border-brand-purple/25 bg-brand-purple/5 hover:border-brand-purple/60 hover:bg-brand-purple/10 transition-all cursor-pointer group text-left"
        >
          <Swords
            className="w-8 h-8 text-brand-violet shrink-0 group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span>
            <span className="block font-display">Challenge a Friend</span>
            <span className="block text-ink-3 text-sm">Share a private code, compare scores</span>
          </span>
        </button>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-ink-3 hover:text-ink-1 transition-colors text-sm font-ui cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back
        </button>
      )}
    </motion.div>
  );
}
