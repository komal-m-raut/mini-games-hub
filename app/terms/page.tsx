import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Tiny Arcadium — the plain-English rules for using the site.',
  alternates: { canonical: '/terms' },
  openGraph: {
    title: 'Terms of Service',
    description: 'Terms of Service for Tiny Arcadium — the plain-English rules for using the site.',
    url: '/terms',
  },
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-white/55 text-sm mb-10">Last updated: July 2026</p>

        <div className="space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">The short version</h2>
            <p>
              By using Tiny Arcadium, you agree to these terms. They’re short and written in
              plain English on purpose — play fair, don’t abuse the site, and have fun.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">The service</h2>
            <p>
              Tiny Arcadium is provided free of charge, “as is,” with no guarantees. We do our
              best to keep it fast and available, but we can’t promise it will always be online,
              bug-free, or work perfectly on every device.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Acceptable use</h2>
            <p className="mb-3">To keep the leaderboards fair and fun for everyone, please don’t:</p>
            <ul className="list-disc list-inside space-y-1.5 marker:text-white/30">
              <li>Cheat, automate, or script your way to a leaderboard score</li>
              <li>Attempt to disrupt, overload, or interfere with the site or its infrastructure</li>
              <li>Use an offensive, abusive, or otherwise inappropriate nickname</li>
            </ul>
            <p className="mt-3">
              Nicknames are filtered automatically to block a short list of unambiguous
              profanity and slurs, along with hidden characters used to spoof or corrupt the
              leaderboard display. A nickname that trips the filter is rejected before it’s
              submitted.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Leaderboard entries</h2>
            <p>
              Leaderboard entries are public. We may remove any entry — including a nickname or
              score — at our discretion, for example if it violates these terms or looks like
              cheating.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Ads</h2>
            <p>
              We show ads to keep the site free to play. See our{' '}
              <Link
                href="/privacy"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>{' '}
              for how ads work.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Changes to these terms</h2>
            <p>
              We may update these terms from time to time. If we do, we’ll update this page.
              Continuing to use Tiny Arcadium after a change means you accept the new terms.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display font-bold text-xl text-white mb-3">Contact</h2>
            <p>
              Questions about these terms? Email us at{' '}
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
