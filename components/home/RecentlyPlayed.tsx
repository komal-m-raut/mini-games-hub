'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { GameMeta } from '@/types/game';

interface RecentlyPlayedProps {
  games: GameMeta[];
}

export function RecentlyPlayed({ games }: RecentlyPlayedProps) {
  if (games.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-xl text-white">Recently Played</h3>
        <Link
          href="/"
          className="text-sm text-brand-cyan hover:text-brand-cyan/80 transition-colors flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {games.map((game, idx) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            viewport={{ once: true }}
          >
            <Link
              href={game.href}
              className="group flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-brand-purple/30 transition-all duration-200"
            >
              <div className="text-3xl">{game.emoji}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-sm text-white truncate group-hover:text-brand-cyan transition-colors">
                  {game.title}
                </h4>
                <p className="text-[11px] text-text-muted">{game.tags[0]}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
