'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Star, Users } from 'lucide-react';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { AdBanner } from '@/components/ads/AdBanner';
import { useSiteStats } from '@/hooks/useSiteStats';
import { GameMeta } from '@/types/game';
import { useState, useMemo } from 'react';
import { FeaturedGame } from '@/components/home/FeaturedGame';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { RecentlyPlayed } from '@/components/home/RecentlyPlayed';

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
      className={`group rounded-xl border transition-all duration-300 overflow-hidden ${
        game.isAvailable
          ? 'border-white/10 bg-white/5 hover:border-brand-purple/50 hover:bg-white/10 cursor-pointer'
          : 'border-white/5 bg-white/[0.02] opacity-60'
      }`}
      aria-disabled={!game.isAvailable}
    >
      {/* Gradient banner */}
      <div
        className="h-32 flex items-center justify-center relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${game.gradientFrom}22, ${game.gradientTo}44)` }}
      >
        {/* Hover effect */}
        {game.isAvailable && (
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: `radial-gradient(circle at 50% 50%, ${game.glowColor}, transparent 70%)` }}
          />
        )}
        <motion.span
          className="text-5xl relative z-10"
          whileHover={game.isAvailable ? { scale: 1.15, rotate: [-3, 3, -3, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {game.emoji}
        </motion.span>

        {game.isAvailable ? (
          <motion.span
            className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full bg-brand-success/20 text-brand-success border border-brand-success/40"
            initial={{ opacity: 0.7 }}
            whileHover={{ opacity: 1 }}
          >
            <span className="w-1.5 h-1.5 bg-brand-success rounded-full animate-pulse" />
            Play
          </motion.span>
        ) : (
          <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-1 rounded-full bg-white/5 text-text-dim border border-white/10">
            Coming Soon
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-bold text-base mb-1 text-white group-hover:text-brand-cyan transition-colors">
          {game.title}
        </h3>
        <p className="text-text-muted text-sm leading-relaxed mb-3">{game.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {game.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-text-dim border border-white/10 capitalize"
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
  const stats = useSiteStats();
  const liveCount = GAME_REGISTRY.filter((g) => g.isAvailable).length;

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
          { Icon: Star,  label: `${liveCount} Game${liveCount === 1 ? '' : 's'} Live`, color: '#EAB308' },
          {
            Icon: Users,
            label: `${(stats?.totalPlayers ?? 0).toLocaleString()} Player${stats?.totalPlayers === 1 ? '' : 's'}`,
            color: '#06B6D4',
          },
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
  const [activeCategory, setActiveCategory] = useState('all');
  const availableGames = useMemo(() => GAME_REGISTRY.filter((g) => g.isAvailable), []);
  
  const recentlyPlayed = useMemo(() => availableGames.slice(0, 4), [availableGames]);
  const featuredGame = useMemo(() => availableGames[0], [availableGames]);

  const filteredGames = useMemo(() => {
    if (activeCategory === 'all') return GAME_REGISTRY;
    return GAME_REGISTRY.filter((game) =>
      game.tags.some((tag) => tag.toLowerCase().includes(activeCategory))
    );
  }, [activeCategory]);

  return (
    <div className="page-container py-6 sm:py-10 flex flex-col gap-12">
      <HeroSection />

      {/* Featured Game Section */}
      {featuredGame && (
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <FeaturedGame game={featuredGame} />
        </motion.section>
      )}

      {/* Recently Played */}
      {recentlyPlayed.length > 0 && (
        <RecentlyPlayed games={recentlyPlayed} />
      )}

      {/* Games grid with category filters */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <motion.h2
            className="font-display font-bold text-2xl text-white"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            All Games
          </motion.h2>
        </div>

        <div className="mb-6">
          <CategoryTabs activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
        </div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {filteredGames.map((game) => (
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
    </div>
  );
}
