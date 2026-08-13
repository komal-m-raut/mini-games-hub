import type { Metadata } from 'next';
import Link from 'next/link';
import { buildArticleJsonLd, jsonLdScriptProps } from '@/lib/seo';
import { RelatedGames } from '@/components/seo/RelatedGames';

const TITLE = 'The Stroop Effect: Why Naming Colors Is So Hard';
const DESCRIPTION =
  'What the Stroop effect is, why it happens, and what it reveals about attention and self-control.';
const SLUG = '/guides/stroop-effect';
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

export default function StroopEffectGuidePage() {
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
            Try this: say out loud the ink colour of each word below, not the word itself — RED,
            GREEN, BLUE, YELLOW — where each word is printed in a colour that doesn&rsquo;t match
            what it spells. Even knowing the trick is coming, most people slow down and stumble on
            at least one. That stumble has a name, a real experiment behind it, and a good
            explanation for why your brain trips over something so simple.
          </p>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">The experiment</h2>
            <p>
              The effect is named after John Ridley Stroop, who published the classic version of
              this task in 1935, though the basic observation had been noticed even earlier. The
              setup is exactly what you just tried: name the ink colour a word is printed in, while
              the word itself spells a different colour name. Compared to naming colours of plain
              shapes or blocks, people are reliably slower and make more errors when the word
              underneath is fighting them. The reverse task — reading the word itself, ignoring the
              ink colour — barely slows down at all. That asymmetry is the whole phenomenon, and it
              turns out to be one of the most reliably reproducible findings in all of psychology.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Why it happens</h2>
            <p>
              The standard explanation comes down to a race between two mental processes that run at
              very different speeds. Reading a word is something a literate adult does automatically
              — you cannot look at the word &ldquo;RED&rdquo; and simply choose not to read it, the
              way you might choose not to look at a shape. That automatic reading process finishes
              fast and shouts its answer. Naming a colour, by contrast, is a slower, more deliberate
              process: your brain has to consciously inspect the ink and select the matching colour
              name, actively suppressing the word&rsquo;s own, faster answer along the way. When the
              two disagree, the fast, automatic word-reading response is already halfway out the
              door before the slower, deliberate colour-naming response is ready to override it, and
              untangling that conflict is what costs you the extra time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              What it reveals about attention and control
            </h2>
            <p>
              The Stroop effect is popular in psychology labs for a reason that has nothing to do
              with colour specifically: it is a clean, repeatable way to measure a mental skill
              called inhibitory control — your ability to suppress an automatic, well-practised
              response in favour of a less automatic but more relevant one. That skill turns out to
              matter far beyond a colour-word party trick. It&rsquo;s part of what lets you not
              blurt out the obvious-but-wrong answer, resist an ingrained habit when a new rule
              applies, or stay on task when something more automatic and more tempting is competing
              for your attention. Clinicians and researchers use Stroop-style tasks to study
              attention, ageing, and certain neurological and psychiatric conditions, precisely
              because the task is so simple that any slowdown is easy to attribute to the one thing
              it&rsquo;s actually measuring.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Beyond colours and words</h2>
            <p>
              Once you know the underlying mechanism — a fast, automatic response fighting a slower,
              deliberate one — you start noticing Stroop-shaped conflicts everywhere, well outside
              the original colour-word setup. Reading your own native language in a mirror is slow
              for the same reason as naming Stroop colours: an automatic process (normal reading)
              actively fights the task you&rsquo;re trying to do. Learning a new keyboard layout is
              painfully slow at first partly because your fingers&rsquo; automatic, over-practised
              responses on the old layout keep firing before your deliberate, new-layout intentions
              can override them. Any situation where an old habit and a new instruction disagree is,
              structurally, the same tug-of-war Stroop originally measured with ink and words.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Can you get faster at resisting it?
            </h2>
            <p>
              Practice on the exact same Stroop list does make you faster, largely because the
              word-colour pairings become familiar and the &ldquo;correct&rdquo; answer gets easier
              to retrieve — but this is the same narrow, task-specific improvement that shows up
              everywhere in cognitive training, not a general upgrade to your self-control. What does
              help broadly, according to the research, is simply slowing down deliberately when you
              know a conflict is coming: accuracy under a Stroop-style conflict holds up far better
              when you&rsquo;re not also racing the clock, because rushing is exactly what favours the
              fast, automatic, wrong-in-this-case response over the slower correct one. In other
              words, the fix isn&rsquo;t a trick — it&rsquo;s giving the slower process enough time
              to actually win the race.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Feel it yourself</h2>
            <p>
              <Link href="/games/color-match" className={LINK_CLASS}>
                Color Match
              </Link>{' '}
              doesn&rsquo;t run the classic Stroop task, but it exercises the same colour-perception
              machinery the effect depends on — precisely recognising and holding a colour in mind,
              under time pressure, is a close cousin of the deliberate colour-naming process that
              Stroop conflicts slow down, and our{' '}
              <Link href="/guides/color-perception" className={LINK_CLASS}>
                colour perception guide
              </Link>{' '}
              covers that machinery in more depth. A dedicated Stroop-style speed round is coming to
              the arcade for the head-on version of the conflict described above. In the meantime,{' '}
              <Link href="/games/timing-tap" className={LINK_CLASS}>
                Timing Tap
              </Link>{' '}
              is a good way to feel the flip side of this guide&rsquo;s argument — it&rsquo;s a task
              built entirely around fast, automatic reaction with nothing to suppress, which our{' '}
              <Link href="/guides/reaction-time" className={LINK_CLASS}>
                reaction time guide
              </Link>{' '}
              covers on its own terms, and makes a useful contrast against everything above about
              what happens when an automatic response has to be overridden instead of trusted.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <RelatedGames
            ids={['stroop-snap', 'color-match', 'tap-frenzy', 'timing-tap']}
            title="Play these to practice"
          />
        </div>
      </div>
    </div>
  );
}
