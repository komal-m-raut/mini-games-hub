'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { RecallResult } from '../types';
import { DigitSlots } from './DigitSlots';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: { emoji: '🏆', color: '#EAB308', message: 'You climbed all the way to par.', confetti: 'perfect' },
  Great: { emoji: '✨', color: '#06B6D4', message: 'So close to par.', confetti: 'great' },
  Good: { emoji: '👍', color: '#A78BFA', message: 'A solid climb.', confetti: 'good' },
  'Try Again': { emoji: '🔟', color: '#94A3B8', message: 'Chunk it smaller and try again.', confetti: null },
};

interface RecallResultScreenProps {
  result: RecallResult;
  accent: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function RecallResultScreen({ result, accent, nextLabel, onNext, onMenu }: RecallResultScreenProps) {
  const meta = RATING_META[result.rating];

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
        <h2 className="font-display text-4xl sm:text-5xl" style={{ color: meta.color }}>
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

        <p className="font-score text-xs text-ink-3 mt-1">
          Reached {result.reached} digit{result.reached === 1 ? '' : 's'}
        </p>
      </motion.div>

      {/* The number vs what was typed, with the matched prefix in green and
          the miss in red from the first wrong digit onward. */}
      <motion.div
        className="flex flex-col items-center gap-4 w-full"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-2xs font-ui text-ink-4 uppercase tracking-widest">The number</p>
          <DigitSlots
            length={result.target.length}
            digits={result.target}
            accent={accent}
            diffIndex={result.diffIndex}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-2xs font-ui text-ink-4 uppercase tracking-widest">Your answer</p>
          <DigitSlots
            length={result.entry.length}
            digits={result.entry}
            accent={accent}
            diffIndex={result.diffIndex}
          />
        </div>
        <div className="flex justify-center gap-4 font-ui text-2xs text-ink-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" /> Correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" /> Wrong
          </span>
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
