import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Mettle — bug reports, feedback, and business enquiries. One email address, a real person reads it.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact',
    description:
      'Contact Mettle — bug reports, feedback, and business enquiries. One email address, a real person reads it.',
    url: '/contact',
  },
};

const LINK_CLASS =
  'text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors';

export default function ContactPage() {
  return (
    <div className="page-container py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors mb-8"
        >
          ← Back to Hub
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl mb-2">Contact</h1>
        <p className="text-ink-3 text-sm mb-10">
          One email address. A real person reads every message.
        </p>

        <div className="space-y-10 text-ink-2 leading-relaxed">
          <section>
            <h2 className="font-display text-xl mb-3">Email us</h2>
            <p>
              For anything at all, write to{' '}
              <a href="mailto:hello@tinyarcadium.com" className={LINK_CLASS}>
                hello@tinyarcadium.com
              </a>
              . There&rsquo;s no ticketing system and no bot in between — messages go straight to
              the person who builds the site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">What to write in about</h2>
            <ul className="space-y-2 list-disc list-inside marker:text-ink-4">
              <li>
                <span className="text-white font-semibold">Bug reports</span>{' '}
                — what you were doing, what you expected, and what happened instead. Your browser
                and device help too, if you know them.
              </li>
              <li>
                <span className="text-white font-semibold">Feedback</span>{' '}
                — a game idea, a difficulty that feels off, a leaderboard entry that
                shouldn&rsquo;t be there, or anything else on your mind.
              </li>
              <li>
                <span className="text-white font-semibold">Business enquiries</span>{' '}
                — partnerships, press, or anything else that isn&rsquo;t a bug or a game
                suggestion.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Response time</h2>
            <p>
              Mettle is a small, independently-run site, so replies aren&rsquo;t instant —
              expect a few days, longer around a busy release. Every message does get read.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl mb-3">Looking for something else?</h2>
            <p>
              Read more{' '}
              <Link href="/about" className={LINK_CLASS}>
                about the site
              </Link>
              , or check the{' '}
              <Link href="/privacy" className={LINK_CLASS}>
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className={LINK_CLASS}>
                Terms of Service
              </Link>{' '}
              for how data, ads, and leaderboards work.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
