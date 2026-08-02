import type { Metadata } from 'next';
import { MemoryPathGame } from '@/games/memory-path/MemoryPathGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameBackLink } from '@/components/game/GameBackLink';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { SITE_URL } from '@/lib/constants';

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Memory Path free — no download, no signup. A neon path lights up across the grid: memorize it, then trace it back. A quick brain game for focus.';

const longDescription =
  'Play Memory Path free, no download or signup required. A neon path lights up across the grid — memorize it, then trace it back in order. A quick browser brain game that trains focus, recall, and reflexes.';

export const metadata: Metadata = {
  title: 'Memory Path',
  description,
  alternates: { canonical: '/games/memory-path' },
  openGraph: {
    title: 'Memory Path — Free Memory & Focus Game',
    description,
    url: '/games/memory-path',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Memory Path' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Memory Path — Free Memory & Focus Game',
    description,
    images: ['/og.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Memory Path',
  description: longDescription,
  url: `${SITE_URL}/games/memory-path`,
  genre: ['Memory', 'Focus'],
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function MemoryPathPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

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
