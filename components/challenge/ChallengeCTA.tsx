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
 * Hub-level entry into Challenge Mode. The launcher also lives inside Balloon
 * Match, but a first-time visitor never sees it there — this surfaces it on the
 * landing page (and is the target of the "Challenge" nav link via #challenge).
 */
export function ChallengeCTA() {
  const router = useRouter();

  return (
    <section id="challenge" className="scroll-mt-24">
      <motion.h2
        className="font-display font-bold text-2xl text-white mb-2"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        Challenge Mode
      </motion.h2>
      <motion.p
        className="text-white/45 text-sm mb-6 max-w-xl"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Everyone gets the exact same balloons. Play today&apos;s Daily Challenge to
        climb the global board, or mint a private code to challenge a friend.
      </motion.p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.button
          onClick={() => router.push(challengePath(getDailyChallengeCode()))}
          className="flex items-center gap-4 p-5 rounded-2xl border border-brand-cyan/25 bg-brand-cyan/5 hover:border-brand-cyan/60 hover:bg-brand-cyan/10 transition-all cursor-pointer group text-left"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <CalendarDays
            className="w-8 h-8 text-brand-cyan shrink-0 group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span>
            <span className="block font-display font-bold text-white">Daily Challenge</span>
            <span className="block text-white/45 text-sm">Same 3 balloons worldwide today</span>
          </span>
        </motion.button>

        <motion.button
          onClick={() => router.push(challengePath(generateChallengeCode()))}
          className="flex items-center gap-4 p-5 rounded-2xl border border-brand-purple/25 bg-brand-purple/5 hover:border-brand-purple/60 hover:bg-brand-purple/10 transition-all cursor-pointer group text-left"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Swords
            className="w-8 h-8 text-brand-violet shrink-0 group-hover:scale-110 transition-transform"
            strokeWidth={1.5}
          />
          <span>
            <span className="block font-display font-bold text-white">Challenge a Friend</span>
            <span className="block text-white/45 text-sm">Share a private code, compare scores</span>
          </span>
        </motion.button>
      </div>
    </section>
  );
}
