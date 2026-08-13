import type { Metadata } from 'next';
import { BullseyeGame } from '@/games/bullseye/BullseyeGame';
import { CONTENT } from '@/games/bullseye/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty, then watch a vertical aim line sweep up and down the dartboard — tap, click, or press Space the instant it reads the height you want, and it locks in place.',
  'A horizontal aim line immediately takes over, sweeping left to right across the same board — lock it the same way to fix your width, and the two locked reads together decide where the dart aims.',
  "The dart lands with a small seeded wobble around that point, because a real throw never lands exactly where the hand released it, then a ring label and a thunk (or a 'BULLSEYE!' flash on a dead-centre throw) shows how it landed.",
  "Throw 5 darts to finish a round — your round's accuracy is the average of those 5 throws, scored out of 10, and Solo runs 3 rounds at your chosen difficulty for 15 darts total.",
  'Play a Daily or Friend Challenge for 3 fixed, seeded rounds (Easy, Medium, Hard) so every player throws identical conditions — same starting sweeps, same drift, same wobble — and only your timing decides the leaderboard.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Bullseye free — no download, no signup. Two taps lock your aim, a seeded wobble lands the dart. Throw 5 darts a round for a top score.';

const longDescription =
  "Play Bullseye free, no download or signup required. One tap locks a sweeping vertical aim line, a second locks the horizontal line that follows — together they fix where your dart throws, then a small seeded wobble scatters the landing like a real dart never lands exactly on the point of release. Score accuracy from the board's true centre outward across 5-dart rounds, with a difficulty ladder that speeds up both sweeps, widens the wobble, and on Hard drifts the pace itself every half-swing.";

export const metadata: Metadata = {
  title: 'Bullseye',
  description,
  alternates: { canonical: '/games/bullseye' },
  openGraph: {
    title: 'Bullseye — Free Darts Precision Game',
    description,
    url: '/games/bullseye',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Bullseye' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bullseye — Free Darts Precision Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('bullseye')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function BullseyePage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="bullseye" />
        <BullseyeGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Bullseye" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="bullseye" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="bullseye" title="Bullseye — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
