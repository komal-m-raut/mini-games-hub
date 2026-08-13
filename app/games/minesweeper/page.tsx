import type { Metadata } from 'next';
import { MinesweeperGame } from '@/games/minesweeper/MinesweeperGame';
import { CONTENT } from '@/games/minesweeper/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty. Easy is a 9×9 grid with 10 mines, Medium is 12×12 with 26 mines, and Hard is a tall 12×16 grid with 45 mines, sized to scroll rather than spread wide on a phone.',
  "Tap a hidden cell to reveal it — your very first tap on a fresh solo board is always guaranteed safe, along with its 8 neighbours, since the mines aren't placed until after that click.",
  'Each revealed number tells you how many mines sit in its 8 neighbouring cells; long-press a cell for under half a second (or right-click on desktop) to flag one you\'re certain is a mine, or switch on flag mode to flag with a plain tap instead.',
  "Tap an already-revealed number once you've flagged exactly as many neighbours as it shows to chord it — revealing every remaining neighbour at once, which can still cost you the round if a flag was on the wrong cell.",
  'Clear every non-mine cell to win the board. A solo session or Daily/Friend Challenge runs three boards — Easy, Medium, Hard — scored on time for a win and on how much safe ground you mapped out if you hit a mine.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Minesweeper free — no download, no signup. Clear the board using the number clues, flag the mines, and don\'t set one off. First click always safe.';

const longDescription =
  "Play Minesweeper free, no download or signup required. The classic logic puzzle: reveal cells, read the numbers that count each cell's neighbouring mines, and flag every mine you can prove — no guessing needed to win. Solo play guarantees your first click is safe; Daily and Friend Challenges use a fixed, identical mine field for everyone with a shared pre-revealed opening, so every player starts the same board.";

export const metadata: Metadata = {
  title: 'Minesweeper',
  description,
  alternates: { canonical: '/games/minesweeper' },
  openGraph: {
    title: 'Minesweeper — Free Classic Logic Puzzle',
    description,
    url: '/games/minesweeper',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Minesweeper' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Minesweeper — Free Classic Logic Puzzle',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('minesweeper')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function MinesweeperPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="minesweeper" />
        <MinesweeperGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Minesweeper" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="minesweeper" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="minesweeper" title="Minesweeper — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
