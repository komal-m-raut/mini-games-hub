import type { Metadata } from 'next';
import { PerfectPourGame } from '@/games/perfect-pour/PerfectPourGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';

const description =
  'Watch a glass fill, then pour it back from memory. A calm test of timing and touch.';

export const metadata: Metadata = {
  title: 'Perfect Pour',
  description,
  alternates: { canonical: '/games/perfect-pour' },
  openGraph: {
    title: 'Perfect Pour',
    description,
    url: '/games/perfect-pour',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Perfect Pour' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Perfect Pour',
    description,
    images: ['/og.png'],
  },
};

export default function PerfectPourPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <div>
        <h1 className="text-center font-display text-xs sm:text-sm font-bold text-white/40 uppercase tracking-[0.2em] mb-3">
          🥤 Perfect Pour
        </h1>
        <PerfectPourGame />
      </div>

      {/* Leaderboard */}
      <section>
        <h2 className="font-display font-bold text-xl text-white mb-4">
          Perfect Pour — Leaderboard
        </h2>
        <Leaderboard gameId="perfect-pour" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
