import type { Metadata } from 'next';
import { ShapeEchoGame } from '@/games/shape-echo/ShapeEchoGame';
import { CONTENT } from '@/games/shape-echo/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty. Easy flashes rectangles only, always upright; Medium adds ellipses and rotation; Hard adds equilateral triangles and shortens the flash to 1.5 seconds.",
  'A shape flashes on the stage for a couple of seconds with a draining ring around it, then disappears completely.',
  "Rebuild it from memory: drag anywhere on the stage to move your shape — you don't need to grab it exactly — or nudge it with the arrow keys, then use the Size and Rotation sliders below to match what you remember.",
  'Confirm your answer to lock it in and see a side-by-side comparison against the real target, with separate accuracy bars for position, size and rotation.',
  'Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone recreates identical shapes.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Shape Echo free — no download, no signup. A shape flashes with a size, spot and tilt, then vanishes. Rebuild it from memory and see how close you get.';

const longDescription =
  "Play Shape Echo free, no download or signup required. A shape flashes on a square stage — a rectangle, ellipse or triangle, at some position, size and rotation — then vanishes completely. Drag anywhere on the stage to rebuild it from memory, use the Size and Rotation sliders to fine-tune it, and confirm to see how close you got, with separate accuracy bars for position, size and rotation. A spatial memory game with a difficulty ladder that adds shape types and rotation while cutting the time you get to look.";

export const metadata: Metadata = {
  title: 'Shape Echo',
  description,
  alternates: { canonical: '/games/shape-echo' },
  openGraph: {
    title: 'Shape Echo — Free Spatial Memory Game',
    description,
    url: '/games/shape-echo',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Shape Echo' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shape Echo — Free Spatial Memory Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('shape-echo')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function ShapeEchoPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="shape-echo" />
        <ShapeEchoGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Shape Echo" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="shape-echo" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="shape-echo" title="Shape Echo — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
