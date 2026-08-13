import type { Metadata } from 'next';
import Link from 'next/link';
import { buildArticleJsonLd, jsonLdScriptProps } from '@/lib/seo';
import { RelatedGames } from '@/components/seo/RelatedGames';

const TITLE = 'Train Your Working Memory: What Actually Works';
const DESCRIPTION =
  'What working memory is, why most "brain training" claims overreach, and what the evidence actually supports.';
const SLUG = '/guides/working-memory';
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

export default function WorkingMemoryGuidePage() {
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
            Working memory is the mental scratchpad you use to hold a phone number for the six
            seconds between hearing it and dialling it, to keep a running total while you add up a
            bill in your head, or to remember the first half of a sentence long enough to
            understand the second half. It is one of the most-studied ideas in cognitive
            psychology, and also one of the most oversold by apps that promise to &ldquo;boost your
            brainpower.&rdquo; Here is what training working memory actually does, and what it does
            not.
          </p>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Working memory vs. long-term memory
            </h2>
            <p>
              Long-term memory is storage — years-old facts, faces, skills, the kind of thing you
              are not actively holding onto right now but can retrieve on demand. Working memory is
              different: it is a small, temporary holding space for information you are using this
              second, and it empties out fast once your attention moves elsewhere. The classic
              estimate is that it holds only a handful of items at once — commonly cited as
              somewhere around four, give or take, once you strip away memory tricks — which is a
              strikingly small number for something so central to thinking. Almost everything that
              feels like &ldquo;concentration&rdquo; or &ldquo;juggling ideas&rdquo; is really
              working memory doing the juggling.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Why it matters day to day</h2>
            <p>
              Working memory is the bottleneck behind a huge range of everyday tasks, not because
              those tasks are inherently hard, but because they all demand holding several things in
              mind at once. Following multi-step instructions, doing arithmetic without paper,
              holding a plan while you&rsquo;re distracted mid-task, understanding a long sentence —
              all of it leans on the same small scratchpad. When working memory is overloaded, the
              symptom rarely looks like &ldquo;forgetting&rdquo; in the usual sense; it looks like
              losing your train of thought, re-reading the same paragraph, or asking someone to
              repeat themselves because the first half of what they said fell out of the buffer
              before the second half arrived.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">What doesn&rsquo;t work</h2>
            <p>
              The claim that made &ldquo;brain training&rdquo; into a billion-dollar industry — that
              practising working-memory tasks makes you generally smarter, sharper, or better at
              unrelated mental work — has not held up well under scrutiny. Large, well-controlled
              studies consistently find that people get better at the specific task they practised
              and see little to no improvement on genuinely different tasks, even ones that also
              lean on working memory. If an app promises that five minutes a day of one narrow
              exercise will meaningfully raise your general intelligence or fix unrelated problems
              with attention, that is a much bigger claim than the evidence supports.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              What the evidence actually supports
            </h2>
            <p>
              None of that means practice is worthless — it just works in a narrower, more specific
              way than the marketing suggests. You get reliably better at tasks that are
              structurally similar to what you practised, which is exactly why athletes drill
              specific plays and musicians drill specific passages rather than doing generic
              &ldquo;reaction exercises.&rdquo; Chunking is one of the few tricks with genuinely
              strong evidence behind it: working memory holds roughly the same number of chunks
              whether each chunk is one digit or one whole word, so recoding &ldquo;1-9-4-5&rdquo; as
              &ldquo;the year the war ended&rdquo; trades four slots for one. Reducing simultaneous
              load helps too — writing things down, doing one thing at a time, and cutting
              background noise and notifications all effectively free up scratchpad space that would
              otherwise be spent holding irrelevant information instead of the task at hand.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Practical exercises worth your time
            </h2>
            <p>
              If you want to train working memory specifically, deliberately hold information
              without external aids: repeat a shopping list back before you write it down, do a
              calculation across several steps entirely in your head, or replay a short sequence of
              moves or directions before acting on them — the same idea our{' '}
              <Link href="/guides/mental-math" className={LINK_CLASS}>
                mental math guide
              </Link>{' '}
              leans on for arithmetic specifically. Span tasks — where a sequence grows by one item
              every time you succeed — are a genuinely good format, because the difficulty tracks
              your own ability automatically rather than staying fixed at a level that is either
              trivially easy or permanently too hard. The honest expectation is task-specific
              improvement: you will get better at holding sequences, or better at holding spatial
              layouts, or better at holding numbers, largely in proportion to what you actually
              practised.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">How our games map onto it</h2>
            <p>
              A few of the games on this site are, structurally, working-memory span tasks with
              better production values than a lab experiment.{' '}
              <Link href="/games/memory-path" className={LINK_CLASS}>
                Memory Path
              </Link>{' '}
              is a spatial span task: a path lights up across a grid and you retrace it from memory,
              getting longer as the grid grows on harder difficulties, which is exactly the
              &ldquo;sequence grows until you fail&rdquo; format research uses to measure span.{' '}
              <Link href="/games/color-match" className={LINK_CLASS}>
                Color Match
              </Link>{' '}
              leans on a shorter, more perceptual kind of working memory — holding a specific colour
              in mind for a few seconds with nothing to rehearse it against but your own sense of
              hue and shade, which our{' '}
              <Link href="/guides/color-perception" className={LINK_CLASS}>
                colour perception guide
              </Link>{' '}
              covers in more depth.{' '}
              <Link href="/games/balloon-match" className={LINK_CLASS}>
                Balloon Match
              </Link>{' '}
              asks for something similar with size instead of colour: a visual quantity held
              briefly, then reproduced with no reference to check against. None of the three will
              make you generally sharper, but every round is genuine, deliberate practice at the
              exact skill it is testing — which, per the research above, is precisely the kind of
              practice that actually pays off.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <RelatedGames
            ids={['memory-path', 'color-match', 'balloon-match', 'grid-flash']}
            title="Play these to practice"
          />
        </div>
      </div>
    </div>
  );
}
