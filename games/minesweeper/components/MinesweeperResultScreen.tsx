'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { MinesweeperResult } from '../types';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: { emoji: '🏆', color: '#EAB308', confetti: 'perfect' },
  Great: { emoji: '✨', color: '#06B6D4', confetti: 'great' },
  Good: { emoji: '👍', color: '#A78BFA', confetti: 'good' },
  'Try Again': { emoji: '🔁', color: '#94A3B8', confetti: null },
};

function formatElapsed(seconds: number): string {
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

interface MinesweeperResultScreenProps {
  result: MinesweeperResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function MinesweeperResultScreen({
  result,
  nextLabel,
  onNext,
  onMenu,
}: MinesweeperResultScreenProps) {
  const rating = ratingFromScore(result.score);
  const meta = RATING_META[rating];
  const headline = result.won ? 'Cleared!' : 'Boom.';
  const message = result.won
    ? `Board cleared in ${formatElapsed(result.timeSeconds)}.`
    : `Hit a mine — ${result.safeRevealed}/${result.safeTotal} safe cells found first.`;

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {result.won && meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
      >
        <span className="text-5xl">{result.won ? meta.emoji : '💥'}</span>
        <h2
          className="neon-text font-display text-4xl sm:text-5xl"
          style={{ color: result.won ? meta.color : '#EF4444', '--neon': result.won ? meta.color : '#EF4444' } as React.CSSProperties}
        >
          {headline}
        </h2>
        <p className="text-ink-3 font-ui text-sm mt-1">{message}</p>

        <motion.p
          className="font-score text-3xl mt-1"
          style={{ color: result.won ? meta.color : '#EF4444' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {formatScore(result.score)}
          <span className="text-ink-3 text-lg">/{MAX_ROUND_SCORE}</span>
        </motion.p>
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
