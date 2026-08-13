'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface NumberDisplayProps {
  digits: string;
  accent: string;
  /** How long this number stays on screen, in ms — drives the draining bar. */
  displayMs: number;
  /** Bumped by the hook on every fresh display window (a new number, or a
   *  restart after the tab was hidden) — replays the reveal and the bar. */
  attemptKey: number;
}

/**
 * The large centred number shown during the `display` phase, with a thin
 * bar draining underneath over the exact window the number is visible for.
 * Reduced motion drops the scale entrance entirely — the number just fades
 * in — since a memory task is exactly the wrong place for a distracting
 * slide/scale flourish.
 */
export function NumberDisplay({ digits, accent, displayMs, attemptKey }: NumberDisplayProps) {
  const prefersReducedMotion = useReducedMotion();
  const numberMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, scale: 0.88 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.92 } };

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      <motion.p
        key={`number-${attemptKey}`}
        {...numberMotion}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="font-score text-5xl sm:text-6xl tracking-[0.15em] tabular-nums"
        style={{ color: accent, textShadow: `0 0 24px ${accent}60` }}
        aria-live="polite"
      >
        {digits}
      </motion.p>

      <div className="w-full max-w-[280px] h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          key={`bar-${attemptKey}`}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${accent}, ${accent}55)`,
            boxShadow: `0 0 10px ${accent}80`,
          }}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: displayMs / 1000, ease: 'linear' }}
        />
      </div>
    </div>
  );
}
