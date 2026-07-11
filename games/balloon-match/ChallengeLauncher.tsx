'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, Swords } from 'lucide-react';
import {
  challengePath,
  generateChallengeCode,
  getDailyChallengeCode,
} from '@/lib/challenge';

/**
 * Entry points into Challenge Mode from the free-play menu:
 * - Daily Challenge: everyone worldwide gets the same 3 balloons today
 * - Challenge a Friend: mints a fresh code and takes you to its lobby
 */
export function ChallengeLauncher() {
  const router = useRouter();

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="flex items-center gap-3 w-full max-w-2xl">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-white/30 text-xs font-mono uppercase tracking-widest">
          Challenge Mode
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
        <button
          onClick={() => router.push(challengePath(getDailyChallengeCode()))}
          className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl border border-brand-cyan/25 bg-brand-cyan/5 hover:border-brand-cyan/60 hover:bg-brand-cyan/10 transition-all cursor-pointer group"
        >
          <CalendarDays className="w-6 h-6 text-brand-cyan shrink-0 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="font-display font-bold text-white text-sm">Daily Challenge</span>
        </button>

        <button
          onClick={() => router.push(challengePath(generateChallengeCode()))}
          className="flex-1 flex items-center gap-3 px-5 py-4 rounded-2xl border border-brand-purple/25 bg-brand-purple/5 hover:border-brand-purple/60 hover:bg-brand-purple/10 transition-all cursor-pointer group"
        >
          <Swords className="w-6 h-6 text-brand-violet shrink-0 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
          <span className="font-display font-bold text-white text-sm">Challenge a Friend</span>
        </button>
      </div>
    </motion.div>
  );
}
