import type { Metadata } from 'next';
import { MemoryPathGame } from '@/games/memory-path/MemoryPathGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameBackLink } from '@/components/game/GameBackLink';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';

const description =
  'A neon path lights up across the grid. Memorize it, then trace it back from memory.';

export const metadata: Metadata = {
  title: 'Memory Path',
  description,
  alternates: { canonical: '/games/memory-path' },
  openGraph: {
    title: 'Memory Path',
    description,
    url: '/games/memory-path',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Memory Path' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Memory Path',
    description,
    images: ['/og.png'],
  },
};

export default function MemoryPathPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <div>
        <div className="mb-3">
          <GameBackLink />
        </div>
        <h1 className="text-center font-display text-xs sm:text-sm font-bold text-white/55 uppercase tracking-[0.2em] mb-3">
          🧠 Memory Path
        </h1>
        <MemoryPathGame />
      </div>

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="memory-path" title="Memory Path — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
