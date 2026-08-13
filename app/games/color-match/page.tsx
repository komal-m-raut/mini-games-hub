import type { Metadata } from 'next';
import { ColorMatchGame } from '@/games/color-match/ColorMatchGame';
import { CONTENT } from '@/games/color-match/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'One colour, on the clock. Each round shows a single flat colour panel for a few seconds while a timer counts down. Actually look at it — it disappears completely, and your memory is worse than you think.',
  'Pick how hard to make this on yourself. Easy is bold, nameable colours with five seconds to stare. Medium is subtler shades. Hard gives you two seconds and forgives almost nothing.',
  'Mix it back from memory. Three sliders — red, green and blue — start at neutral grey. Each track runs from dark to its own pure channel, so you can steer by eye instead of guessing numbers.',
  'Find out how far off you were. Your mix is scored against the original for how different the two colours actually look, not just how far apart the numbers are — an honest score out of 10, from Try Again up to Amazing and Perfect.',
  'Solo or a level playing field. Solo lets you choose 1, 3 or 5 rounds at your difficulty. Daily and Friend challenges are a fixed set of three seeded colours everyone gets exactly the same, so nobody can claim they had it easier.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Color Match free — no download, no signup. Memorise a colour, then recreate it on RGB sliders. How accurate is your eye for colour?';

const longDescription =
  'Play Color Match free, no download or signup required. A colour appears for a few seconds, then vanishes — recreate it from memory on red, green and blue sliders and see how close your eye really is. A quick, beautiful browser game that tests visual memory and colour perception.';

export const metadata: Metadata = {
  title: 'Color Match',
  description,
  alternates: { canonical: '/games/color-match' },
  openGraph: {
    title: 'Color Match — Free Colour Memory Game',
    description,
    url: '/games/color-match',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Color Match' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Color Match — Free Colour Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('color-match')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function ColorMatchPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="color-match" />
        <ColorMatchGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Color Match" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="color-match" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="color-match" title="Color Match — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
