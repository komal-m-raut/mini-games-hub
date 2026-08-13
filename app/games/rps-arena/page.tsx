import type { Metadata } from 'next';
import { RpsArenaGame } from '@/games/rps-arena/RpsArenaGame';
import { CONTENT } from '@/games/rps-arena/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty — Easy throws at random, Medium reads your favourite throw overall, and Hard also reads what you tend to throw right after your own last move, so each one gives the bot a genuinely different edge.',
  'Tap Rock, Paper or Scissors — or press 1, 2 or 3 — to lock in your throw for the round; the bot has already picked its move from your past throws alone before you commit, so it can never react to this one.',
  'Watch the 3-2-1 cadence, then both hands reveal together and a flash tells you whether you won, lost, or tied that throw; a tie simply replays with no game charged to either side.',
  'Keep throwing until someone reaches 5 wins — a match is capped at 9 decisive throws and 15 throws total (ties included), so an unlucky run of ties can never drag a match out forever.',
  'Play a session or a challenge: a solo session is three matches at your chosen difficulty, and a Daily or Friend Challenge is three seeded matches — Easy, Medium, then Hard — so everyone faces identical bot randomness.',
];

const description =
  'Play RPS Arena free — no download, no signup. Rock, paper, scissors against a bot that studies your habits: best of 9, first to 5 wins.';

const longDescription =
  'Play RPS Arena free, no download or signup required. Rock, paper, scissors against a bot that reads your throw history instead of guessing — Easy is pure chance, Medium plays the counter to your favourite throw, and Hard also reads what you tend to throw right after your own last move. A match is first to 5 wins, capped at 9 decisive throws and 15 throws total so tie streaks can never run away, scored out of 10 on how convincingly you took or fought back the match.';

export const metadata: Metadata = {
  title: 'RPS Arena',
  description,
  alternates: { canonical: '/games/rps-arena' },
  openGraph: {
    title: 'RPS Arena — Free Rock Paper Scissors Game',
    description,
    url: '/games/rps-arena',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'RPS Arena' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RPS Arena — Free Rock Paper Scissors Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('rps-arena')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function RpsArenaPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="rps-arena" />
        <RpsArenaGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play RPS Arena" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="rps-arena" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="rps-arena" title="RPS Arena — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
