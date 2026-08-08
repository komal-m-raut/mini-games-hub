'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Home, LucideIcon, RotateCcw, Sparkles, Target, ThumbsUp, Zap } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { TAP_RATING_META } from './ratings';
import { TapRating, TapResult } from './types';

/** One icon family (Lucide) across the app — emoji render differently on
 *  every platform and can't take the rating's colour. */
const RATING_ICON: Record<TapRating, LucideIcon> = {
  Perfect: Target,
  Amazing: Zap,
  Great: Sparkles,
  Good: ThumbsUp,
  'Try Again': RotateCcw,
};

/**
 * Accuracy is defined so that the edge of the Perfect Zone always scores
 * exactly 90, whatever the difficulty's zone width — so a single tick at
 * 90% marks "inside the zone" on every board.
 */
const ZONE_EDGE_ACCURACY = 90;

export interface TapResultScreenProps {
  result: TapResult;
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

export function TapResultScreen({ result, nextLabel, onNext, onMenu }: TapResultScreenProps) {
  const meta = TAP_RATING_META[result.rating];
  const Icon = RATING_ICON[result.rating];
  const reducedMotion = useReducedMotion();
  const displayScore = useCountUp(result.score, Boolean(reducedMotion));
  const tone = { '--tone': meta.color } as React.CSSProperties;

  return (
    <motion.div
      className="flex flex-col items-center gap-5 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      {meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

      {/* Rating */}
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.08 }}
      >
        <span className="rating-badge" style={tone}>
          <Icon className="w-7 h-7" strokeWidth={1.75} aria-hidden />
        </span>
        <h2
          className="neon-text font-display text-4xl sm:text-5xl font-bold leading-none"
          style={{ color: meta.color, '--neon': meta.color } as React.CSSProperties}
        >
          {result.rating}
        </h2>
        <p className="text-white/60 font-ui text-sm text-center px-2">{meta.message}</p>
      </motion.div>

      {/* Round score — springs in with the rating, then counts up to its
          final value so a Perfect doesn't just pop straight to "10". */}
      <motion.p
        className="font-score font-bold text-4xl leading-none"
        style={{ color: meta.color }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        {formatScore(displayScore)}
        <span className="text-white/55 text-xl">/{MAX_ROUND_SCORE}</span>
      </motion.p>

      {/* Accuracy meter — the same two numbers the stat boxes used to hold,
          but placed on a scale so "34.6%" and "98.2%" actually look
          different rather than reading as two similar figures. */}
      <motion.div
        className="tap-meter"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="tap-meter__track">
          <span className="tap-meter__zone" style={{ left: `${ZONE_EDGE_ACCURACY}%` }} />
          <motion.span
            className="tap-meter__fill"
            style={tone}
            initial={{ width: 0 }}
            animate={{ width: `${result.accuracy}%` }}
            transition={{ delay: 0.3, duration: reducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <div className="tap-meter__legend">
          <span>
            Accuracy{' '}
            <b style={{ color: meta.color }}>{result.accuracy.toFixed(1)}%</b>
          </span>
          <span>{result.distance.toFixed(1)}% off centre</span>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3 w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
