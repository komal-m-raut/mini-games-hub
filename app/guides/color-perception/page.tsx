import type { Metadata } from 'next';
import Link from 'next/link';
import { buildArticleJsonLd, jsonLdScriptProps } from '@/lib/seo';
import { RelatedGames } from '@/components/seo/RelatedGames';

const TITLE = "Why Your Brain Can't Remember Colors";
const DESCRIPTION =
  'The science of why colour memory is so unreliable, and a few things that genuinely help.';
const SLUG = '/guides/color-perception';
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

export default function ColorPerceptionGuidePage() {
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
            Paint a wall, then try to buy a matching cushion three weeks later from memory alone,
            and you will very likely get it wrong — not because you were not paying attention, but
            because colour memory is one of the leakiest kinds of memory we have. This is not a
            personal failing. It is how colour vision is built, and understanding why makes you
            noticeably better at working around it.
          </p>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              How colour vision actually works
            </h2>
            <p>
              Human colour vision starts with three types of cone cell in the retina, each tuned to
              a different, broadly overlapping range of wavelengths, loosely described as short,
              medium and long. Every colour you see is your brain comparing the relative response of
              those three signals, not measuring wavelength directly the way a spectrometer would.
              That comparison-based system is what causes metamerism, where two physically different
              mixes of light look identical to a human eye, and it is a large part of why &ldquo;the
              same&rdquo; colour can look different under different light sources even though
              nothing about the object itself changed. Colour, in other words, is something your
              visual system computes and reconstructs, not a fixed property you simply read off the
              world.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Why colour memory specifically falls apart
            </h2>
            <p>
              Seeing a colour accurately and remembering it accurately are genuinely different
              skills, and the second is much weaker. The moment you stop looking at a colour, your
              brain tends to round it toward the nearest &ldquo;typical&rdquo; example of a colour
              category — a slightly orange-red drifts toward a mental prototype of &ldquo;red,&rdquo;
              a muddy blue-green drifts toward a prototype of &ldquo;teal.&rdquo; This categorical
              pull is useful for fast communication (you can say &ldquo;it was blue&rdquo; in under a
              second) but it is lossy in exactly the way a rough label always is: two noticeably
              different shades both get flattened to the same word, and your memory keeps the word
              more faithfully than it keeps the shade. Context makes it worse — the same physical
              colour is perceived differently depending on the colours next to it and the light
              falling on it, so a memory formed under one lighting condition can be a poor match the
              moment you try to recall it under another.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              The illusions that give the game away
            </h2>
            <p>
              Context effects are easy to demonstrate and famously counterintuitive. In the
              well-known checker-shadow illusion, two squares that are printed with the exact same
              pixel value look like completely different shades of grey, purely because of the
              shadow and surrounding squares the brain uses to &ldquo;correct&rdquo; for lighting. A
              now-famous photograph of a dress split the internet over whether it was blue-and-black
              or white-and-gold, because viewers&rsquo; visual systems made different assumptions
              about the light source in the photo and corrected the colours accordingly. Neither is
              a trick of the image file — they are your own visual system actively interpreting
              colour rather than passively recording it, which is exactly the mechanism that makes
              colour memory so unreliable: if perception itself is a reconstruction, what gets
              stored to memory was never a raw, stable value to begin with.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">
              Why &ldquo;I&rsquo;ll just remember it&rdquo; fails in practice
            </h2>
            <p>
              Put those two things together — a system that rounds colours toward categories, and a
              system that interprets colour differently depending on context — and it becomes clear
              why holding a paint swatch in your head for even a few minutes is much harder than it
              feels like it should be. You are not failing to store a value; there was no
              context-free value to store. This is also why professionals who work with colour for a
              living — designers, print technicians, painters — rely on physical references and
              numeric codes rather than memory, and why &ldquo;it looked exactly like this in the
              shop&rdquo; is one of the most common and understandable complaints in retail returns.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">How to get better anyway</h2>
            <p>
              You cannot fix the underlying biology, but you can work around it. Compare side by
              side whenever you possibly can, rather than trusting memory across any gap in time —
              even a same-room, thirty-second gap is enough for categorical drift to creep in. When a
              direct comparison is impossible, note the colour in more specific terms than a single
              word — &ldquo;warm mid-grey, slightly toward blue&rdquo; holds up much better over time
              than &ldquo;grey&rdquo; alone, because it resists getting rounded down to the nearest
              broad category. And if precision genuinely matters, use a numeric reference (a hex
              code, a paint code, a photo taken under consistent light) instead of memory entirely —
              it is the same trick professionals use, just made available to everyone.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-white mt-4 mb-3">Test your own eye</h2>
            <p>
              <Link href="/games/color-match" className={LINK_CLASS}>
                Color Match
              </Link>{' '}
              is built directly around this gap between seeing and remembering: a colour appears for
              a few seconds, disappears completely, and you rebuild it from nothing on three
              sliders. The scoring even reflects the science — it weighs mismatches the way human
              eyes actually perceive colour, rather than treating red, green and blue as equally
              sensitive channels, because your eyes genuinely do not. If working memory in general
              interests you beyond just colour, our guide on{' '}
              <Link href="/guides/working-memory" className={LINK_CLASS}>
                training working memory
              </Link>{' '}
              covers the same &ldquo;hold it, then reproduce it&rdquo; mechanism in other senses; and
              if you want to see colour perception collide with something even stranger, the{' '}
              <Link href="/guides/stroop-effect" className={LINK_CLASS}>
                Stroop effect guide
              </Link>{' '}
              looks at what happens when a colour and a word disagree.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <RelatedGames
            ids={['color-match', 'shape-echo', 'echo-ear', 'block-count']}
            title="Play these to practice"
          />
        </div>
      </div>
    </div>
  );
}
