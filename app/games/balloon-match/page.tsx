import type { Metadata } from 'next';
import { BalloonGame } from '@/games/balloon-match/BalloonGame';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameBackLink } from '@/components/game/GameBackLink';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';

const description =
  'Watch a balloon, then recreate it from memory by pressing and holding. How accurate can you be?';

export const metadata: Metadata = {
  title: 'Balloon Match',
  description,
  alternates: { canonical: '/games/balloon-match' },
  openGraph: {
    title: 'Balloon Match',
    description,
    url: '/games/balloon-match',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Balloon Match' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Balloon Match',
    description,
    images: ['/og.png'],
  },
};

export default function BalloonMatchPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
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
