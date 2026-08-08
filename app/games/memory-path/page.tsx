import type { Metadata } from 'next';
import { MemoryPathGame } from '@/games/memory-path/MemoryPathGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { SITE_URL } from '@/lib/constants';

const HOW_TO_PLAY_STEPS = [
  'Watch the path light up. A sequence of cells glows across the grid one at a time — memorize the order before it fades.',
  'Trace it back. Once the path fades, drag across the grid (or use the arrow keys plus Space) to retrace the same cells in the same order.',
  'Choose your grid. Easy is a smaller grid with a shorter path and a start-cell hint; Medium and Hard scale up the grid size and path length with no hint.',
  'Get scored. Your accuracy — how many cells you traced correctly, in order — earns a score out of 10; a Perfect needs the whole path back with no extra or missed cells.',
  'Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone traces the same paths.',
];

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
        <GameHeader gameId="memory-path" />
        <MemoryPathGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Memory Path" steps={HOW_TO_PLAY_STEPS} />

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
