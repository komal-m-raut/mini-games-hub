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

/**
 * The single giant press-and-hold control of the RECREATE phase — sized to
 * dominate the thumb zone on mobile. Pressed state is a tactile scale +
 * inner shadow + darkening, identical in shape across every difficulty;
 * only Easy layers a glow on top, and that glow is driven by a fixed
 * saturation clock (never the round's own target), so nothing rendered
 * here can leak the answer on Medium/Hard.
 */
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
    <motion.button
      type="button"
      {...holdHandlers}
      aria-label={
        isHolding ? 'Release to lock in your hold' : 'Press and hold to recreate the duration'
      }
      aria-pressed={isHolding}
      className="relative grid place-items-center rounded-full font-display shrink-0"
      style={{
        ...holdHandlers.style,
        width: 'clamp(200px, 55vw, 280px)',
        height: 'clamp(200px, 55vw, 280px)',
        fontSize: 'clamp(1.05rem, 4.5vw, 1.3rem)',
        color: isHolding ? '#fff' : 'var(--color-ink-1)',
        background: isHolding
          ? `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${accent} 32%, #0B0B1A), color-mix(in srgb, ${accent} 12%, #0B0B1A))`
          : `color-mix(in srgb, ${accent} 15%, var(--color-surface-1))`,
        border: `2px solid color-mix(in srgb, ${accent} ${isHolding ? 90 : 38}%, transparent)`,
        boxShadow: isHolding
          ? `inset 0 8px 24px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(0,0,0,0.25), 0 0 44px color-mix(in srgb, ${accent} 38%, transparent)`
          : '0 18px 40px -14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        transition: 'background 0.25s ease-out, border-color 0.25s ease-out, box-shadow 0.25s ease-out, color 0.25s ease-out',
      }}
      animate={{ scale: isHolding ? 0.94 : 1 }}
      transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
    >
      {showGlow && isHolding && !reducedMotion && (
        <motion.span
          aria-hidden
          className="absolute inset-[-10%] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }}
          animate={{ opacity: 0.15 + glowStrength * 0.65, scale: 0.9 + glowStrength * 0.3 }}
          transition={{ duration: 0.05 }}
        />
      )}
      <span className="relative z-10">{isHolding ? 'Holding…' : 'Hold'}</span>
    </motion.button>
  );
}
