import type { Metadata } from 'next';
import { WordQuestGame } from '@/games/word-quest/WordQuestGame';
import { CONTENT } from '@/games/word-quest/content';
import { AdBanner } from '@/components/ads/AdBanner';
import { GameHeader } from '@/components/game/GameHeader';
import { HowToPlay } from '@/components/game/HowToPlay';
import { Leaderboard } from '@/components/leaderboard/Leaderboard';
import { GameArticle } from '@/components/seo/GameArticle';
import { getGameMeta } from '@/lib/gameRegistry';
import { buildGameJsonLd, jsonLdScriptProps } from '@/lib/seo';

const HOW_TO_PLAY_STEPS = [
  'Guess a hidden five-letter word in six tries, typing on the on-screen keyboard or your own — each guess must be a real five-letter word or it gets rejected with a shake and a "Not in word list" toast.',
  'After each guess, every tile turns green if that letter is in the right spot, yellow if the letter is in the word but the wrong spot, or dark if the letter isn\'t in the word at all — or has no copies left unaccounted for.',
  'Use those colours to narrow down the word: a green tile locks that position for good, a yellow tells you to try that letter somewhere else, and a dark tile rules a letter out (mostly — watch for words with a repeated letter).',
  "Solve it and the row bounces in celebration; run out of all six guesses and the answer is revealed. Solving earlier scores more — 10 points for guess one, down to 3 for guess six — with partial credit for a strong final guess even in defeat.",
  'Play a single word solo at your own pace, or take on the Daily or Friend Challenge — three seeded words, identical for every player on that code, for a score out of 30.',
];

// Kept under ~160 chars so search results show it without truncation; the
// fuller copy below feeds structured data, where length isn't penalised.
const description =
  'Play Word Quest free — a daily word game. Guess the hidden five-letter word in six tries with colour clues, solo or against a friend.';

const longDescription =
  "Play Word Quest free, no download or signup required. A daily word game with classic Wordle-style mechanics: guess a hidden five-letter word in six tries, with green, yellow and dark tiles narrowing the answer after every guess. Play a single word solo, or take on the Daily Challenge — the same three seeded words for every player — or send a Friend Challenge link and compare scores.";

export const metadata: Metadata = {
  title: 'Word Quest',
  description,
  alternates: { canonical: '/games/word-quest' },
  openGraph: {
    title: 'Word Quest — Free Daily Word Game',
    description,
    url: '/games/word-quest',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Word Quest' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word Quest — Free Daily Word Game',
    description,
    images: ['/og.png'],
  },
};

const meta = getGameMeta('word-quest')!;
const jsonLd = buildGameJsonLd({ meta, content: CONTENT, longDescription });

export default function WordQuestPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      {/* Per-game structured data so search engines can surface this as a playable game. */}
      <script {...jsonLdScriptProps(jsonLd)} />

      <div>
        <GameHeader gameId="word-quest" />
        <WordQuestGame />
      </div>

      {/* How to Play */}
      <HowToPlay title="How to Play Word Quest" steps={HOW_TO_PLAY_STEPS} />

      {/* SEO/content article: about, tips, FAQ, related games */}
      <GameArticle gameId="word-quest" content={CONTENT} />

      {/* Leaderboard */}
      <section>
        <Leaderboard gameId="word-quest" title="Word Quest — Leaderboard" />
      </section>

      {/* Ad: below leaderboard, well clear of gameplay and the primary action button */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
