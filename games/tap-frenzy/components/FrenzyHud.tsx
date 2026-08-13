'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Target as TargetIcon, Timer } from 'lucide-react';
import { COMBO_FLAME_THRESHOLD } from '../constants';

interface FrenzyHudProps {
  timeLeft: number;
  hits: number;
  combo: number;
}

/** Live readout during the 30s round: time left, hits so far, and the
 *  current combo — lit up with a flame once it climbs past the threshold. */
export function FrenzyHud({ timeLeft, hits, combo }: FrenzyHudProps) {
  const reducedMotion = useReducedMotion();
  const onFire = combo >= COMBO_FLAME_THRESHOLD;
  const urgent = timeLeft <= 5;

  return (
    <div className="flex items-center justify-center gap-5 sm:gap-7 font-ui text-sm">
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xs text-ink-3 uppercase tracking-wide">Time</span>
        <span
          className="font-score text-xl tabular-nums leading-none flex items-center gap-1"
          style={{ color: urgent ? '#EF4444' : undefined }}
        >
          <Timer className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />
          {timeLeft}s
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xs text-ink-3 uppercase tracking-wide">Hits</span>
        <span className="font-score text-xl tabular-nums leading-none flex items-center gap-1">
          <TargetIcon className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.75} aria-hidden />
          {hits}
        </span>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xs text-ink-3 uppercase tracking-wide">Combo</span>
        <motion.span
          className="font-score text-xl tabular-nums leading-none flex items-center gap-1"
          style={{ color: onFire ? '#F97316' : undefined }}
          animate={onFire && !reducedMotion ? { scale: [1, 1.14, 1] } : { scale: 1 }}
          transition={onFire && !reducedMotion ? { duration: 0.55, repeat: Infinity, ease: 'easeInOut' } : undefined}
        >
          {onFire && <Flame className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden />}×{combo}
        </motion.span>
      </div>
    </div>
  );
}
