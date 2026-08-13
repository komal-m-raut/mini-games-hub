import type { Metadata } from 'next';
import { StroopSnapGame } from '@/games/stroop-snap/StroopSnapGame';
import { CONTENT } from '@/games/stroop-snap/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty, then watch the 3-2-1 countdown before your 30-second round begins — Easy uses 3 colours with more matching trials, Medium adds a 4th colour, and Hard adds two more for a 6-colour pool with far fewer easy trials.',
  "Each trial shows a colour word printed in an ink colour, and your job is to tap the ink — never the word — on the fixed grid of colour buttons below it, using the mouse, touch, or the 1–6 number keys.",
  'A correct tap scores +1 and a wrong tap scores −1, and the next word appears instantly either way, so the round is really about how many trials you can get through while staying accurate.',
  "Your round score comes from net correct answers (correct minus wrong, never below zero) measured against that difficulty's par — 18 on Easy, 16 on Medium, 14 on Hard — scaled to a score out of 10.",
  'Play a solo session of three rounds at your chosen difficulty, or take on a Daily or Friend Challenge: three seeded rounds at Easy, Medium and Hard so everyone faces the identical word/ink sequence.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Stroop Snap free — no download, no signup. Tap the ink colour, not the word, in this 30-second Stroop effect speed test with three difficulties.';

const longDescription =
  "Play Stroop Snap free, no download or signup required. A colour word appears printed in a conflicting ink colour, and you tap the ink — never the word — as fast as you can for 30 seconds. Correct taps score, wrong taps cost you, and the difficulty ladder adds more colours to the pool while cutting the share of easy, no-conflict trials, so the classic Stroop effect gets harder to outrun the further you climb.";

export const metadata: Metadata = {
  title: 'Stroop Snap',
  description,
  alternates: { canonical: '/games/stroop-snap' },
  openGraph: {
    title: 'Stroop Snap — Free Stroop Effect Speed Game',
    description,
    url: '/games/stroop-snap',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Stroop Snap' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Stroop Snap — Free Stroop Effect Speed Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('stroop-snap')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function StroopSnapPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="stroop-snap" />
        <StroopSnapGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Stroop Snap" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="stroop-snap" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="stroop-snap" title="Stroop Snap — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
