import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guides',
  description:
    'Short, honest guides on reaction time, working memory, colour perception, mental math and the Stroop effect — with games to test each one yourself.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: 'Guides',
    description:
      'Short, honest guides on reaction time, working memory, colour perception, mental math and the Stroop effect — with games to test each one yourself.',
    url: '/guides',
  },
};

interface GuideCard {
  slug: string;
  title: string;
  hook: string;
}

// Kept in step with GUIDE_SLUGS in app/sitemap.ts and the metadata each
// article exports — there's no shared registry for guides the way games
// have one, so this list is hand-kept in sync the same way HOW_TO_PLAY_STEPS
// is duplicated per game page rather than centralised.
const GUIDES: GuideCard[] = [
  {
    slug: 'reaction-time',
    title: 'How to Improve Your Reaction Time',
    hook: "What actually speeds up your reflexes, and what's mostly marketing.",
  },
  {
    slug: 'working-memory',
    title: 'Train Your Working Memory: What Actually Works',
    hook: 'The mental scratchpad behind focus and arithmetic, and what training it really does.',
  },
  {
    slug: 'color-perception',
    title: "Why Your Brain Can't Remember Colors",
    hook: 'Why a colour you just looked at is already slipping from memory.',
  },
  {
    slug: 'mental-math',
    title: 'Mental Math Tricks to Get Faster at Arithmetic',
    hook: 'A handful of reusable tricks that make arithmetic click faster in your head.',
  },
  {
    slug: 'stroop-effect',
    title: 'The Stroop Effect: Why Naming Colors Is So Hard',
    hook: 'Why naming a colour is so much harder when a word disagrees with it.',
  },
];

export default function GuidesPage() {
  return (
    <div className="page-container py-12 sm:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors mb-8"
        >
          ← Back to Hub
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl mb-2">Guides</h1>
        <p className="text-ink-3 text-sm mb-6">The ideas behind the games</p>

        <p className="text-ink-2 leading-relaxed mb-10">
          Short, honest explainers on what your brain is actually doing when you play — what the
          research does and doesn&rsquo;t support, and a few concrete things worth trying. No
          miracle claims, just the mechanics, and a game at the end of each one to test it on
          yourself.
        </p>

        <div className="flex flex-col gap-4">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="glass-card flex items-center justify-between gap-4 hover:border-brand-violet/40 transition-colors"
            >
              <div className="min-w-0">
                <h2 className="font-display text-lg text-white mb-1">{guide.title}</h2>
                <p className="text-sm text-ink-3">{guide.hook}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-ink-4 hidden sm:inline">5 min read</span>
                <ArrowRight className="w-4 h-4 text-ink-3" strokeWidth={2} aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
