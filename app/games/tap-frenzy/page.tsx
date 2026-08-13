import type { Metadata } from 'next';
import { TapFrenzyGame } from '@/games/tap-frenzy/TapFrenzyGame';
import { CONTENT } from '@/games/tap-frenzy/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty, then watch the 3-2-1 countdown before your 30-second round begins. Easy spawns big targets that shrink slowly; Medium is smaller and faster; Hard shrinks the target and its clock down further still, so there's less room and less time to react.",
  'One glowing target appears at a random spot in the arena at a time — tap it the instant you see it, before it shrinks away to nothing.',
  'A hit spawns the next target immediately, so keep your eyes moving and your taps coming; a target you let expire counts as a miss and the next one spawns after a short beat.',
  "Tapping empty space breaks your combo but is never scored as a miss, so it pays to wait the extra instant for a real target rather than tapping blind — every hit within 700ms of a target's appearance keeps that combo climbing.",
  'Play a session or a challenge. A solo session is three 30-second rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone faces identical target sequences.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Tap Frenzy free — no download, no signup. Targets pop up around the arena: tap each one the instant it appears and chain combos for a top score.';

const longDescription =
  'Play Tap Frenzy free, no download or signup required. Targets appear one at a time in a bounded arena and shrink against the clock — tap each one the instant it appears before it runs out, and keep the taps coming as the next target spawns immediately on every hit. A fast browser reaction-speed game with a difficulty ladder that shrinks the target and its time budget together, and a combo streak that rewards clean, decisive taps over frantic ones.';

export const metadata: Metadata = {
  title: 'Tap Frenzy',
  description,
  alternates: { canonical: '/games/tap-frenzy' },
  openGraph: {
    title: 'Tap Frenzy — Free Reaction Speed Game',
    description,
    url: '/games/tap-frenzy',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Tap Frenzy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tap Frenzy — Free Reaction Speed Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('tap-frenzy')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function TapFrenzyPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="tap-frenzy" />
        <TapFrenzyGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Tap Frenzy" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="tap-frenzy" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="tap-frenzy" title="Tap Frenzy — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
