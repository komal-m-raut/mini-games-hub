'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Star, Users } from 'lucide-react';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { useSiteStats } from '@/hooks/useSiteStats';
import { GameMeta } from '@/types/game';

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
          <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
            Play Now
          </span>
        ) : (
          <span className="absolute top-3 right-3 text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/55 border border-white/10">
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
        <p className="text-white/55 text-sm leading-relaxed mb-3">{game.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {game.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/55 border border-white/[0.08] capitalize"
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
      <div
        className="fade-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-purple/30 bg-brand-purple/10 text-brand-violet text-xs font-mono mb-6"
        style={{ animationDelay: '0.1s' }}
      >
        <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
        Instant play · No download · No login required
      </div>

      <h1
        className="fade-up font-display font-black text-4xl sm:text-6xl lg:text-7xl text-white leading-tight mb-4"
        style={{ animationDelay: '0.15s' }}
      >
        <span className="neon-text-purple">Mini</span>{' '}
        <span className="text-white">Games</span>{' '}
        <span className="neon-text-cyan">Hub</span>
      </h1>

      <p
        className="fade-up text-white/50 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed"
        style={{ animationDelay: '0.3s' }}
      >
        Quick stress-buster games to relax, focus, and compete. New games added regularly.
      </p>

      <div
        className="fade-up flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-8 text-sm"
        style={{ animationDelay: '0.45s' }}
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
      </div>
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
        <h2 className="fade-up font-display font-bold text-2xl text-white mb-6">
          Choose a Game
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_REGISTRY.map((game, i) => (
            <div key={game.id} className="fade-up" style={{ animationDelay: `${0.08 * i}s` }}>
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
