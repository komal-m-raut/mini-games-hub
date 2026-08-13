'use client';

import { motion } from 'framer-motion';
import { COLORS } from '../constants';
import { StroopColorName } from '../types';

interface ColorGridProps {
  /** Pool colours in the game's fixed order — this order never changes
   *  round to round, so the grid position of each colour stays put and the
   *  1–6 hotkeys keep meaning the same thing all session (see the FAQ on
   *  why positions never move). */
  pool: StroopColorName[];
  onPick: (color: StroopColorName) => void;
  disabled?: boolean;
}

/**
 * The answer grid: one large swatch + label per pool colour, in a fixed
 * 2×2 (medium) or 2×3 (hard) layout — 3-colour Easy lands as a single row of
 * three, the natural one-row case of the same shape. `onPointerDown` (not
 * onClick) keeps input latency out of the loop entirely.
 */
export function ColorGrid({ pool, onPick, disabled = false }: ColorGridProps) {
  const columns = pool.length === 4 ? 2 : 3;

  return (
    <div
      className="grid gap-3 w-full max-w-sm mx-auto"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {pool.map((name, i) => {
        const color = COLORS[name];
        return (
          <motion.button
            key={name}
            type="button"
            onPointerDown={() => !disabled && onPick(name)}
            aria-label={color.name}
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="flex flex-col items-center justify-center gap-2 min-h-[64px] rounded-2xl border border-white/10 bg-white/[0.03] py-3 px-2 transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/70 disabled:opacity-50"
          >
            <span
              className="block w-9 h-9 rounded-full border border-white/20"
              style={{ background: color.hex, boxShadow: `0 0 16px -4px ${color.hex}` }}
              aria-hidden
            />
            <span className="flex items-center gap-1.5 font-ui text-xs text-ink-2 uppercase tracking-wide">
              <kbd className="text-2xs text-ink-4">{i + 1}</kbd>
              {color.name}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
