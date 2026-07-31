import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Mini Games Hub — how we handle data, ads, and tracking.',
  alternates: { canonical: '/privacy' },
  openGraph: {
    title: 'Privacy Policy',
    description: 'Privacy Policy for Mini Games Hub — how we handle data, ads, and tracking.',
    url: '/privacy',
  },
};

export default function PrivacyPage() {
  return (
    <div className="page-container py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
        >
          ← Back to Hub
        </Link>

        <h1 className="font-display font-black text-3xl sm:text-4xl text-white mb-2">
          Privacy Policy
        </h1>
        <p className="text-white/40 text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">The short version</h2>
            <p>
              Mini Games Hub is free to play — no sign-up, no login, no personal information
              collected. We just want you to have fun.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">What we store</h2>
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
            <h2 className="font-display font-bold text-xl text-white mb-3">Ads</h2>
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
            <h2 className="font-display font-bold text-xl text-white mb-3">Kids</h2>
            <p>
              Mini Games Hub is suitable for general audiences. We don’t knowingly collect any
              information from children. If you have concerns, feel free to reach out.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Updates</h2>
            <p>
              If anything here changes, we’ll update this page. Nothing dramatic — we’ll always
              keep things simple and fair.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display font-bold text-xl text-white mb-3">Contact</h2>
            <p>
              Questions? Just email us at{' '}
              <a
                href="mailto:komalraut4762@gmail.com"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                komalraut4762@gmail.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
