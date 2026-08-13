'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { StroopResult } from '../types';

const RATING_META: Record<
  Rating,
  { color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    color: '#EAB308',
    message: 'Total command of the interference.',
    confetti: 'perfect',
  },
  Great: {
    color: '#22D3EE',
    message: 'Fast, and mostly right.',
    confetti: 'good',
  },
  Good: {
    color: '#A78BFA',
    message: 'Solid — a little more accuracy is there for the taking.',
    confetti: null,
  },
  'Try Again': {
    color: '#94A3B8',
    message: 'The word keeps winning — slow down a touch and try again.',
    confetti: null,
  },
};

interface StroopResultScreenProps {
  result: StroopResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** Between-rounds screen: the round score plus the raw correct/wrong/net
 *  tally it was scored from, against that difficulty's par. */
export function StroopResultScreen({ result, nextLabel, onNext, onMenu }: StroopResultScreenProps) {
  const meta = RATING_META[result.rating];

  return (
    <motion.div
      className="flex flex-col items-center gap-5 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      {meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.08 }}
      >
        <h2 className="font-display text-3xl sm:text-4xl" style={{ color: meta.color }}>
          {result.rating}
        </h2>
        <p className="text-ink-3 font-ui text-sm text-center px-2">{meta.message}</p>
      </motion.div>

      <motion.p
        className="font-score text-4xl leading-none"
        style={{ color: meta.color }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        {formatScore(result.score)}
        <span className="text-ink-3 text-xl">/{MAX_ROUND_SCORE}</span>
      </motion.p>

      <motion.div
        className="flex gap-3 sm:gap-4 w-full max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="stat-card flex-1">
          <p className="stat-label">Correct</p>
          <p className="stat-value text-green-400">{result.correct}</p>
        </div>
        <div className="stat-card flex-1">
          <p className="stat-label">Wrong</p>
          <p className="stat-value text-red-400">{result.wrong}</p>
        </div>
        <div className="stat-card flex-1">
          <p className="stat-label">Net</p>
          <p className="stat-value" style={{ color: meta.color }}>
            {result.net}
            <span className="text-ink-4 text-xs">/{result.par}</span>
          </p>
        </div>
      </motion.div>

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
