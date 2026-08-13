import type { Metadata } from 'next';
import { XOShiftGame } from '@/games/xo-shift/XOShiftGame';
import { CONTENT } from '@/games/xo-shift/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty, then play a round: a fixed best-of-3 against that difficulty's bot, always exactly 3 games regardless of who's ahead.",
  'Each game starts in Placement — you and the bot alternate placing marks on the 3×3 grid until you each have 3 down, and three in a row at any point wins immediately.',
  "If nobody wins by then, the game shifts into Movement: tap one of your marks to select it (legal destinations light up, and any cell it's locked out of by the no-backtrack rule shows crossed out), then tap an empty adjacent cell — orthogonal or diagonal — to slide it there.",
  "A piece that just slid can't immediately slide straight back to the cell it left — but only that one piece, and only until it moves again, so you can always clear the lock by moving it elsewhere first.",
  'A win scores 10, a draw 5, a loss 0 for that game, averaged across the round\'s 3 games for a score out of 10. A solo session plays 3 rounds at your difficulty; a Daily or Friend Challenge runs one seeded round each against Easy, Medium and Hard.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  "Play XO Shift free — a three men's morris duel. Place three marks, then slide them to line up three in a row before the bot does.";

const longDescription =
  "Play XO Shift free, no download or signup required. A duel built on three men's morris, one of the oldest board games known: place three marks like tic-tac-toe, then shift them one adjacent cell at a time — orthogonal or diagonal — to line up three in a row before the bot does, with a no-backtrack rule that keeps every slide meaningful. Solo play is three best-of-3 rounds at your chosen difficulty; Daily and Friend Challenges run one seeded round each against Easy, Medium and Hard bots.";

export const metadata: Metadata = {
  title: 'XO Shift',
  description,
  alternates: { canonical: '/games/xo-shift' },
  openGraph: {
    title: 'XO Shift — Free Strategy Duel',
    description,
    url: '/games/xo-shift',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'XO Shift' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XO Shift — Free Strategy Duel',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('xo-shift')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function XOShiftPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="xo-shift" />
        <XOShiftGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play XO Shift" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="xo-shift" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="xo-shift" title="XO Shift — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
