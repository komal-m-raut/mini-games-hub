import type { Metadata } from 'next';
import { TimeSenseGame } from '@/games/time-sense/TimeSenseGame';
import { CONTENT } from '@/games/time-sense/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Choose a difficulty. Easy draws a short 1.50–3.00 second target and gives you a glow while you hold; Medium widens the range to 1.00–4.50 seconds and removes all feedback; Hard widens it further to 2.00–6.00 seconds and adds a background pulse designed to throw off your internal count.',
  'Watch the SHOW phase: a bar fills from empty to full over the exact target duration, with the running time shown in seconds alongside it, marked by a soft tone at the start and a firmer one the instant it completes.',
  'When the bar resets, press and hold the button — with a pointer, a touch, or Space/Enter — and try to release at the moment you believe matches the duration you just watched.',
  'Check your result: both the target and held durations, your signed error in seconds (over or under), your accuracy, and a rating from Perfect down to Try Again.',
  'Play a session or a challenge. A solo session is five rounds at your chosen difficulty; a Daily or Friend Challenge is a fixed set of three seeded rounds (Easy, Medium, Hard) so everyone recreates identical durations.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Time Sense free — no download, no signup. Watch a duration fill a bar, then hold a button to recreate it purely from feel.';

const longDescription =
  "Play Time Sense free, no download or signup required. A bar fills over an exact duration while the seconds tick up beside it — then it resets, and you press and hold to recreate that same length of time from feel alone. A calm test of your internal clock with a difficulty ladder that widens the target range, strips away feedback while you hold, and — on Hard — adds a background pulse at a deliberately wrong tempo to fight your count.";

export const metadata: Metadata = {
  title: 'Time Sense',
  description,
  alternates: { canonical: '/games/time-sense' },
  openGraph: {
    title: 'Time Sense — Free Internal Clock Game',
    description,
    url: '/games/time-sense',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Time Sense' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Time Sense — Free Internal Clock Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('time-sense')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function TimeSensePage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="time-sense" />
        <TimeSenseGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Time Sense" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="time-sense" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="time-sense" title="Time Sense — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
