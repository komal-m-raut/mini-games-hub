import type { Metadata } from 'next';
import Link from 'next/link';
import { buildArticleJsonLd, jsonLdScriptProps } from '@/lib/seo';
import { RelatedGames } from '@/components/seo/RelatedGames';

const TITLE = 'Mental Math Tricks to Get Faster at Arithmetic';
const DESCRIPTION =
  'Reusable mental math tricks — rounding, chunking, doubling and a few multiplication shortcuts — plus why they work.';
const SLUG = '/guides/mental-math';
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

export default function MentalMathGuidePage() {
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
            Everyone has a calculator in their pocket, so mental math speed looks like a solved
            problem — until you&rsquo;re splitting a bill, checking whether a &ldquo;40% off&rdquo;
            sticker actually beats the smaller size, or trying to follow a conversation full of
            numbers without stopping to type them into a phone. Fast mental arithmetic is not about
            being a human calculator; it&rsquo;s a small set of reusable tricks that turn ugly
            numbers into easy ones. Here are the ones that actually pay off.
          </p>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Round, then adjust</h2>
            <p>
              The single highest-value trick in mental math is refusing to do arithmetic on an
              awkward number when a nearby round one is available. To add 398, add 400 and subtract
              2. To subtract 19, subtract 20 and add 1 back. This works because addition and
              subtraction are forgiving of this kind of detour — the &ldquo;adjust&rdquo; step is
              almost always simpler than the original problem — and it turns numbers ending in 7, 8,
              9 or 1, 2 from obstacles into the easiest numbers in the whole calculation.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Break numbers apart by place value
            </h2>
            <p>
              Multi-digit addition and subtraction get much easier once you stop trying to process a
              whole number as one block and instead work with its parts. 47 + 35 is friendlier as
              (40 + 30) + (7 + 5), giving 70 + 12, giving 82 — two easy steps instead of one hard
              one. The same move works for multiplication: 6 × 23 is 6 × 20 plus 6 × 3, which is 120
              + 18, which is 138. Nothing here is a new fact to memorise; it&rsquo;s just choosing an
              order of operations that keeps every intermediate number small and manageable instead
              of large and error-prone.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Doubling and halving</h2>
            <p>
              Doubling and halving are two of the fastest operations the brain does, so it&rsquo;s
              often worth trading a harder multiplication for an easier doubling-and-halving pair.
              Multiplying by 5 is the same as multiplying by 10 and halving the result — 5 × 48
              becomes 480 ÷ 2, which is 240. Multiplying by 4 is doubling twice. Multiplying by 25 is
              dividing by 4, then multiplying by 100. None of these are separate facts to learn; they
              all lean on the same underlying trick of swapping an unfamiliar operation for two
              familiar, faster ones.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Multiplication shortcuts worth knowing
            </h2>
            <p>
              A handful of specific patterns save real time once they&rsquo;re automatic.
              Multiplying by 9 is often faster as multiplying by 10 and subtracting the original
              number once — 9 × 23 is 230 − 23, which is 207. Multiplying by 11 for a two-digit
              number is the two digits added together and dropped in the middle, when there&rsquo;s
              no carrying involved — 11 × 34 is 3, then 3 + 4 = 7, then 4, giving 374. Squaring a
              number that ends in 5 has a clean shortcut: multiply the leading digit by the next
              number up, then put 25 on the end — 45² needs 4 × 5 = 20, then 25 on the end, giving
              2025, no long multiplication required. It works because a number ending in 5 is always
              ten times some digit plus five, and squaring that expression algebraically lands on
              exactly &ldquo;leading digit times the next one up, then 25&rdquo; — the shortcut
              isn&rsquo;t a coincidence, it&rsquo;s that algebra pre-computed.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Why working memory is the real bottleneck
            </h2>
            <p>
              Every trick above still has to be executed somewhere, and that somewhere is working
              memory — the same small mental scratchpad that holds a phone number for a few seconds
              before you dial it. Mental arithmetic fails less often because someone doesn&rsquo;t
              know a shortcut and more often because they run out of scratchpad space holding
              intermediate results while computing the next step, which is exactly why breaking a
              big number into small chunks helps: each chunk is a lighter load to carry. If that idea
              interests you, our guide on{' '}
              <Link href="/guides/working-memory" className={LINK_CLASS}>
                training working memory
              </Link>{' '}
              goes into why that scratchpad is so small and what genuinely helps it hold more.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Building speed through deliberate practice
            </h2>
            <p>
              Like any other fast, accurate skill, mental math speed responds to focused practice far
              more than to passive exposure — reading about tricks does very little compared to
              actually using them under a bit of time pressure. Short, frequent sessions beat rare
              long ones, because the goal is making each trick automatic rather than something you
              have to consciously recall mid-calculation. Practising against a clock specifically
              also trains the second half of the skill that raw accuracy practice skips: deciding
              fast which trick applies to the number in front of you, not just executing it correctly
              once you&rsquo;ve picked one.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Practise the pieces</h2>
            <p>
              A dedicated arithmetic sprint is on its way to the arcade, but in the meantime the
              games already here train the two skills mental math actually depends on.{' '}
              <Link href="/games/memory-path" className={LINK_CLASS}>
                Memory Path
              </Link>{' '}
              is a clean stand-in for the working-memory load of holding intermediate results while
              you calculate the next step — the longer the path, the more you&rsquo;re carrying at
              once, exactly like a multi-step sum.{' '}
              <Link href="/games/timing-tap" className={LINK_CLASS}>
                Timing Tap
              </Link>{' '}
              trains the &ldquo;decide fast, commit, don&rsquo;t second-guess&rdquo; instinct that
              separates someone who knows the tricks from someone who can actually use them under a
              clock, which our{' '}
              <Link href="/guides/reaction-time" className={LINK_CLASS}>
                reaction time guide
              </Link>{' '}
              looks at in more depth.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <RelatedGames
            ids={['math-sprint', 'memory-path', 'number-recall', 'timing-tap']}
            title="Play these to practice"
          />
        </div>
      </div>
    </div>
  );
}
