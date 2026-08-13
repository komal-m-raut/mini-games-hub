import type { Metadata } from 'next';
import { TypeStormGame } from '@/games/type-storm/TypeStormGame';
import { CONTENT } from '@/games/type-storm/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty. Easy streams words 3–5 letters long, Medium 4–7, and Hard 5–9 — the words stay ordinary vocabulary at every level, only the letter count climbs.",
  'Type the large word in the middle using your keyboard, reading the next two dimmed words in the queue below so you never have to type blind.',
  'Press Space or Enter to submit. Get it exactly right and it banks, the field clears, and the next word slides in; get it wrong and the field shakes, clears, and hands you the very same word again.',
  'Press Escape or tap Skip to give up on a word and move on — it counts as a miss, just like a wrong submission, so only skip when you are truly stuck.',
  'Play a session or a challenge. A solo session is three 30-second sprints at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone types identical words.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Type Storm free — no download, no signup. A 30-second typing sprint: race the words streaming across the screen, where accuracy multiplies straight into your score.';

const longDescription =
  'Play Type Storm free, no download or signup required. A 30-second typing sprint: type the large word in the middle, read the next two queued below, and press Space or Enter to submit — a wrong submission just hands you the same word again. Words per minute and accuracy both feed the score, so a fast run full of mistakes scores worse than a measured, accurate one, with a difficulty ladder that stretches word length from 3–5 letters up to 5–9.';

export const metadata: Metadata = {
  title: 'Type Storm',
  description,
  alternates: { canonical: '/games/type-storm' },
  openGraph: {
    title: 'Type Storm — Free Typing Speed Test',
    description,
    url: '/games/type-storm',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Type Storm' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Type Storm — Free Typing Speed Test',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('type-storm')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function TypeStormPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="type-storm" />
        <TypeStormGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Type Storm" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="type-storm" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="type-storm" title="Type Storm — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
