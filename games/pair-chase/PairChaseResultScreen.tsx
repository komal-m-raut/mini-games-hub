'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { PairChaseResult } from './types';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    emoji: '🏆',
    color: '#EAB308',
    message: 'Clean sweep — barely a wasted flip.',
    confetti: 'perfect',
  },
  Great: {
    emoji: '✨',
    color: '#06B6D4',
    message: 'Sharp recall.',
    confetti: 'great',
  },
  Good: {
    emoji: '👍',
    color: '#A78BFA',
    message: 'Solid clear.',
    confetti: 'good',
  },
  'Try Again': {
    emoji: '🔁',
    color: '#94A3B8',
    message: 'Scan the board a little longer next time.',
    confetti: null,
  },
};

function formatElapsed(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

interface PairChaseResultScreenProps {
  result: PairChaseResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function PairChaseResultScreen({ result, nextLabel, onNext, onMenu }: PairChaseResultScreenProps) {
  const rating = ratingFromScore(result.score);
  const meta = RATING_META[rating];

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

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
          {rating}
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

        <p className="font-score text-xs text-ink-3 mt-1">
          {result.flips} flips · {formatElapsed(result.elapsedSeconds)}
        </p>
      </motion.div>

      <motion.div
        className="flex gap-3 w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
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
