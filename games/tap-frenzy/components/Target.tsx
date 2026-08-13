'use client';

import { motion, MotionValue, useTransform } from 'framer-motion';

export interface TargetProps {
  /** Centre, in arena px. */
  x: number;
  y: number;
  /** Starting radius, px. */
  radius: number;
  /** 0 → 1 over the target's lifetime. */
  progress: MotionValue<number>;
  /** Reduced motion trades the shrink for a fixed-size ring that fades
   *  instead — same lifetime, same fairness, no continuous size change. */
  reducedMotion: boolean;
  color: string;
  onHit: () => void;
}

/**
 * The one live target. Hit detection is state-based (see useTapFrenzyGame's
 * `hit()` / `resolveMiss()`, gated by `resolvedRef`) — this component only
 * renders the current shrink/fade progress and forwards a raw pointerdown,
 * it never itself decides hit vs. miss from where the animation happens to
 * be. `progress` drives `scale`/`opacity` directly via useTransform so 60fps
 * updates never touch React state or trigger a re-render.
 */
export function Target({ x, y, radius, progress, reducedMotion, color, onHit }: TargetProps) {
  const scale = useTransform(progress, (p) => (reducedMotion ? 1 : Math.max(0.001, 1 - p)));
  const opacity = useTransform(progress, (p) => (reducedMotion ? 1 - p * 0.68 : 1));
  const diameter = radius * 2;

  return (
    <motion.button
      type="button"
      aria-label="Target"
      onPointerDown={(e) => {
        e.stopPropagation();
        onHit();
      }}
      className="absolute rounded-full"
      style={{
        left: x - radius,
        top: y - radius,
        width: diameter,
        height: diameter,
        scale,
        opacity,
        touchAction: 'none',
        background: `radial-gradient(circle at 35% 30%, ${color}f0, ${color}b0 55%, ${color}70)`,
        boxShadow: `0 0 22px ${color}80, 0 0 3px ${color}`,
        border: `2px solid ${color}dd`,
      }}
    />
  );
}
