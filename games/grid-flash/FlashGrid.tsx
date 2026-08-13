'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ACCENT } from './constants';

interface FlashGridProps {
  /** Grid is size × size. */
  size: number;
  /** Cells currently lit — the flash phase's pattern. Empty once recall
   *  begins, so the grid reads as genuinely dark. */
  lit: number[];
  /** Cells correctly tapped so far this level. */
  selected: number[];
  /** The most recent wrong tap, flashing red until it clears itself. */
  wrongCell: number | null;
  /** Whether tapping is currently accepted. */
  interactive: boolean;
  onTap: (index: number) => void;
}

/**
 * The tile grid itself. Plain `<button>` elements (not a custom
 * pointer-tracing widget like Memory Path's PathGrid) since Grid Flash's
 * interaction is just "tap the right tiles" — real buttons get focus order,
 * Enter/Space activation and `aria-pressed` for free.
 */
export function FlashGrid({ size, lit, selected, wrongCell, interactive, onTap }: FlashGridProps) {
  const reducedMotion = useReducedMotion();
  const litSet = useMemo(() => new Set(lit), [lit]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <div
      className="grid w-full mx-auto"
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 8, maxWidth: 420, aspectRatio: '1 / 1' }}
      role="group"
      aria-label={`${size} by ${size} memory grid`}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const row = Math.floor(i / size);
        const col = i % size;
        const isLit = litSet.has(i);
        const isSelected = selectedSet.has(i);
        const isWrong = wrongCell === i;
        const isActive = isLit || isSelected;

        let background = 'rgba(255,255,255,0.035)';
        let border = 'rgba(255,255,255,0.08)';
        let boxShadow = 'none';

        if (isWrong) {
          background = 'rgba(239,68,68,0.28)';
          border = 'rgba(239,68,68,0.8)';
          boxShadow = '0 0 16px rgba(239,68,68,0.5)';
        } else if (isActive) {
          background = `${ACCENT}33`;
          border = `${ACCENT}cc`;
          boxShadow = `0 0 16px ${ACCENT}80`;
        }

        return (
          <motion.button
            key={i}
            type="button"
            aria-label={`Tile row ${row + 1} column ${col + 1}`}
            aria-pressed={isSelected || isWrong}
            disabled={!interactive}
            onClick={() => onTap(i)}
            className="rounded-xl border touch-manipulation"
            style={{
              background,
              borderColor: border,
              boxShadow,
              aspectRatio: '1 / 1',
              transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
              cursor: interactive ? 'pointer' : 'default',
            }}
            // Lit tiles pulse gently while flashing so the pattern reads as
            // "live" — under reduced motion they hold a steady highlight
            // for the same duration instead, with no oscillation at all.
            animate={
              isLit && !isWrong && !reducedMotion
                ? { scale: [1, 1.045, 1] }
                : { scale: 1 }
            }
            transition={
              isLit && !isWrong && !reducedMotion
                ? { duration: 0.9, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.15 }
            }
            whileTap={interactive ? { scale: 0.94 } : undefined}
          />
        );
      })}
    </div>
  );
}
