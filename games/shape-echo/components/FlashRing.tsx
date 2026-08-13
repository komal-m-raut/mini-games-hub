'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FlashRingProps {
  /** Total flash duration, seconds — drives the ring's drain animation. */
  totalSeconds: number;
  /** Whole seconds left, for the numeric label. */
  timeLeft: number;
  /** Bumped on every flash (re)start so the ring's animation replays. */
  flashKey: number;
  color: string;
  className?: string;
}

/**
 * Thin countdown ring meant to sit tucked in a corner of the stage, not a
 * chunky bar and not a second "Memorise" label — the phase heading already
 * says that, so this carries only the number. Under `prefers-reduced-motion`
 * the draining stroke is skipped entirely — only the numeral remains —
 * rather than just speeding it up, since a flash this short (1.5-2.5s) has
 * little animation to tone down.
 */
export function FlashRing({ totalSeconds, timeLeft, flashKey, color, className }: FlashRingProps) {
  const reducedMotion = useReducedMotion();
  const r = 15;
  const stroke = 2.5;
  const circumference = 2 * Math.PI * r;
  const size = (r + stroke) * 2 + 4;
  const c = size / 2;

  return (
    <div className={cn('pointer-events-none', className)} style={{ width: size, height: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="rgba(8, 8, 24, 0.6)"
            stroke="rgba(255, 255, 255, 0.14)"
            strokeWidth={stroke}
          />
          {!reducedMotion && (
            <motion.circle
              key={flashKey}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: circumference }}
              transition={{ duration: totalSeconds, ease: 'linear' }}
              style={{ rotate: -90, transformOrigin: `${c}px ${c}px` }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-score text-xs" style={{ color }}>
            {timeLeft}
          </span>
        </div>
      </div>
      <span className="sr-only">{timeLeft} seconds left to memorise</span>
    </div>
  );
}
