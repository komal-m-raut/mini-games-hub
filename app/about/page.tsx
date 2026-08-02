import type { Metadata } from 'next';
import Link from 'next/link';
import { GAME_REGISTRY } from '@/lib/gameRegistry';

export const metadata: Metadata = {
  title: 'About',
  description:
    'About Tiny Arcadium — a free browser-based mini-game hub with no downloads, no signups, and no accounts.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About',
    description:
      'About Tiny Arcadium — a free browser-based mini-game hub with no downloads, no signups, and no accounts.',
    url: '/about',
  },
};

export default function AboutPage() {
  return (
    <div className="page-container py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white/80 transition-colors mb-8"
        >
          ← Back to Hub
        </Link>

        <h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">
          About Tiny Arcadium
        </h1>
        <p className="text-white/55 text-sm mb-10">A free browser-based mini-game hub</p>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">What this is</h2>
            <p>
              Tiny Arcadium is a small collection of free browser games. Everything runs
              instantly in your browser tab — no download, no signup, no account. Just open a
              game and play.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">The games</h2>
            <p className="mb-3">Right now the hub has three games, each testing a different skill:</p>
            <ul className="space-y-2 list-none">
              {GAME_REGISTRY.map((game) => (
                <li key={game.id}>
                  <span className="mr-1.5">{game.emoji}</span>
                  <span className="text-white font-semibold">{game.title}</span> — {game.description}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">How it works</h2>
            <p>
              Every game supports a few ways to play: <span className="text-white">Solo</span>{' '}
              mode, where you pick a difficulty and play freely; a{' '}
              <span className="text-white">Daily Challenge</span>, where everyone gets the same
              seeded puzzle each day, so scores are directly comparable; and{' '}
              <span className="text-white">Challenge a Friend</span>, which generates a
              shareable link with its own leaderboard so you and your friends can compete on the
              exact same round.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Leaderboards</h2>
            <p>
              Scores are kept on leaderboards under a nickname you choose. We don’t collect any
              personal information — see our{' '}
              <Link
                href="/privacy"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>{' '}
              for details.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Free, supported by ads</h2>
            <p>
              Tiny Arcadium is free to play. We keep it that way by showing ads around the games
              — never during active play.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display font-bold text-xl text-white mb-3">Contact</h2>
            <p>
              Questions or feedback? Email us at{' '}
              <a
                href="mailto:hello@tinyarcadium.com"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                hello@tinyarcadium.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
