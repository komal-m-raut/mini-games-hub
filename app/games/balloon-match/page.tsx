import type { Metadata } from 'next';
import { BalloonGame } from '@/games/balloon-match/BalloonGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameBackLink } from '@/components/game/GameBackLink';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { SITE_URL } from '@/lib/constants';

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Balloon Match free — no download, no signup. Watch a balloon inflate, then recreate its size from memory. A quick test of memory and precision.';

const longDescription =
  'Play Balloon Match free, no download or signup required. Watch a balloon inflate, then recreate its exact size from memory by pressing and holding — a quick browser game that tests memory and precision in equal measure.';

export const metadata: Metadata = {
  title: 'Balloon Match',
  description,
  alternates: { canonical: '/games/balloon-match' },
  openGraph: {
    title: 'Balloon Match — Free Memory & Precision Game',
    description,
    url: '/games/balloon-match',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Balloon Match' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balloon Match — Free Memory & Precision Game',
    description,
    images: ['/og.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Balloon Match',
  description: longDescription,
  url: `${SITE_URL}/games/balloon-match`,
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

export default function BalloonMatchPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Game */}
      <div>
        <div className="mb-3">
          <GameBackLink />
        </div>
        <h1 className="text-center font-display text-xs sm:text-sm font-bold text-white/55 uppercase tracking-[0.2em] mb-3">
          🎈 Balloon Match
        </h1>
        <BalloonGame />
      </div>

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="balloon-match" title="Balloon Match — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
