import type { Metadata } from 'next';
import { SnakeGame } from '@/games/snake/SnakeGame';
import { CONTENT } from '@/games/snake/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty, then play solo endless or a Daily/Friend Challenge — Easy starts slow and eases only to a 95ms tick, Medium and Hard start faster and ease to lower floors still, so the snake keeps quickening the more it eats.',
  'Steer with the arrow keys or WASD, swipe on a touchscreen, or tap the on-screen d-pad — turns queue up to two deep, so a fast double-turn like down-then-left lands cleanly one tick at a time instead of getting lost.',
  'Eat the pulsing food dot to grow one segment and push your score up, but never cross a wall or your own tail — moving into your tail cell is fine the instant it vacates, but fatal the moment you are also growing that same tick.',
  'In Solo, the run is endless: your food count is the score, and your best per difficulty is saved on this device until a run beats it.',
  'In a Daily or Friend Challenge, you get three fixed 60-second rounds at Easy, Medium and Hard speed with an identical food sequence for every player — dying early banks whatever you ate so far, and each round scores out of 10 toward a 30-point total.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Snake free — no download, no signup. Steer the snake to the food, grow with every bite, and dodge the walls and your own tail. The classic, neon-styled.';

const longDescription =
  'Play Snake free, no download or signup required. Steer a neon snake around a 17×15 grid, eating pulsing food to grow while dodging the walls and your own tail — the classic exactly as you remember it, with arrow-key, swipe and on-screen d-pad controls and a 2-deep turn queue for clean fast turns. Play Solo for an endless run scored by food eaten, or race a seeded 3-round Daily or Friend Challenge (Easy, Medium, Hard, 60 seconds each) against a shared leaderboard.';

export const metadata: Metadata = {
  title: 'Snake',
  description,
  alternates: { canonical: '/games/snake' },
  openGraph: {
    title: 'Snake — Free Classic Arcade Game',
    description,
    url: '/games/snake',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Snake' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snake — Free Classic Arcade Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('snake')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function SnakePage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="snake" />
        <SnakeGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Snake" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="snake" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="snake" title="Snake — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
