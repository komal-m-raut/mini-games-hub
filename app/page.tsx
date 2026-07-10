'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Star, Users } from 'lucide-react';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { AdBanner } from '@/components/ads/AdBanner';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameMeta } from '@/types/game';

// ── Animation variants ──────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

// ── Game Card ───────────────────────────────
function GameCard({ game }: { game: GameMeta }) {
  const Wrapper = game.isAvailable ? Link : 'div';

  return (
    <Wrapper
      // @ts-expect-error — href is only used when isAvailable is true
      href={game.isAvailable ? game.href : undefined}
      className={`game-card group ${!game.isAvailable ? 'game-card-unavailable' : ''}`}
      aria-disabled={!game.isAvailable}
    >
      {/* Gradient banner */}
      <div
        className="h-28 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${game.gradientFrom}22, ${game.gradientTo}44)` }}
      >
        {/* Hover glow blob */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `radial-gradient(circle at 50% 50%, ${game.glowColor}, transparent 70%)` }}
        />
        <motion.span
          className="text-5xl relative z-10"
          whileHover={{ scale: 1.15, rotate: [-3, 3, -3, 0] }}
          transition={{ duration: 0.4 }}
        >
          {game.emoji}
        </motion.span>

        {game.isAvailable ? (
          <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            Play Now
          </span>
        ) : (
          <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/10">
            Coming Soon
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-display font-bold text-lg mb-1 transition-all duration-300"
          style={{
            backgroundImage: `linear-gradient(90deg, ${game.gradientFrom}, ${game.gradientTo})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: game.isAvailable ? 'transparent' : 'rgba(255,255,255,0.6)',
          }}
        >
          {game.title}
        </h3>
        <p className="text-white/45 text-sm leading-relaxed mb-3">{game.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/30 border border-white/[0.08] capitalize"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Wrapper>
  );
}

// ── Hero Section ────────────────────────────
function HeroSection() {
  return (
    <div className="text-center py-16 sm:py-24">
      <motion.div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-violet text-xs font-mono mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
        Instant play · No download · No login required
      </motion.div>

      <motion.h1
        className="font-display font-black text-4xl sm:text-6xl lg:text-7xl text-white leading-tight mb-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 120 }}
      >
        <span className="neon-text-purple">Mini</span>{' '}
        <span className="text-white">Games</span>{' '}
        <span className="neon-text-cyan">Hub</span>
      </motion.h1>

      <motion.p
        className="text-white/50 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        Quick stress-buster games to relax, focus, and compete. New games added regularly.
      </motion.p>

      <motion.div
        className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-8 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        {[
          { Icon: Star,  label: '1 Game Live',       color: '#EAB308' },
          { Icon: Users, label: '14,823 Players',     color: '#06B6D4' },
          { Icon: Zap,   label: 'More Coming Soon',   color: '#A78BFA' },
        ].map(({ Icon, label, color }) => (
          <div key={label} className="flex items-center gap-1.5 font-mono" style={{ color }}>
            <Icon className="w-4 h-4" strokeWidth={1.5} />
            <span>{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ── Page ─────────────────────────────────────
export default function HubPage() {
  return (
    <div className="page-container py-6 sm:py-10 flex flex-col gap-16">
      <HeroSection />

      {/* Games grid */}
      <section>
        <motion.h2
          className="font-display font-bold text-2xl text-white mb-6"
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          Choose a Game
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {GAME_REGISTRY.map((game) => (
            <motion.div key={game.id} variants={fadeUp}>
              <GameCard game={game} />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Ad: below game grid */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <AdBanner placement="below-hub-banner" format="leaderboard" />
      </motion.div>

      {/* Leaderboard */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
      >
        <h2 className="font-display font-bold text-2xl text-white mb-6">Leaderboard</h2>
        <Leaderboard gameId="balloon-match" />
      </motion.section>
    </div>
  );
}
