import type { Metadata } from 'next';
import { PerfectPourGame } from '@/games/perfect-pour/PerfectPourGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameBackLink } from '@/components/game/GameBackLink';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { SITE_URL } from '@/lib/constants';

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Perfect Pour free — no download, no signup. Watch a glass fill, then pour it back to the same level from memory. A calm test of timing and touch.';

const longDescription =
  'Play Perfect Pour free, no download or signup required. Watch a glass fill up, then pour it back to the exact same level from memory — a calm, quick browser game that tests timing, touch, and visual recall.';

export const metadata: Metadata = {
  title: 'Perfect Pour',
  description,
  alternates: { canonical: '/games/perfect-pour' },
  openGraph: {
    title: 'Perfect Pour — Free Memory & Precision Game',
    description,
    url: '/games/perfect-pour',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Perfect Pour' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perfect Pour — Free Memory & Precision Game',
    description,
    images: ['/og.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Perfect Pour',
  description: longDescription,
  url: `${SITE_URL}/games/perfect-pour`,
  genre: ['Memory', 'Precision'],
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function PerfectPourPage() {
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
          🥤 Perfect Pour
        </h1>
        <PerfectPourGame />
      </div>

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="perfect-pour" title="Perfect Pour — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
