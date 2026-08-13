import type { Metadata } from 'next';
import { PairChaseGame } from '@/games/pair-chase/PairChaseGame';
import { CONTENT } from '@/games/pair-chase/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty. Easy deals a 4×3 board of 6 pairs, Medium a 4×4 board of 8 pairs, and Hard a 5×4 board of 10 pairs — bigger boards also get a longer time par, so the extra memory load is matched rather than rushed.',
  'Tap a face-down card to flip it, then tap a second one — a matching pair stays revealed, while a mismatch flips both cards back face-down after a short beat.',
  "Clear the whole board to end the round. A third card can't be flipped while two are already face-up and resolving, and tapping an already-matched or already-open card does nothing.",
  "Get scored on flip efficiency and speed. Up to 8 of a round's 10 points reward using close to the minimum number of flips; the remaining 2 reward finishing before the difficulty's time par — there's no hard time limit, so the clock only ever adds to your score.",
  'Play a session or a challenge. A solo session is three timed boards at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded boards (Easy, Medium, Hard) so everyone matches identical layouts.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Pair Chase free — no download, no signup. Flip face-down emoji cards to find matching pairs against the clock, scored on flips and speed.';

const longDescription =
  'Play Pair Chase free, no download or signup required. Flip face-down emoji cards two at a time to find matching pairs — a match stays revealed, a mismatch flips back after a beat. A browser memory game that scores flip efficiency against the theoretical minimum and rewards finishing before the difficulty\'s time par, across boards from a 4×3 warm-up up to a 5×4 test of working memory.';

export const metadata: Metadata = {
  title: 'Pair Chase',
  description,
  alternates: { canonical: '/games/pair-chase' },
  openGraph: {
    title: 'Pair Chase — Free Card Matching Memory Game',
    description,
    url: '/games/pair-chase',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Pair Chase' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pair Chase — Free Card Matching Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('pair-chase')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function PairChasePage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="pair-chase" />
        <PairChaseGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Pair Chase" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="pair-chase" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="pair-chase" title="Pair Chase — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
