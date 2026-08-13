import type { Metadata } from 'next';
import { GridFlashGame } from '@/games/grid-flash/GridFlashGame';
import { CONTENT } from '@/games/grid-flash/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty. Easy lights up a 4×4 grid, Medium a 5×5 grid, and Hard a 6×6 grid — each with a lower par peak the further you climb before it, or a higher one to chase.",
  'A level starts with 3 tiles flashing at once for a moment (900ms on Hard, 1200ms on Easy and Medium), then the whole grid goes dark.',
  "Tap the tiles that lit up, in any order — a correct tap fills that tile in, while a wrong tap flashes red and costs one of your round's 3 lives without erasing what you'd already found.",
  'Clear the whole set and the next level adds one more tile to remember; keep climbing until your lives run out, and your round score comes from the highest level you actually completed.',
  'Play a session or a challenge. A solo session is three rounds at your chosen difficulty; a Daily or Friend challenge is three seeded rounds (Easy, Medium, Hard) with identical patterns level by level for everyone.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Grid Flash free — no download, no signup. Tiles flash on a grid, then go dark: tap the same pattern back from memory as it climbs level by level.';

const longDescription =
  'Play Grid Flash free, no download or signup required. A set of tiles flashes on a grid all at once, then goes dark — tap the same tiles back from memory, in any order. Each level adds one more tile to hold in mind, with 3 lives per round and a difficulty ladder that grows the grid from 4×4 up to 6×6 and shortens the flash on Hard.';

export const metadata: Metadata = {
  title: 'Grid Flash',
  description,
  alternates: { canonical: '/games/grid-flash' },
  openGraph: {
    title: 'Grid Flash — Free Visual Memory Game',
    description,
    url: '/games/grid-flash',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Grid Flash' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Grid Flash — Free Visual Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('grid-flash')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function GridFlashPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="grid-flash" />
        <GridFlashGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Grid Flash" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="grid-flash" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="grid-flash" title="Grid Flash — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
