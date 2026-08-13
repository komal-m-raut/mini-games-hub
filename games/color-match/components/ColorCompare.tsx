'use client';

import { motion } from 'framer-motion';
import { RGB, contrastInk, rgbToCss, rgbToHex } from '../colorMath';
import { CHANNEL_META } from './channelMeta';

interface ColorCompareProps {
  target: RGB;
  actual: RGB;
  /** Parts the halves once true — see the parent's reduced-motion-aware delay. */
  revealed: boolean;
}

/** How far the two halves start off-seam before they slide together. */
const OFFSCREEN = '55%';

/**
 * The "how close was I" reveal: target and mix as two halves of one swatch,
 * meeting at a seam down the middle, with the accuracy already computed by
 * `colorAccuracy` and a per-channel delta row underneath — plain subtraction
 * on the two RGBs already in `result`, not a rescoring.
 */
export function ColorCompare({ target, actual, revealed }: ColorCompareProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="color-compare">
        <motion.div
          className="color-compare__half"
          style={{ backgroundColor: rgbToCss(target) }}
          initial={{ x: OFFSCREEN }}
          animate={{ x: revealed ? '0%' : OFFSCREEN }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        >
          <span
            className="color-compare__tag font-ui"
            style={{ color: contrastInk(target) }}
          >
            Target
          </span>
        </motion.div>

        <div className="color-compare__seam" aria-hidden="true" />

        <motion.div
          className="color-compare__half justify-end"
          style={{ backgroundColor: rgbToCss(actual) }}
          initial={{ x: `-${OFFSCREEN}` }}
          animate={{ x: revealed ? '0%' : `-${OFFSCREEN}` }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        >
          <span
            className="color-compare__tag font-ui"
            style={{ color: contrastInk(actual) }}
          >
            Yours
          </span>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full">
        {CHANNEL_META.map(({ key, label, name, ramp }) => {
          const delta = actual[key] - target[key];
          const magnitude = Math.abs(delta);
          const sign = delta === 0 ? '±' : delta > 0 ? '+' : '−';
          return (
            <div
              key={key}
              className="flex flex-col items-center gap-1 py-2 rounded-lg"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <span
                className="font-score text-xs font-semibold"
                style={{ color: ramp }}
                aria-hidden="true"
              >
                {label}
              </span>
              <span className="font-score text-sm tabular-nums text-ink-1">
                {target[key]} → {actual[key]}
              </span>
              <span
                className="font-ui text-2xs text-ink-3"
                aria-label={`${name} off by ${magnitude}`}
              >
                {sign}
                {magnitude}
              </span>
            </div>
          );
        })}
      </div>

      <p className="sr-only" aria-live="off">
        Target hex {rgbToHex(target)}, your mix {rgbToHex(actual)}.
      </p>
    </div>
  );
}
