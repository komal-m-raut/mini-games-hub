import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Tiny Arcadium — how we handle data, ads, and tracking.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy',
    description: 'Privacy Policy for Tiny Arcadium — how we handle data, ads, and tracking.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-ink-3 text-sm mb-10">Last updated: August 2026</p>

        <div className="space-y-10 text-ink-2 leading-relaxed">

          <section>
            <h2 className="font-display text-xl mb-3">The short version</h2>
            <p>
              Tiny Arcadium is free to play — no sign-up, no login, no personal information
              collected. We just want you to have fun.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">What we store</h2>
            <p className="mb-3">
              When you submit a score to the leaderboard, we save your chosen name and score.
              That’s it. No email, no password, nothing personal.
            </p>
            <p>
              To keep your scores linked across visits without a login, we save a random ID in
              your browser. It’s just a number — it doesn’t identify you as a person.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Cookies &amp; local storage</h2>
            <p className="mb-3">
              Tiny Arcadium itself doesn’t set any cookies. Instead we use your browser’s local
              storage — data that stays on your device — for a few small things: a random ID so
              we can recognize you across visits without a login, the nickname you choose for the
              leaderboard, and your sound on/off preference. If you’ve set a local high score in a
              game, that’s stored the same way. None of it identifies you personally.
            </p>
            <p className="mb-3">
              When you submit a score, your nickname, score and that random ID are sent to us —
              the ID is how we keep an entry yours across visits and stop one player filling the
              board. Your sound preference and local high scores never leave your browser.
            </p>
            <p>
              Google, which serves our ads, sets its own cookies in your browser to show and
              measure ads — those are Google’s, not ours, and Google’s policies govern them. See
              the Ads section below for how to adjust that.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Data retention</h2>
            <p className="mb-3">
              Leaderboard scores are kept indefinitely so the boards stay meaningful over time —
              we don’t automatically delete or expire entries. If you’d like a score removed,
              email us and we’ll take care of it.
            </p>
            <p>
              Anything stored in your browser — your player ID, nickname, sound preference and
              local high scores — stays there until you clear your browser’s site data. Your
              sound preference and local high scores stay on your device entirely; the player ID
              and nickname are only copied to us as part of a leaderboard entry you chose to
              submit.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Ads</h2>
            <p className="mb-3">
              We show ads to keep the site free. Ads are served by Google and may be personalized
              based on your general browsing habits — that’s standard for most free websites you
              visit.
            </p>
            <p className="mb-3">
              We place ads only around the games, never during active play, so they don’t get in
              your way.
            </p>
            <p>
              If you’d prefer non-personalized ads, you can adjust that in{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Google Ads Settings
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Kids</h2>
            <p>
              Tiny Arcadium is suitable for general audiences. We don’t knowingly collect any
              information from children. If you have concerns, feel free to reach out.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Updates</h2>
            <p>
              If anything here changes, we’ll update this page. Nothing dramatic — we’ll always
              keep things simple and fair.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display text-xl mb-3">Contact</h2>
            <p>
              Questions? Just email us at{' '}
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
