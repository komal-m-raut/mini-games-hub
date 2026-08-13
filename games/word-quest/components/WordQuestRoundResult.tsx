'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { MAX_GUESSES } from '../constants';
import { WordQuestRoundResult as RoundResult } from '../types';
import { WordGrid } from './WordGrid';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    emoji: '🏆',
    color: '#EAB308',
    message: 'Nailed it in one.',
    confetti: 'perfect',
  },
  Great: {
    emoji: '✨',
    color: '#34D399',
    message: 'Sharp guessing.',
    confetti: 'great',
  },
  Good: {
    emoji: '👍',
    color: '#22D3EE',
    message: 'Got there in the end.',
    confetti: 'good',
  },
  'Try Again': {
    emoji: '🔁',
    color: '#94A3B8',
    message: 'The word wins this round.',
    confetti: null,
  },
};

interface WordQuestRoundResultProps {
  result: RoundResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** Between-rounds screen for the challenge flow: word revealed, this
 *  round's guess grid, score, and a Next button — the Word Quest analogue
 *  of every other game's `*ResultScreen`. */
export function WordQuestRoundResult({ result, nextLabel, onNext, onMenu }: WordQuestRoundResultProps) {
  const meta = RATING_META[result.rating];

  return (
    <motion.div
      className="flex flex-col items-center gap-5 w-full"
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
          {result.rating}
        </h2>
        <p className="text-ink-3 font-ui text-sm mt-1">{meta.message}</p>
        <p
          className="font-display text-xl sm:text-2xl uppercase tracking-[0.2em] mt-3"
          style={{ color: meta.color }}
        >
          {result.answer}
        </p>
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
          {result.solvedIn !== null
            ? `Solved in ${result.solvedIn}/${MAX_GUESSES}`
            : `Not solved in ${MAX_GUESSES}`}
        </p>
      </motion.div>

      <WordGrid rows={result.rows} currentGuess="" invalidNonce={0} solved={false} />

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
