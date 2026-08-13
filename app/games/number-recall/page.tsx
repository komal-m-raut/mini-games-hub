import type { Metadata } from 'next';
import { NumberRecallGame } from '@/games/number-recall/NumberRecallGame';
import { CONTENT } from '@/games/number-recall/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty: Easy starts the ladder at 3 digits, Medium at 4, and Hard at 5 with a shorter look at each number.',
  'A number flashes large on screen for under two seconds, then disappears completely — there is no second look, so give it your full attention while it lasts.',
  'Type it back on the on-screen number pad, or with your keyboard — every digit you enter stays fully visible, so you can backspace and fix a typo before submitting.',
  'Get it exactly right and the ladder climbs one digit longer for the next number; get it wrong and the round ends there, with your score built from how many digits you reached.',
  'Play a session or a challenge: a solo session is three rounds at your chosen difficulty, while a Daily or Friend Challenge is a fixed set of three seeded ladders — Easy, Medium, Hard — so everyone climbs identical numbers.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Number Recall free — no download, no signup. A number flashes, then disappears. Type it back from memory as the digits grow longer each level.';

const longDescription =
  'Play Number Recall free, no download or signup required. A number flashes large on screen, then vanishes completely — type it back from memory on an on-screen number pad or your keyboard. Get it right and the digit-span ladder climbs one digit longer; get it wrong and the round ends there. A working-memory game with a difficulty ladder that changes both the starting length and how long each number stays on screen.';

export const metadata: Metadata = {
  title: 'Number Recall',
  description,
  alternates: { canonical: '/games/number-recall' },
  openGraph: {
    title: 'Number Recall — Free Digit Span Memory Game',
    description,
    url: '/games/number-recall',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Number Recall' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Number Recall — Free Digit Span Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('number-recall')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function NumberRecallPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="number-recall" />
        <NumberRecallGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Number Recall" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="number-recall" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="number-recall" title="Number Recall — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
