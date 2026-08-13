import type { Metadata } from 'next';
import { BlockCountGame } from '@/games/block-count/BlockCountGame';
import { CONTENT } from '@/games/block-count/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty. Easy sweeps 6–10 red blocks past cool grey decoys at a relaxed pace; Medium raises the count and mixes in warm orange and pink decoys; Hard pushes the count higher still, adds crimson-adjacent decoys, and lets blocks cluster and overlap.',
  'Watch the sweep: a loose crowd of rounded blocks drifts left to right across the stage over a few seconds, staggering in rather than all appearing at once.',
  'Track only the red blocks as they cross — every other colour, however close the hue, is a decoy and should be ignored.',
  'Once the sweep ends, type your count on the number pad (or use your keyboard) and submit — there is no time limit on the guess itself.',
  "Get scored on how close you were: an exact count earns a full 10, and a near-miss still earns most of the round's points, judged against how many reds were actually on screen.",
  'Play a session or a challenge. A solo session is five sweeps at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded sweeps (Easy, Medium, Hard) so everyone counts identical conditions.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Block Count free — no download, no signup. Blocks sweep across the screen in a moving crowd: count only the red ones and enter your total.';

const longDescription =
  'Play Block Count free, no download or signup required. A loose crowd of rounded blocks drifts across the stage — count only the red ones among grey, orange, pink and crimson decoys, then enter your total on the number pad. A perception and subitizing game that scores how close your count was, with a difficulty ladder that raises the red count, adds harder-to-spot decoys, speeds up the sweep, and — on Hard — lets blocks cluster and overlap.';

export const metadata: Metadata = {
  title: 'Block Count',
  description,
  alternates: { canonical: '/games/block-count' },
  openGraph: {
    title: 'Block Count — Free Counting & Perception Game',
    description,
    url: '/games/block-count',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Block Count' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Block Count — Free Counting & Perception Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('block-count')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function BlockCountPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="block-count" />
        <BlockCountGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Block Count" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="block-count" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="block-count" title="Block Count — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
