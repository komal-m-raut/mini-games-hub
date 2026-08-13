'use client';

import { forwardRef } from 'react';
import { RGB, contrastInk, rgbToCss, rgbToHex } from '../colorMath';

interface MixPreviewProps {
  /** The player's live slider colour. */
  color: RGB;
  /** Difficulty accent, tints the memory ghost ring only — never the fill. */
  accent?: string;
}

/**
 * The player's live mix — large enough that every slider nudge is
 * unmistakable. `color` drives the fill on every React render (which already
 * happens on each slider tick), and the forwarded ref lets `ColorSliders`
 * additionally write the background straight to the DOM inside the same
 * input event, so the swatch never waits on anything upstream (framer-motion
 * siblings, the score card, etc.) to reconcile before it paints.
 *
 * The dashed ring is a memory anchor, not a hint — it echoes the position
 * the target panel held during "memorise", tinted by the *difficulty*
 * colour, never the target's own hue.
 */
export const MixPreview = forwardRef<HTMLDivElement, MixPreviewProps>(function MixPreview(
  { color, accent },
  ref
) {
  return (
    <div
      className="color-preview-frame w-full"
      style={accent ? ({ '--ghost': accent } as React.CSSProperties) : undefined}
    >
      <div
        ref={ref}
        className="color-preview"
        style={{ backgroundColor: rgbToCss(color) }}
        role="img"
        aria-label={`Your current mix: ${rgbToHex(color)}`}
      >
        <span className="color-preview__hex font-score" style={{ color: contrastInk(color) }}>
          {rgbToHex(color)}
        </span>
      </div>
    </div>
  );
});
