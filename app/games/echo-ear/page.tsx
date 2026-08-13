import type { Metadata } from 'next';
import { EchoEarGame } from '@/games/echo-ear/EchoEarGame';
import { CONTENT } from '@/games/echo-ear/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty. Easy gives you three extra replays of the target tone and a forgiving scoring window; Medium gives you one replay and tightens the window; Hard gives you a single listen and the least forgiving scoring of the three.",
  "Tap Play to hear the target pitch for just over a second — a tone somewhere between 220 Hz and 880 Hz — then use any replays your difficulty allows before moving on.",
  "Once you've heard enough, move to the vertical slider: dragging it (or using the up/down and Page Up/Down keys) plays back its current pitch live, so you can compare what you hear against what you remember.",
  "Confirm your match when you're happy with it. Your guess is scored on the cents distance to the target — the standard musical unit for pitch — converting to an accuracy percentage and a score out of 10.",
  "See both pitches side by side on the result screen, with the exact cents error and whether you landed sharp (too high) or flat (too low), and replay either tone to hear the difference for yourself.",
  "Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone matches identical pitches.",
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Echo Ear free — no download, no signup. Hear a tone, then recreate its pitch from memory on a vertical slider. A test of relative pitch and musical memory.';

const longDescription =
  'Play Echo Ear free, no download or signup required. Listen to a tone somewhere between 220 Hz and 880 Hz, then recreate it from memory on a large vertical slider that plays back its pitch as you drag. Scored on the cents distance to the target — the same unit musicians use for pitch — with a difficulty ladder that trims your replays and tightens the scoring window from Easy through Hard.';

export const metadata: Metadata = {
  title: 'Echo Ear',
  description,
  alternates: { canonical: '/games/echo-ear' },
  openGraph: {
    title: 'Echo Ear — Free Pitch Memory Game',
    description,
    url: '/games/echo-ear',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Echo Ear' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Echo Ear — Free Pitch Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('echo-ear')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function EchoEarPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="echo-ear" />
        <EchoEarGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Echo Ear" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="echo-ear" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="echo-ear" title="Echo Ear — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
