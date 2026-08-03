import { ChevronDown } from 'lucide-react';

interface HowToPlayProps {
  /** Shown next to the toggle, e.g. "How to Play Balloon Match". */
  title: string;
  /** Short prose steps, roughly 3-5. Rendered as an ordered list. */
  steps: string[];
}

/**
 * Collapsible "How to Play" blurb shared by every game page. A native
 * <details>/<summary> so it needs zero JS to expand/collapse and stays
 * keyboard- and screen-reader-accessible by default — this can stay a
 * server component. The steps are real sentences (not one-word bullets) so
 * this also doubles as indexable SEO copy on an otherwise fully interactive
 * page.
 */
export function HowToPlay({ title, steps }: HowToPlayProps) {
  return (
    <details className="glass-card how-to-play">
      <summary className="how-to-play-summary font-display text-base sm:text-lg font-bold text-white">
        <span>{title}</span>
        <ChevronDown className="how-to-play-chevron w-5 h-5 shrink-0" strokeWidth={1.5} />
      </summary>
      <ol className="how-to-play-steps font-mono text-sm text-white/60">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </details>
  );
}
