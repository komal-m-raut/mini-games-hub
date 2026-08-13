import type { Metadata } from 'next';
import { BalloonGame } from '@/games/balloon-match/BalloonGame';
import { CONTENT } from '@/games/balloon-match/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Memorize the balloon. Each round opens with a target balloon on screen for a few seconds — take in its size and color before it disappears.',
  'Pick a difficulty. Easy gives you as long as you like to inflate; Medium and Hard add a countdown, so you have to lock in fast.',
  'Hold to inflate. Press and hold the balloon to grow your own, then release the moment you think it matches the size you just saw.',
  "Get scored. Your accuracy — how close your final size lands to the target — earns a score out of 10, rated from Try Again up to Perfect.",
  'Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone plays identical targets and scores are directly comparable.',
];

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

const meta = getGameMeta('balloon-match')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function BalloonMatchPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      {/* Game */}
      <div>
        <GameHeader gameId="balloon-match" />
        <BalloonGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Balloon Match" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="balloon-match" content={CONTENT} />

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
