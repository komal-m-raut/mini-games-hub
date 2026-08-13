import type { Metadata } from 'next';
import { HandCricketGame } from '@/games/hand-cricket/HandCricketGame';
import { CONTENT } from '@/games/hand-cricket/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  "Choose a difficulty, then play three matches. Easy bowls and bats completely at random; Medium never repeats its own last throw; Hard studies your habits — it bowls what you bat most and avoids the bowls you throw most, both with a little randomness mixed in.",
  "You bat first. Each ball, pick a number from 1 to 6 — the bot bowls the same instant. Match its number and you're out for the innings; anything else adds that number to your total.",
  "Once you're out, you switch to bowling: the bot now has to chase your total plus one. Pick a number each ball hoping to match the bot's simultaneous shot and take the wicket before it reaches the target.",
  "The bot never sees your throw before committing to its own — both hands are decided at the same instant and revealed together after a short suspense beat, exactly like the real playground game.",
  'Bowling the bot out wins the match, level scores are a tie, and the bot reaching the target is a loss — your match score out of 10 rewards how comfortably you won, not just that you did.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Hand Cricket free — no download, no signup. The classic schoolyard duel: throw 1–6 each ball, match the bot and you are out. One wicket, two innings.';

const longDescription =
  "Play Hand Cricket free, no download or signup required. The classic schoolyard hand game: throw a number from 1 to 6 each ball while the bot bowls the exact same instant — match its number and you're out, anything else adds to your total. Bat first, then bowl to defend your score across one wicket and two innings, against a bot whose bowling and batting brains get sharper — from pure randomness to reading your own habits — as the difficulty climbs.";

export const metadata: Metadata = {
  title: 'Hand Cricket',
  description,
  alternates: { canonical: '/games/hand-cricket' },
  openGraph: {
    title: 'Hand Cricket — Free Schoolyard Duel Game',
    description,
    url: '/games/hand-cricket',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Hand Cricket' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hand Cricket — Free Schoolyard Duel Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('hand-cricket')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function HandCricketPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="hand-cricket" />
        <HandCricketGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Hand Cricket" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="hand-cricket" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="hand-cricket" title="Hand Cricket — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
