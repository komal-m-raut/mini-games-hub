'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { PAD_COLORS, PAD_LABELS } from './constants';

interface PadBoardProps {
  /** Pad currently lit — either a playback step or a correct tap's brief
   *  press pulse. Null when nothing should be highlighted. */
  litPad: number | null;
  /** Pad tapped incorrectly — flashes red until the round ends. */
  wrongPad: number | null;
  /** The pad that *should* have been tapped, revealed alongside `wrongPad`. */
  revealPad: number | null;
  /** Whether tapping is currently accepted (false during playback). */
  interactive: boolean;
  onTap: (index: number) => void;
}

/**
 * The four Simon-style pads, in a 2×2 rounded board. Plain `<button>`
 * elements so focus order, Enter/Space activation and disabled semantics
 * come for free — the same rationale Grid Flash's FlashGrid documents.
 */
export function PadBoard({ litPad, wrongPad, revealPad, interactive, onTap }: PadBoardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className="grid w-full mx-auto"
      style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 360 }}
      role="group"
      aria-label="Echo Steps pad board"
    >
      {PAD_COLORS.map((color, i) => {
        const isLit = litPad === i;
        const isWrong = wrongPad === i;
        const isReveal = revealPad === i;
        const isActive = isLit || isReveal;

        let background = 'rgba(255,255,255,0.035)';
        let border = `${color}40`;
        let boxShadow = 'none';

        if (isWrong) {
          background = 'rgba(239,68,68,0.28)';
          border = 'rgba(239,68,68,0.85)';
          boxShadow = '0 0 18px rgba(239,68,68,0.55)';
        } else if (isActive) {
          background = `${color}40`;
          border = color;
          boxShadow = `0 0 20px ${color}90`;
        }

        return (
          <motion.button
            key={i}
            type="button"
            aria-label={`${PAD_LABELS[i]} pad`}
            aria-disabled={!interactive}
            disabled={!interactive}
            onClick={() => onTap(i)}
            className="rounded-2xl border-2 touch-manipulation"
            style={{
              background,
              borderColor: border,
              boxShadow,
              minWidth: 96,
              minHeight: 96,
              aspectRatio: '1 / 1',
              opacity: interactive ? 1 : 0.55,
              transition: 'background 0.12s, border-color 0.12s, box-shadow 0.12s, opacity 0.2s',
              cursor: interactive ? 'pointer' : 'default',
            }}
            // Reduced motion: the lit state is a steady high-contrast border
            // highlight only — no pulse/scale, matching AGENTS' accessibility
            // contract for this game.
            animate={
              isActive && !isWrong && !reducedMotion ? { scale: [1, 1.06, 1] } : { scale: 1 }
            }
            transition={
              isActive && !isWrong && !reducedMotion
                ? { duration: 0.22, ease: 'easeOut' }
                : { duration: 0.12 }
            }
            whileTap={interactive ? { scale: 0.95 } : undefined}
          />
        );
      })}
    </div>
  );
}
