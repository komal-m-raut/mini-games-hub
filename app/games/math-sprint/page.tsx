import type { Metadata } from 'next';
import { MathSprintGame } from '@/games/math-sprint/MathSprintGame';
import { CONTENT } from '@/games/math-sprint/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty. Easy is addition and subtraction with small numbers; Medium adds times tables and larger operands; Hard mixes in exact division alongside bigger sums and products.',
  'Watch the 3-2-1 countdown, then a question fills the screen and a 30-second timer starts ticking down.',
  "Type your answer on the on-screen number pad — or your keyboard's digits, Backspace and Enter — then submit; a wrong answer shakes and flashes red and the same question stays until you fix it or tap Skip.",
  'Answer as many questions as you can before the timer runs out; your round score comes from your net correct answers (correct minus half a point per wrong or skipped answer) measured against a par for the difficulty.',
  'Play a session or a challenge. A solo session is three 30-second rounds at your chosen difficulty; a Daily or Friend Challenge is three fixed rounds — Easy, Medium, Hard — so everyone solves the same seeded questions.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Math Sprint free — no download, no signup. Solve as many quick sums as you can in 30 seconds across addition, subtraction and times tables.';

const longDescription =
  'Play Math Sprint free, no download or signup required. A question fills the screen and you answer it on an on-screen number pad or your keyboard, racing to solve as many sums as you can in 30 seconds. A fast browser mental-math game with a difficulty ladder from simple addition through times tables to mixed arithmetic with exact division, scored on net correct answers against a per-difficulty par.';

export const metadata: Metadata = {
  title: 'Math Sprint',
  description,
  alternates: { canonical: '/games/math-sprint' },
  openGraph: {
    title: 'Math Sprint — Free Mental Math Game',
    description,
    url: '/games/math-sprint',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Math Sprint' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Math Sprint — Free Mental Math Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('math-sprint')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function MathSprintPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="math-sprint" />
        <MathSprintGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Math Sprint" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="math-sprint" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="math-sprint" title="Math Sprint — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
