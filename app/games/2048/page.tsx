import type { Metadata } from 'next';
import { Game2048 } from '@/games/2048/Game2048';
import { CONTENT } from '@/games/2048/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Swipe in any direction, tap the on-screen chevrons, or use the arrow keys/WASD — every tile slides as far as it can that way, and any two equal tiles that meet along the path merge into one tile worth double.',
  'A new 2 or 4 appears in a random empty cell after every move that actually changes the board; a press that would leave the board untouched costs nothing and spawns nothing.',
  'Solo play is endless classic 2048: there is no round limit, just keep merging until no direction changes the board anymore. Reaching a 2048 tile pops a one-time celebration banner, but the run keeps going after you dismiss it.',
  "You get exactly one undo per solo run, for the swipe that goes wrong — it restores your board, score and move count to just before your last move, and it's gone for good the moment you use it.",
  'A Daily or Friend Challenge swaps the open-ended run for three fixed 90-second sprints from a fresh board each time, with every spawn seeded identically for everyone on that code — so the leaderboard is a fair comparison of play, not luck.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play 2048 free — no download, no signup. Slide numbered tiles so equal pairs merge and double. Build your way to the 2048 tile and beyond.';

const longDescription =
  'Play 2048 free, no download or signup required. Slide tiles across a 4×4 grid so equal pairs merge and double — an endless classic run in solo, or three seeded 90-second sprints in a Daily or Friend Challenge. Every merge chain buys back board space for the next spawn, and the whole game is a race against a shrinking amount of room to keep growing in.';

export const metadata: Metadata = {
  title: '2048',
  description,
  alternates: { canonical: '/games/2048' },
  openGraph: {
    title: '2048 — Free Merge Puzzle Game',
    description,
    url: '/games/2048',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '2048' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '2048 — Free Merge Puzzle Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('2048')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function Game2048Page() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="2048" />
        <Game2048 />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play 2048" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="2048" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="2048" title="2048 — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
