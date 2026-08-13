'use client';

import { motion } from 'framer-motion';
import { Home, LucideIcon, RotateCcw, Sparkles, Target, ThumbsUp } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { BlockCountResult } from '../types';

const RATING_ICON: Record<Rating, LucideIcon> = {
  Perfect: Target,
  Great: Sparkles,
  Good: ThumbsUp,
  'Try Again': RotateCcw,
};

const RATING_META: Record<Rating, { color: string; message: string }> = {
  Perfect: { color: '#EAB308', message: 'Exact count!' },
  Great: { color: '#22C55E', message: 'Very close read.' },
  Good: { color: '#38BDF8', message: 'In the right neighbourhood.' },
  'Try Again': { color: '#94A3B8', message: 'Recount in clusters next sweep.' },
};

interface BlockResultScreenProps {
  result: BlockCountResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function BlockResultScreen({ result, nextLabel, onNext, onMenu }: BlockResultScreenProps) {
  const rating = ratingFromScore(result.score);
  const meta = RATING_META[rating];
  const Icon = RATING_ICON[rating];
  const exact = result.guess === result.actual;
  const tone = { '--tone': meta.color } as React.CSSProperties;

  return (
    <motion.div
      className="flex flex-col items-center gap-5 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      role="status"
      aria-live="polite"
    >
      {exact && <ConfettiEffect trigger preset="perfect" />}

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
          className="neon-text font-display text-4xl sm:text-5xl leading-none"
          style={{ color: meta.color, '--neon': meta.color } as React.CSSProperties}
        >
          {rating}
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

      {/* Your guess vs the true count — the number that actually explains
          the score above. */}
      <motion.div
        className="flex items-center justify-center gap-6 sm:gap-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <div className="flex flex-col items-center gap-1">
          <p className="text-2xs text-ink-3 font-ui uppercase tracking-widest">Your guess</p>
          <p className="font-score text-3xl leading-none">{result.guess}</p>
        </div>
        <div className="w-px h-10 bg-white/10" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-2xs text-ink-3 font-ui uppercase tracking-widest">Actual reds</p>
          <p className="font-score text-3xl leading-none" style={{ color: '#EF4444' }}>
            {result.actual}
          </p>
        </div>
      </motion.div>

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
        >
          {nextLabel}
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}
