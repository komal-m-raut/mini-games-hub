import type { Metadata } from 'next';
import Link from 'next/link';
import { buildArticleJsonLd, jsonLdScriptProps } from '@/lib/seo';
import { RelatedGames } from '@/components/seo/RelatedGames';

const TITLE = 'How to Improve Your Reaction Time';
const DESCRIPTION =
  'What actually speeds up reaction time, what mostly does not, and how to measure your own reflexes for free.';
const SLUG = '/guides/reaction-time';
const LINK_CLASS =
  'text-brand-violet hover:text-brand-cyan underline underline-offset-2 transition-colors';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: SLUG },
  openGraph: { title: TITLE, description: DESCRIPTION, url: SLUG },
};

const jsonLd = buildArticleJsonLd({
  title: TITLE,
  description: DESCRIPTION,
  slug: SLUG,
  datePublished: '2026-08-13',
});

export default function ReactionTimeGuidePage() {
  return (
    <div className="page-container py-12 sm:py-16">
      <script {...jsonLdScriptProps(jsonLd)} />

      <div className="max-w-2xl mx-auto">
        <Link
          href="/guides"
          className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink-1 transition-colors mb-8"
        >
          ← Back to Guides
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl mb-2">{TITLE}</h1>
        <p className="text-ink-3 text-sm mb-10">5 min read</p>

        <div className="space-y-6 text-ink-2 leading-relaxed">
          <p>
            Close a browser tab the instant a notification pops up, catch a dropped phone before
            it hits the floor, brake half a second sooner than the car in front of you — reaction
            time is one of those abilities nobody thinks about until they need it. It is also one
            of the most measured quantities in psychology, because it is simple to test and
            surprisingly revealing about how a nervous system is doing on a given day. Here is what
            the research actually supports about improving it, and what mostly does not matter.
          </p>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              What reaction time actually measures
            </h2>
            <p>
              Reaction time is the gap between a signal arriving and your body doing something
              about it — nothing more mystical than that. Under the hood it is the sum of several
              short delays stacked in sequence: your senses have to register the signal, your brain
              has to decide it is real and pick a response, and a nerve impulse has to travel out
              to a muscle and make it move. Each stage takes only tens of milliseconds, but they add
              up to the roughly 200 to 250 millisecond gap most healthy adults post on a simple
              visual reaction test. That is not a design flaw — it is the minimum plumbing delay of
              a biological nervous system, and it stays remarkably consistent across people who are
              otherwise very different.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Why everyone&rsquo;s number is a little different
            </h2>
            <p>
              Within that baseline, plenty of things move the number around. Age matters: reaction
              time improves through childhood, peaks somewhere in the twenties, and lengthens
              gradually from there. Fatigue and sleep debt are bigger factors than most people
              expect — a poor night&rsquo;s sleep can slow reactions by an amount comparable to mild
              alcohol intoxication. Caffeine reliably speeds things up a little, at least for people
              who are not already saturated with it. And attention is the real wildcard: a reaction
              time test measures your best possible response in that instant, so anything that
              splits your focus — a second screen, a conversation, plain boredom — drags the number
              down independent of how fast your nervous system is actually capable of firing.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Simple reaction time vs. choice reaction time
            </h2>
            <p>
              Not all reaction time is the same task. Simple reaction time is &ldquo;react to the
              one thing you&rsquo;re expecting, the moment it happens&rdquo; — a sprinter off the
              blocks, a single flashing light. Choice reaction time adds a decision: several
              possible signals, each needing a different response, so you cannot just react
              blindly — you have to work out which response is correct first. That extra step
              reliably adds time, often 100 milliseconds or more, because a nervous system genuinely
              needs longer to choose between options than to fire off one rehearsed response. Most
              real situations — driving, sport, a game that reacts to more than one kind of cue —
              are choice reaction time wearing a simple reaction time costume, which is worth
              knowing before comparing your score on two different tests and assuming one of them
              is &ldquo;wrong.&rdquo;
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">What actually speeds it up</h2>
            <p>
              The honest answer is: less than most headlines suggest, but not nothing. Practice on
              a specific task genuinely helps — you get faster at that exact test, partly by
              sharpening the decision stage and partly by simply knowing what to expect. That
              improvement transfers best to very similar tasks and least to unrelated ones, so ten
              minutes on a reflex game will make you measurably better at that reflex game, and only
              weakly better at, say, catching a falling object in real life. Sleep is probably the
              single highest-leverage lever most people are not pulling: well-rested reaction time
              is consistently faster than sleep-deprived reaction time, study after study. Regular
              light exercise correlates with faster reaction times too, most likely through general
              cardiovascular and nervous-system health rather than anything reaction-specific. And
              warming up matters in the short term — the first attempt of a session is reliably
              slower than the fifth, so it is worth not judging yourself off a cold first try.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              What doesn&rsquo;t move the needle much
            </h2>
            <p>
              Be sceptical of anything promising a large, permanent, general-purpose reaction time
              boost from some unrelated brain exercise. The evidence for &ldquo;far transfer&rdquo;
              — training on one task and getting meaningfully better at a completely different one —
              is thin at best for reaction time specifically. What is well supported is narrower and
              more honest: you get faster at what you actually practise, sleep and attention swing
              your measured score more than most training regimes do, and the underlying
              nervous-system plumbing has a floor that no amount of practice pushes through.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Test yourself</h2>
            <p>
              The cleanest way to see any of this in action is to actually measure it.{' '}
              <Link href="/games/timing-tap" className={LINK_CLASS}>
                Timing Tap
              </Link>{' '}
              is a straightforward test of the exact reflex loop described above: a marker sweeps a
              bar and you tap the instant it crosses the centre, with three difficulty tiers that
              shrink your margin and, on Hard, add the kind of unpredictable pacing that turns
              simple reaction into something closer to choice reaction. Play a few rounds cold, then
              a few more after five minutes of practice, and you will see the practice effect above
              happen to your own numbers in real time. If working memory interests you as much as
              raw speed, our guide on{' '}
              <Link href="/guides/working-memory" className={LINK_CLASS}>
                training working memory
              </Link>{' '}
              covers the other half of what makes fast, accurate decisions possible; and if you want
              to watch reaction time collide head-on with a genuinely tricky mental conflict, the{' '}
              <Link href="/guides/stroop-effect" className={LINK_CLASS}>
                Stroop effect guide
              </Link>{' '}
              is next.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <RelatedGames ids={['timing-tap', 'tap-frenzy', 'bullseye']} title="Play these to practice" />
        </div>
      </div>
    </div>
  );
}
