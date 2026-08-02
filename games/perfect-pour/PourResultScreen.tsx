'use client';

import { motion } from 'framer-motion';
import { Home, RotateCcw } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { GlassComparison } from './GlassCanvas';
import { PourResult } from './types';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    emoji: '🏆',
    color: '#EAB308',
    message: 'Not a drop wasted!',
    confetti: 'perfect',
  },
  Great: {
    emoji: '🎯',
    color: '#06B6D4',
    message: 'Beautifully steady.',
    confetti: 'great',
  },
  Good: {
    emoji: '👍',
    color: '#A78BFA',
    message: 'Nicely poured.',
    confetti: 'good',
  },
  'Try Again': {
    emoji: '💧',
    color: '#94A3B8',
    // Direction-neutral: the old copy assumed an over-pour, which contradicted
    // an under-pour result like "6% too little" (H4). The glass comparison
    // already shows which way the player missed.
    message: 'Not quite — try again.',
    confetti: null,
  },
};

interface PourResultScreenProps {
  result: PourResult;
  liquidColor: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function PourResultScreen({
  result,
  liquidColor,
  nextLabel,
  onNext,
  onMenu,
}: PourResultScreenProps) {
  const meta = RATING_META[result.rating];

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

        {/* Round score — the one number on this screen, promoted under the
            rating word (U7); the glass comparison below shows the miss). */}
        <motion.p
          className="font-score font-bold text-3xl mt-1"
          style={{ color: meta.color }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {formatScore(result.score)}
          <span className="text-white/50 text-lg">/{MAX_ROUND_SCORE}</span>
        </motion.p>
      </motion.div>

      {/* Glass comparison */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full"
      >
        <GlassComparison
          target={result.targetFill}
          actual={result.actualFill}
          color={liquidColor}
        />
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
          <RotateCcw className="w-4 h-4 shrink-0 hidden sm:block" strokeWidth={1.5} />
          {nextLabel}
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}
