'use client';

import { RGB, contrastInk, rgbToCss, rgbToHex } from '../colorMath';

interface ColorPanelProps {
  color: RGB;
  /** Dim caption under the panel, e.g. "Target". */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showHex?: boolean;
}

const HEIGHT: Record<NonNullable<ColorPanelProps['size']>, string> = {
  sm: 'h-24 sm:h-28',
  md: 'h-36 sm:h-40',
  lg: 'h-48 sm:h-56',
};

/** Flat colour swatch. No glow or gloss — those distort the colour being judged. */
export function ColorPanel({ color, label, size = 'lg', showHex = false }: ColorPanelProps) {
  return (
    <div className="flex flex-col items-center gap-2.5 w-full">
      <div
        className={`color-panel w-full ${HEIGHT[size]}`}
        style={{ backgroundColor: rgbToCss(color) }}
      >
        {showHex && (
          <span className="color-panel__hex font-score" style={{ color: contrastInk(color) }}>
            {rgbToHex(color)}
          </span>
        )}
      </div>

      {label && <p className="text-xs font-ui text-ink-3 uppercase tracking-widest">{label}</p>}
    </div>
  );
}
