'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { THROW_EMOJI } from '../constants';
import { Throw, ThrowOutcome } from '../types';

interface RevealStageProps {
  playerThrow: Throw | null;
  botThrow: Throw | null;
  /** 3 → 2 → 1 → 0. Hands stay hidden until this reaches 0. */
  revealCount: number;
  /** Set once the win/lose/tie flash is live (the `throw-result` phase). */
  throwResult: ThrowOutcome | null;
  accent: string;
}

const RESULT_META: Record<ThrowOutcome, { label: string; color: string }> = {
  win: { label: 'You win the throw!', color: '#22C55E' },
  lose: { label: 'Bot wins the throw', color: '#EF4444' },
  tie: { label: 'Tie — throw again', color: '#EAB308' },
};

/** One hand slot — a blank pulsing disc while hidden, the emoji once
 *  revealed. The spring pop is what "Reduced motion: reveal without
 *  spring/scale, opacity only" quiets down to a plain fade, via the app's
 *  global `MotionConfig reducedMotion="user"` (see MotionProvider). */
function HandSlot({ label, hand, revealed }: { label: string; hand: Throw | null; revealed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full grid place-items-center bg-white/5 border border-white/10">
        <AnimatePresence mode="wait">
          {revealed && hand ? (
            <motion.span
              key={hand}
              className="text-6xl sm:text-7xl"
              initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              aria-hidden="true"
            >
              {THROW_EMOJI[hand]}
            </motion.span>
          ) : (
            <motion.span
              key="hidden"
              className="text-3xl text-ink-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            >
              ✊
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <p className="font-ui text-xs text-ink-3 uppercase tracking-wide">{label}</p>
    </div>
  );
}

export function RevealStage({ playerThrow, botThrow, revealCount, throwResult, accent }: RevealStageProps) {
  const revealed = revealCount <= 0;

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex items-center justify-center gap-8 sm:gap-14">
        <HandSlot label="You" hand={playerThrow} revealed={revealed} />
        <span className="font-display text-2xl text-ink-4" aria-hidden="true">
          vs
        </span>
        <HandSlot label="Bot" hand={botThrow} revealed={revealed} />
      </div>

      <div className="h-14 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!revealed ? (
            <motion.span
              key={revealCount}
              className="neon-text font-display text-5xl"
              style={{ '--neon': accent, color: accent } as React.CSSProperties}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            >
              {revealCount}
            </motion.span>
          ) : throwResult ? (
            <motion.p
              key={throwResult}
              className="font-display text-2xl sm:text-3xl text-center"
              style={{ color: RESULT_META[throwResult].color }}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              role="status"
              aria-live="polite"
            >
              {RESULT_META[throwResult].label}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
