'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { PathGrid } from './PathGrid';
import { Cell } from './pathGen';
import { PathResult } from './types';

const RATING_META: Record<
  Rating,
  {
    emoji: string;
    color: string;
    message: string;
    confetti: 'perfect' | 'great' | 'good' | null;
  }
> = {
  Perfect: {
    emoji: '🏆',
    color: '#EAB308',
    message: 'Every step, exactly right.',
    confetti: 'perfect',
  },
  Great: {
    emoji: '✨',
    color: '#06B6D4',
    message: 'Almost the whole path.',
    confetti: 'great',
  },
  Good: {
    emoji: '👍',
    color: '#A78BFA',
    message: 'Solid recall.',
    confetti: 'good',
  },
  'Try Again': {
    emoji: '🧭',
    color: '#94A3B8',
    message: 'Follow the glow a little longer.',
    confetti: null,
  },
};

interface PathResultScreenProps {
  result: PathResult;
  /** The path the player was asked to reproduce. */
  path: Cell[];
  traced: Cell[];
  size: number;
  neon: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function PathResultScreen({
  result,
  path,
  traced,
  size,
  neon,
  nextLabel,
  onNext,
  onMenu,
}: PathResultScreenProps) {
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
            rating word (U7). Accuracy/correct/mistakes are dropped: the grid
            below already shows right/wrong/missed cells more legibly than a
            stat row would. */}
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

        {/* Everything the grid can't show at a glance, kept as a quiet line
            rather than its own card row. */}
        <p className="font-score text-xs text-white/40 mt-1">
          {result.mistakes === 0 ? 'No mistakes' : `${result.mistakes} mistake${result.mistakes === 1 ? '' : 's'}`}
          {' · '}
          {result.seconds.toFixed(1)}s
        </p>
      </motion.div>

      {/* The original path, with the player's trace marked right/wrong */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <PathGrid
          size={size}
          neon={neon}
          revealed={path}
          traced={traced}
          marks={result.marks}
          interactive={false}
        />
        <div className="flex justify-center gap-4 mt-3 font-mono text-[0.65rem] text-white/40">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-500/60" /> Correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/60" /> Wrong
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: `${neon}80` }} /> Missed
          </span>
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
