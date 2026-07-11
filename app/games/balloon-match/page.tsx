import type { Metadata } from 'next';
import { BalloonGame } from '@/games/balloon-match/BalloonGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';

export const metadata: Metadata = {
  title: 'Balloon Match',
  description:
    'Watch a balloon, then recreate it from memory by pressing and holding. How accurate can you be?',
  alternates: { canonical: '/games/balloon-match' },
  openGraph: {
    title: 'Balloon Match',
    description:
      'Watch a balloon, then recreate it from memory by pressing and holding. How accurate can you be?',
    url: '/games/balloon-match',
  },
};

export default function BalloonMatchPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Game */}
      <BalloonGame />

      {/* Ad: between game and leaderboard (never during gameplay) */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>

      {/* Leaderboard */}
      <section>
        <h2 className="font-display font-bold text-xl text-white mb-4">
          Balloon Match — Leaderboard
        </h2>
        <Leaderboard gameId="balloon-match" />
      </section>
    </div>
  );
}
