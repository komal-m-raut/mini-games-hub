import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Mini Games Hub — how we handle data, ads, and tracking.',
  alternates: { canonical: '/privacy' },
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

        <div className="prose-custom space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">About Mini Games Hub</h2>
            <p>
              Mini Games Hub is a free, browser-based collection of casual mini-games. No account or
              login is required to play. We are committed to keeping things simple, honest, and
              respectful of your privacy.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Information We Collect</h2>
            <p className="mb-3">
              We do not collect any personally identifiable information. The only data stored locally
              on your device is an anonymous player ID (a random UUID), which is used solely to
              attribute your scores to the leaderboard without requiring a login. This ID is stored in
              your browser's <code className="text-brand-violet">localStorage</code> and is never
              transmitted to any third party.
            </p>
            <p>
              Game scores you submit to the leaderboard are stored on our servers along with your
              chosen display name and the anonymous player ID. No email address, password, or
              identifying information is collected.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Advertising</h2>
            <p className="mb-3">
              Mini Games Hub displays advertisements served by{' '}
              <strong className="text-white">Google AdSense</strong>. Google uses cookies and similar
              technologies to serve ads based on your prior visits to this site and other sites on the
              internet. Google's use of advertising cookies enables it and its partners to serve ads
              to you based on your visit to our site and/or other sites on the Internet.
            </p>
            <p className="mb-3">
              You may opt out of personalised advertising by visiting{' '}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                Google Ads Settings
              </a>
              . Alternatively, you can opt out of a third-party vendor's use of cookies for
              personalised advertising by visiting{' '}
              <a
                href="https://www.aboutads.info/choices/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors"
              >
                www.aboutads.info/choices
              </a>
              .
            </p>
            <p>
              Ads are placed outside of active gameplay so they never interrupt your experience.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Cookies</h2>
            <p>
              We do not set any first-party cookies ourselves. Google AdSense may set its own cookies
              to serve and measure advertisements. You can control cookie settings through your
              browser's privacy settings.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Third-Party Services</h2>
            <p>
              We use the following third-party services that may collect usage data as part of their
              normal operation:
            </p>
            <ul className="mt-3 space-y-1.5 list-disc list-inside text-white/60">
              <li>
                <strong className="text-white/80">Google AdSense</strong> — for displaying
                advertisements
              </li>
              <li>
                <strong className="text-white/80">Upstash Redis</strong> — for storing leaderboard
                scores (anonymous only)
              </li>
              <li>
                <strong className="text-white/80">Vercel</strong> — for hosting; may collect
                standard server access logs (IP addresses, request paths, timestamps)
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Children's Privacy</h2>
            <p>
              Mini Games Hub is designed for general audiences and does not knowingly collect any
              personal information from children under 13. If you believe a child has submitted
              personal information through this site, please contact us so we can remove it.
            </p>
          </section>

          <section>
            <h2 className="font-display font-bold text-xl text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Any changes will be reflected on this page
              with an updated date. Continued use of the site after changes constitutes acceptance of
              the revised policy.
            </p>
          </section>

          <section id="contact">
            <h2 className="font-display font-bold text-xl text-white mb-3">Contact</h2>
            <p>
              For privacy questions or concerns, please email us at{' '}
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
