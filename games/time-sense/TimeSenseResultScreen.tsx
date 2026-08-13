'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { formatSeconds, formatSignedError } from './constants';
import { TimeSenseResult } from './types';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    emoji: '🎯',
    color: '#EAB308',
    message: 'Your internal clock is scary good.',
    confetti: 'perfect',
  },
  Great: {
    emoji: '⏱️',
    color: '#06B6D4',
    message: 'Right on the beat.',
    confetti: 'great',
  },
  Good: {
    emoji: '👍',
    color: '#A78BFA',
    message: 'Close — keep counting.',
    confetti: 'good',
  },
  'Try Again': {
    emoji: '🌀',
    color: '#94A3B8',
    message: 'Reset and feel it again.',
    confetti: null,
  },
};

interface TimeSenseResultScreenProps {
  result: TimeSenseResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function TimeSenseResultScreen({ result, nextLabel, onNext, onMenu }: TimeSenseResultScreenProps) {
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
          className="neon-text font-display text-4xl sm:text-5xl"
          style={{ color: meta.color, '--neon': meta.color } as React.CSSProperties}
        >
          {result.rating}
        </h2>
        <p className="text-ink-3 font-ui text-sm mt-1">{meta.message}</p>

        <motion.p
          className="font-score text-3xl mt-1"
          style={{ color: meta.color }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {formatScore(result.score)}
          <span className="text-ink-3 text-lg">/{MAX_ROUND_SCORE}</span>
        </motion.p>
      </motion.div>

      {/* Target vs held, and the signed miss */}
      <motion.div
        className="stat-card w-full max-w-sm flex flex-col gap-2 px-5 py-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex justify-between text-sm font-ui text-ink-2">
          <span>Target</span>
          <span className="font-score">{formatSeconds(result.targetMs)}</span>
        </div>
        <div className="flex justify-between text-sm font-ui text-ink-2">
          <span>You held</span>
          <span className="font-score">{formatSeconds(result.heldMs)}</span>
        </div>
        <div
          className="flex justify-between text-sm font-ui border-t border-white/10 pt-2 mt-1"
          style={{ color: meta.color }}
        >
          <span>Miss</span>
          <span className="font-score">{formatSignedError(result.errorMs)}</span>
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
        >
          {nextLabel}
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}
