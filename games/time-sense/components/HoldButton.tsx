'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { usePressAndHold } from '@/hooks/usePressAndHold';
import { HOLD_GLOW_SATURATION_MS } from '../constants';

interface HoldButtonProps {
  holdHandlers: ReturnType<typeof usePressAndHold>;
  isHolding: boolean;
  accent: string;
  /** Easy only: renders a glow that grows while held (no numbers). */
  showGlow: boolean;
  /** Elapsed hold time in ms — cosmetic only, on a fixed saturation curve
   *  unrelated to the round's own target (see HOLD_GLOW_SATURATION_MS), so
   *  it can't be used to time the release. */
  holdElapsedMs: number;
}

/** The big press-and-hold button players use to recreate the duration. */
export function HoldButton({
  holdHandlers,
  isHolding,
  accent,
  showGlow,
  holdElapsedMs,
}: HoldButtonProps) {
  const reducedMotion = useReducedMotion();
  const glowStrength = Math.min(1, holdElapsedMs / HOLD_GLOW_SATURATION_MS);

  return (
    <button
      type="button"
      {...holdHandlers}
      aria-label={isHolding ? 'Release to lock in your hold' : 'Press and hold to recreate the duration'}
      aria-pressed={isHolding}
      className="relative grid place-items-center w-44 h-44 rounded-full font-display text-lg font-semibold"
      style={{
        ...holdHandlers.style,
        color: isHolding ? '#fff' : 'rgba(255,255,255,0.85)',
        background: `color-mix(in srgb, ${accent} ${isHolding ? 26 : 14}%, rgba(255,255,255,0.03))`,
        border: `2px solid color-mix(in srgb, ${accent} ${isHolding ? 100 : 45}%, transparent)`,
        boxShadow: isHolding
          ? `0 6px 18px rgba(0,0,0,0.4), 0 0 30px color-mix(in srgb, ${accent} 45%, transparent)`
          : '0 10px 30px rgba(0,0,0,0.35)',
        transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {showGlow && isHolding && !reducedMotion && (
        <motion.span
          aria-hidden
          className="absolute inset-[-0.5rem] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
          animate={{ opacity: 0.15 + glowStrength * 0.65, scale: 0.9 + glowStrength * 0.3 }}
          transition={{ duration: 0.05 }}
        />
      )}
      <motion.span
        animate={{ scale: isHolding ? 0.97 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isHolding ? 'Holding…' : 'Hold'}
      </motion.span>
    </button>
  );
}
