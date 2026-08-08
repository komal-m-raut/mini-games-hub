import type { Metadata } from 'next';
import { PerfectPourGame } from '@/games/perfect-pour/PerfectPourGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { SITE_URL } from '@/lib/constants';

const HOW_TO_PLAY_STEPS = [
  'Watch the glass fill. Each round starts with your glass automatically filling to a target level, held on screen for a few seconds so you can study it before it drains.',
  "Choose a difficulty. Easy pours into a big, forgiving glass; Hard pours into a small glass that fills faster, so overshooting costs you.",
  "Hold the tap to pour. Press and hold to pour water back in, then release the moment you think you've matched the level you saw.",
  'Get scored. Your accuracy — how close your final fill level is to the target, in percentage points — earns a score out of 10 with a matching rating.',
  'Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so every player pours to identical targets.',
];

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
        <GameHeader gameId="perfect-pour" />
        <PerfectPourGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Perfect Pour" steps={HOW_TO_PLAY_STEPS} />

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
