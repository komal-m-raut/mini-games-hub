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
  openGraph: { title: 'Perfect Pour', description, url: '/games/perfect-pour' },
};

export default function PerfectPourPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <PerfectPourGame />

      {/* Ad sits outside the game view — never during a round */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>

      {/* Leaderboard */}
      <section>
        <h2 className="font-display font-bold text-xl text-white mb-4">
          Perfect Pour — Leaderboard
        </h2>
        <Leaderboard gameId="perfect-pour" />
      </section>
    </div>
  );
}
