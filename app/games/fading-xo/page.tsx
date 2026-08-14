import type { Metadata } from 'next';
import { FadingXoGame } from '@/games/fading-xo/FadingXoGame';
import { CONTENT } from '@/games/fading-xo/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty, then play best-of-three against the bot: place your first three marks by tapping any empty cell, exactly like classic tic-tac-toe, and three in a row during this opening phase wins the game immediately.",
  "Once both sides have placed all three marks, the board starts recycling — on every turn from then on, you must teleport your oldest mark (shown faded with a shimmer) to any empty cell, where it becomes your newest.",
  "The bot's oldest mark fades the same way on your screen, so watch both ghost clocks: a three-in-a-row must be completed the turn it opens, since your own oldest mark — or the bot's next move — can dismantle it a moment later.",
  "Three in a row after any placement or movement wins the game outright; if the board reaches 60 total actions with nobody ahead, that game ends in a draw.",
  "Win, lose or draw, the duel continues until three games are played. A solo warm-up is one best-of-three; Daily and Friend Challenges use a three-round ladder for a shared score out of 30.",
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Ghost Grid free — no download, no signup. Tic-tac-toe where your oldest mark fades and must teleport away each turn, so every line you build decays.';

const longDescription =
  'Play Ghost Grid free, no download or signup required. It starts like classic tic-tac-toe — place three marks, three in a row wins — but once both sides are down, your oldest mark fades and must teleport to a new cell every turn, and so does the bot\'s. A strategy duel where nothing on the board stays put, with an easy, medium and hard bot, best-of-three scoring, and a Daily Challenge shared by every player.';

export const metadata: Metadata = {
  title: 'Ghost Grid',
  description,
  alternates: { canonical: '/games/fading-xo' },
  openGraph: {
    title: 'Ghost Grid — Free Strategy Duel',
    description,
    url: '/games/fading-xo',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Ghost Grid' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ghost Grid — Free Strategy Duel',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('fading-xo')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function FadingXoPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="fading-xo" />
        <FadingXoGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Ghost Grid" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="fading-xo" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="fading-xo" title="Ghost Grid — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
