'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ACCENT } from './constants';

interface CardGridProps {
  cols: number;
  rows: number;
  /** One emoji per cell — `board[i]` is the face of card `i`. */
  board: string[];
  /** Indices permanently face-up (a confirmed pair). */
  matched: number[];
  /** Indices currently face-up but not yet resolved (0–2 entries). */
  pending: number[];
  /** True while `pending` holds a confirmed mismatch, before it flips back. */
  mismatch: boolean;
  /** Whether tapping is currently accepted. */
  interactive: boolean;
  onFlip: (index: number) => void;
}

/**
 * The card grid itself. Plain `<button>` elements — real buttons get focus
 * order, Enter/Space activation and disabled-state semantics for free,
 * matching Grid Flash's FlashGrid rather than a custom pointer widget.
 * Each card flips with a 3D rotateY, falling back to a plain crossfade under
 * `prefers-reduced-motion`.
 */
export function CardGrid({
  cols,
  rows,
  board,
  matched,
  pending,
  mismatch,
  interactive,
  onFlip,
}: CardGridProps) {
  const reducedMotion = useReducedMotion();
  const matchedSet = useMemo(() => new Set(matched), [matched]);
  const pendingSet = useMemo(() => new Set(pending), [pending]);

  return (
    <div
      className="grid w-full mx-auto"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gap: 8,
        maxWidth: 440,
        aspectRatio: `${cols} / ${rows}`,
      }}
      role="group"
      aria-label={`${cols} by ${rows} card grid`}
    >
      {board.map((emoji, i) => {
        const isMatched = matchedSet.has(i);
        const isPending = pendingSet.has(i);
        const isFaceUp = isMatched || isPending;
        const isMismatched = isPending && mismatch;
        const canFlip = interactive && !isFaceUp;

        let border = 'rgba(255,255,255,0.1)';
        let boxShadow = 'none';
        if (isMismatched) {
          border = 'rgba(239,68,68,0.8)';
          boxShadow = '0 0 14px rgba(239,68,68,0.45)';
        } else if (isMatched) {
          border = `${ACCENT}cc`;
          boxShadow = `0 0 14px ${ACCENT}66`;
        } else if (isPending) {
          border = 'rgba(255,255,255,0.35)';
        }

        return (
          <button
            key={i}
            type="button"
            aria-label={isFaceUp ? `Card ${i + 1}: ${emoji}` : `Card ${i + 1} face down`}
            aria-pressed={isFaceUp}
            disabled={!canFlip}
            onClick={() => onFlip(i)}
            className="relative rounded-xl touch-manipulation min-h-11 min-w-11"
            style={{
              aspectRatio: '1 / 1',
              cursor: canFlip ? 'pointer' : isFaceUp ? 'default' : 'not-allowed',
              perspective: 600,
            }}
          >
            {reducedMotion ? (
              <>
                <motion.div
                  className="absolute inset-0 rounded-xl border grid place-items-center text-lg font-display"
                  style={{ background: 'rgba(255,255,255,0.035)', borderColor: border, boxShadow, color: ACCENT }}
                  animate={{ opacity: isFaceUp ? 0 : 1 }}
                  transition={{ duration: 0.15 }}
                >
                  ?
                </motion.div>
                <motion.div
                  className="absolute inset-0 rounded-xl border grid place-items-center text-2xl sm:text-3xl"
                  style={{ background: `${ACCENT}14`, borderColor: border, boxShadow }}
                  animate={{ opacity: isFaceUp ? 1 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {emoji}
                </motion.div>
              </>
            ) : (
              <motion.div
                className="absolute inset-0"
                style={{ transformStyle: 'preserve-3d' }}
                animate={{ rotateY: isFaceUp ? 180 : 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
              >
                <div
                  className="absolute inset-0 rounded-xl border grid place-items-center text-lg font-display"
                  style={{
                    background: 'rgba(255,255,255,0.035)',
                    borderColor: border,
                    boxShadow,
                    color: ACCENT,
                    backfaceVisibility: 'hidden',
                  }}
                >
                  ?
                </div>
                <div
                  className="absolute inset-0 rounded-xl border grid place-items-center text-2xl sm:text-3xl"
                  style={{
                    background: `${ACCENT}14`,
                    borderColor: border,
                    boxShadow,
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  {emoji}
                </div>
              </motion.div>
            )}
          </button>
        );
      })}
    </div>
  );
}
