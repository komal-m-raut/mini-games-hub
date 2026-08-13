import type { Metadata } from 'next';
import { EchoStepsGame } from '@/games/echo-steps/EchoStepsGame';
import { CONTENT } from '@/games/echo-steps/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty. Easy starts at a 2-note sequence played at a relaxed pace; Medium starts at 3 notes at the same pace; Hard also starts at 3 notes but plays each step faster, so there is less time to catch every flash.',
  'Watch and listen as the four pads light up in sequence, each with its own colour and its own musical tone — the whole sequence plays from the start every single time, never just the newest note.',
  'When the pads go still, tap them back in exactly the same order — click, tap, or press 1, 2, 3, 4 on your keyboard for green, red, yellow and blue.',
  'Get the whole sequence right and it replays from the top with one more note added; get a single pad wrong and the round ends immediately, with the correct pad flashing to show what you missed.',
  'Play a session or a challenge. A solo session is three rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone hears identical sequences.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Echo Steps free — no download, no signup. Four pads light up and chime in a growing sequence: watch, listen, and repeat it back perfectly.';

const longDescription =
  'Play Echo Steps free, no download or signup required. A Simon-style sequence memory game: four coloured pads light up and chime in a growing sequence — watch and listen, then tap them back in the exact same order. One wrong tap ends the round, and a full correct repeat plays the whole sequence again with one more note added. A difficulty ladder from a relaxed 2-note start up to fast, 12-note Hard rounds tests both visual and auditory working memory.';

export const metadata: Metadata = {
  title: 'Echo Steps',
  description,
  alternates: { canonical: '/games/echo-steps' },
  openGraph: {
    title: 'Echo Steps — Free Sequence Memory Game',
    description,
    url: '/games/echo-steps',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Echo Steps' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Echo Steps — Free Sequence Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('echo-steps')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function EchoStepsPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="echo-steps" />
        <EchoStepsGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Echo Steps" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="echo-steps" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="echo-steps" title="Echo Steps — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
