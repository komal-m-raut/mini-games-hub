import type { Metadata } from 'next';
import Link from 'next/link';
import { AVAILABLE_GAMES, CATEGORY_META, CATEGORY_ORDER } from '@/lib/gameRegistry';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Tiny Arcadium — a free, local-first browser mini-game hub with daily challenges, quests and guides. No downloads, no signups, no accounts.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About',
    description:
      'About Tiny Arcadium — a free, local-first browser mini-game hub with daily challenges, quests and guides. No downloads, no signups, no accounts.',
    url: '/about',
  },
};

/** "A, B, C and D" — used for the category list, so it reads as a sentence
 *  instead of a comma-spliced fragment. */
function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export default function AboutPage() {
  // Pulled from the registry rather than hand-counted, so this page can't
  // go stale the moment a staged game (REDESIGN-PLAN.md's roster of 21)
  // flips to isAvailable: true.
  const games = AVAILABLE_GAMES();
  const categories = CATEGORY_ORDER.filter((cat) => games.some((g) => g.category === cat));
  const categoryLabels = joinWithAnd(categories.map((cat) => CATEGORY_META[cat].label));

  return (
    <div className="page-container py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors mb-8"
        >
          ← Back to Hub
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl mb-2">
          About Tiny Arcadium
        </h1>
        <p className="text-ink-3 text-sm mb-10">A free, local-first browser mini-game hub</p>

        <div className="space-y-10 text-ink-2 leading-relaxed">

          <section>
            <h2 className="font-display text-xl mb-3">What this is</h2>
            <p>
              Tiny Arcadium is a small, growing arcade of free browser games. Everything runs
              instantly in your browser tab — no download, no signup, no account. Just open a
              game and play.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">The games</h2>
            <p className="mb-3">
              Right now the hub has {games.length} {games.length === 1 ? 'game' : 'games'}, spanning{' '}
              {categoryLabels}. Each one tests a different skill:
            </p>
            <ul className="space-y-2 list-none">
              {games.map((game) => (
                <li key={game.id}>
                  <span className="mr-1.5">{game.emoji}</span>
                  <span className="text-white font-semibold">{game.title}</span> — {game.description}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">How it works</h2>
            <p>
              Every game supports a few ways to play: <span className="text-white">Solo</span>{' '}
              mode, where you pick a difficulty and play freely; a{' '}
              <span className="text-white">Daily Challenge</span>, where everyone gets the same
              seeded rounds each day, so scores are directly comparable; and{' '}
              <span className="text-white">Challenge a Friend</span>, which generates a
              shareable link with its own leaderboard so you and your friends can compete on the
              exact same rounds.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Quests &amp; streaks</h2>
            <p>
              Playing regularly builds a simple daily rhythm on top of the games themselves: a
              short set of daily quests, a streak that tracks how many days running you&rsquo;ve
              shown up, and levels that climb as you play. All of it lives on your device —
              there&rsquo;s no account behind any of it, just a reason to come back tomorrow.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Guides</h2>
            <p>
              Curious what a game is actually testing? The{' '}
              <Link
                href="/guides"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Guides
              </Link>{' '}
              section has short, plain-English explainers on the ideas behind the games — reaction
              time, working memory, colour perception and more — with links to the games that let
              you test each one yourself.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Local-first, by design</h2>
            <p>
              There&rsquo;s no account to create and nothing to sign in to. Your progress, best scores
              and preferences are saved on your own device; the only thing that ever reaches our
              servers is a leaderboard entry you choose to submit, under a nickname you pick
              yourself. See our{' '}
              <Link
                href="/privacy"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>{' '}
              for the details.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Free, supported by ads</h2>
            <p>
              Tiny Arcadium is free to play. We keep it that way by showing ads around the games
              — never during active play.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display text-xl mb-3">Contact</h2>
            <p>
              Questions or feedback? Email us at{' '}
              <a
                href="mailto:hello@tinyarcadium.com"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                hello@tinyarcadium.com
              </a>
              , or see the{' '}
              <Link
                href="/contact"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Contact
              </Link>{' '}
              page for what to include and how quickly we reply.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
