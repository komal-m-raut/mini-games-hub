'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { TapRating, TapResult } from './types';

const RATING_META: Record<
  TapRating,
  { emoji: string; color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    emoji: '🎯',
    color: '#EAB308',
    message: 'Dead centre — flawless timing!',
    confetti: 'perfect',
  },
  Amazing: {
    emoji: '⚡',
    color: '#F97316',
    message: 'Lightning-fast reflexes.',
    confetti: 'great',
  },
  Great: {
    emoji: '✨',
    color: '#06B6D4',
    message: 'Sharp timing.',
    confetti: 'good',
  },
  Good: {
    emoji: '👍',
    color: '#A78BFA',
    message: 'Decent tap.',
    confetti: null,
  },
  'Try Again': {
    emoji: '🔁',
    color: '#94A3B8',
    message: 'Watch the sweep and try again.',
    confetti: null,
  },
};

export interface TapResultScreenProps {
  result: TapResult;
  beam: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/**
 * Ramps 0 → target on a rAF loop, eased out. Kept local since the repo has
 * no shared counting-number helper; skipped entirely under reduced motion.
 */
function useCountUp(target: number, skip: boolean, delayMs = 250, durationMs = 650): number {
  const [value, setValue] = useState(() => (skip ? target : 0));

  useEffect(() => {
    // The initializer above already covers the skip case for mount; nothing
    // to animate, so there's no rAF loop to set up.
    if (skip) return;
    let raf = 0;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / durationMs));
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, skip, delayMs, durationMs]);

  return value;
}

export function TapResultScreen({ result, beam, nextLabel, onNext, onMenu }: TapResultScreenProps) {
  const meta = RATING_META[result.rating];
  const reducedMotion = useReducedMotion();
  const displayScore = useCountUp(result.score, Boolean(reducedMotion));

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

      {/* Rating */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
      >
        <span className="text-5xl">{meta.emoji}</span>
        <h2
          className="neon-text font-display text-4xl sm:text-5xl font-bold"
          style={{ color: meta.color, '--neon': meta.color } as React.CSSProperties}
        >
          {result.rating}
        </h2>
        <p className="text-white/50 font-mono text-sm mt-1">{meta.message}</p>

        {/* Round score — springs in with the rating, then counts up to its
            final value so a Perfect doesn't just pop straight to "10". */}
        <motion.p
          className="font-score font-bold text-3xl mt-1"
          style={{ color: meta.color }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {formatScore(displayScore)}
          <span className="text-white/50 text-lg">/{MAX_ROUND_SCORE}</span>
        </motion.p>
      </motion.div>

      {/* Accuracy + distance-from-centre readouts */}
      <motion.div
        className="grid grid-cols-2 gap-3 w-full max-w-xs"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="stat-card">
          <p className="stat-label">Accuracy</p>
          <p className="stat-value" style={{ color: beam }}>
            {result.accuracy.toFixed(1)}%
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Distance</p>
          <p className="stat-value" style={{ color: beam }}>
            {result.distance.toFixed(1)}% off
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3 w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <NeonButton
          variant="ghost"
          size="md"
          onClick={onMenu}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Home className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          Menu
        </NeonButton>
        <NeonButton
          variant="primary"
          size="md"
          onClick={onNext}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
          glow="rgba(124, 58, 237, 0.5)"
        >
          {nextLabel}
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}
