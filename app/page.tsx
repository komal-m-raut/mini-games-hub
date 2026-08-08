'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { useSiteStats } from '@/hooks/useSiteStats';
import { GameMeta } from '@/types/game';

// ── Game Card ───────────────────────────────
/**
 * One arcade cabinet. Everything a player needs before clicking is on the
 * face of it: the artwork, the name, how it feels, what you actually do, and
 * a Play affordance. No tag pills, no status badge, no SEO paragraph — the
 * long copy lives in `description` for crawlers and on the game page itself.
 */
function GameCard({ game }: { game: GameMeta }) {
  const Wrapper = game.isAvailable ? Link : 'div';

  return (
    <Wrapper
      // @ts-expect-error — href is only used when isAvailable is true
      href={game.isAvailable ? game.href : undefined}
      className={`game-card ${!game.isAvailable ? 'game-card-unavailable' : ''}`}
      style={{ '--game': game.accent } as React.CSSProperties}
      aria-disabled={!game.isAvailable}
      // Only the Link case needs a label — it's the only case with an
      // otherwise-ambiguous accessible name. The unavailable `div` case has
      // no implicit link semantics, so it just reads its own content.
      aria-label={game.isAvailable ? `Play ${game.title}` : undefined}
    >
      <div className="game-card__art">
        <span className="game-card__emoji" aria-hidden="true">
          {game.emoji}
        </span>
      </div>

      <div className="game-card__body">
        <p className="game-card__kind">{game.tagline}</p>
        <h3 className="game-card__title">{game.title}</h3>
        <p className="game-card__how">{game.howTo}</p>
      </div>

      <div className="game-card__cta">
        <span>{game.isAvailable ? 'Play' : 'Coming soon'}</span>
        {game.isAvailable && (
          <ArrowRight className="w-[1.15rem] h-[1.15rem]" strokeWidth={2.5} aria-hidden="true" />
        )}
      </div>
    </Wrapper>
  );
}

// ── Page ─────────────────────────────────────
export default function HubPage() {
  const stats = useSiteStats();
  const liveCount = GAME_REGISTRY.filter((g) => g.isAvailable).length;
  const players = stats?.totalPlayers ?? 0;

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-8 sm:gap-10">
      {/* Hero. Deliberately short: on a games hub the hero is a signpost, not
          a landing page. The old version spent ~700px on an eyebrow pill, a
          giant wordmark and a stat row before the first game appeared, which
          pushed every card below the fold. */}
      <header className="max-w-3xl">
        <h1
          className="fade-up font-display font-semibold text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.05]"
          style={{ animationDelay: '0.05s' }}
        >
          <span className="neon-text-purple">Tiny</span>{' '}
          <span className="neon-text-cyan">Arcadium</span>
        </h1>
        <p
          className="fade-up mt-4 text-lg sm:text-xl text-white/70 leading-relaxed"
          style={{ animationDelay: '0.12s' }}
        >
          Four small games to unwind with. Pick one and play — no download, no
          account.
        </p>
      </header>

      {/* Games */}
      <section className="flex flex-col gap-4">
        <div className="fade-up flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="font-display font-semibold text-3xl text-white">
            Pick a game
          </h2>
          {/* One quiet line of context, in plain words, instead of a row of
              icon+mono stat chips that read as a service status bar. */}
          <p className="text-base text-white/50">
            {liveCount} games
            {players > 0 && <> · {players.toLocaleString()} people have played</>}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {GAME_REGISTRY.map((game, i) => (
            <div key={game.id} className="fade-up" style={{ animationDelay: `${0.06 * i}s` }}>
              <GameCard game={game} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
