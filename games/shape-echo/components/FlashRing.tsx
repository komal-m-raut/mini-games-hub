'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface FlashRingProps {
  /** Total flash duration, seconds — drives the ring's drain animation. */
  totalSeconds: number;
  /** Whole seconds left, for the numeric label. */
  timeLeft: number;
  /** Bumped on every flash (re)start so the ring's animation replays. */
  flashKey: number;
  color: string;
}

/**
 * Draining countdown ring shown while the target shape is memorised. Under
 * `prefers-reduced-motion` the ring itself is skipped entirely — only the
 * numeric countdown remains — rather than just speeding it up, since a
 * flash this short (1.5-2.5s) has little animation to tone down.
 */
export function FlashRing({ totalSeconds, timeLeft, flashKey, color }: FlashRingProps) {
  const reducedMotion = useReducedMotion();
  const r = 26;
  const stroke = 4;
  const circumference = 2 * Math.PI * r;
  const viewBoxSize = (r + stroke) * 2 + 4;
  const cx = viewBoxSize / 2;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-ui text-ink-3 uppercase tracking-widest">Memorise</p>
      <div className="relative" style={{ width: viewBoxSize, height: viewBoxSize }}>
        {!reducedMotion && (
          <svg width={viewBoxSize} height={viewBoxSize} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}>
            <circle
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={stroke}
            />
            <motion.circle
              key={flashKey}
              cx={cx}
              cy={cx}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: 0 }}
              animate={{ strokeDashoffset: circumference }}
              transition={{ duration: totalSeconds, ease: 'linear' }}
              style={{ rotate: -90, transformOrigin: `${cx}px ${cx}px` }}
            />
          </svg>
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-2xl" style={{ color }}>
            {timeLeft}
          </span>
        </div>
      </div>
    </div>
  );
}
