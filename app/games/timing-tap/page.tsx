import type { Metadata } from 'next';
import { TimingTapGame } from '@/games/timing-tap/TimingTapGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameBackLink } from '@/components/game/GameBackLink';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { SITE_URL } from '@/lib/constants';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty. Easy gives you a wide Perfect Zone and a slow indicator; Medium shrinks the zone and speeds things up; Hard shrinks the zone further still and drifts its speed a little faster or slower on every pass, so you can't lock into a rhythm.",
  'Watch the 3-2-1 countdown, then the indicator sweeps back and forth along the bar, bouncing off each end for as long as you let it run.',
  'Tap or click anywhere on the bar — or press Space — the instant it crosses the Perfect Zone at the centre; it stops dead wherever it was the moment you act.',
  "Get scored. Your accuracy is measured from the exact centre of the bar and judged against that difficulty's zone width, earning a score out of 10 with a rating from Perfect down to Try Again.",
  'Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone sweeps identical conditions.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Timing Tap free — no download, no signup. A glowing indicator sweeps a neon bar: tap the instant it crosses the Perfect Zone at the centre.';

const longDescription =
  'Play Timing Tap free, no download or signup required. A glowing indicator sweeps back and forth along a neon bar — tap or press Space the instant it crosses the Perfect Zone at the centre. A fast browser reflex game that scores your timing accuracy from dead centre outward, with a difficulty ladder that shrinks the zone, speeds up the sweep, and — on Hard — drifts the pace every pass.';

export const metadata: Metadata = {
  title: 'Timing Tap',
  description,
  alternates: { canonical: '/games/timing-tap' },
  openGraph: {
    title: 'Timing Tap — Free Reflex & Timing Game',
    description,
    url: '/games/timing-tap',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Timing Tap' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Timing Tap — Free Reflex & Timing Game',
    description,
    images: ['/og.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'VideoGame',
  name: 'Timing Tap',
  description: longDescription,
  url: `${SITE_URL}/games/timing-tap`,
  genre: ['Reflex', 'Timing'],
  applicationCategory: 'Game',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function TimingTapPage() {
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
          🎯 Timing Tap
        </h1>
        <TimingTapGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Timing Tap" steps={HOW_TO_PLAY_STEPS} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="timing-tap" title="Timing Tap — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
