'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { GameMeta } from '@/types/game';

interface FeaturedGameProps {
  game: GameMeta;
}

export function FeaturedGame({ game }: FeaturedGameProps) {
  if (!game.isAvailable) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm"
    >
      {/* Background with gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `linear-gradient(135deg, ${game.gradientFrom}44, ${game.gradientTo}44)`,
        }}
      />

      {/* Content grid */}
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12">
        {/* Left: Info */}
        <div className="flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-featured/20 text-brand-featured border border-brand-featured/30 w-fit text-xs font-mono mb-4"
          >
            <span className="w-2 h-2 rounded-full bg-brand-featured animate-pulse" />
            Featured
          </motion.div>

          <h2 className="font-display font-black text-3xl md:text-4xl text-white mb-3 leading-tight">
            {game.title}
          </h2>

          <p className="text-text-muted text-base leading-relaxed mb-6 max-w-md">
            {game.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {game.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-mono px-3 py-1 rounded-full bg-white/5 text-text-muted border border-white/10 capitalize"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA */}
          <Link
            href={game.href}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-purple hover:bg-brand-purple/90 text-white font-medium transition-all duration-200 w-fit group"
          >
            <Play className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            Play Now
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </Link>
        </div>

        {/* Right: Emoji visual */}
        <motion.div
          className="hidden md:flex items-center justify-center"
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            className="text-8xl"
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
            transition={{ duration: 0.5 }}
          >
            {game.emoji}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
