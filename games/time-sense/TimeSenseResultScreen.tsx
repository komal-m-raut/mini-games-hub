'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { DurationCompare } from './components/DurationCompare';
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

/** Over held too long (positive error), under released early (negative) —
 *  a warm/cool pair distinct from any difficulty accent, so the hero number
 *  always reads as "direction of the miss" at a glance. Exact borrows the
 *  Perfect rating's gold since a 0ms miss only ever happens alongside it. */
const OVER_COLOR = '#FB923C';
const UNDER_COLOR = '#38BDF8';
const EXACT_COLOR = '#EAB308';

interface TimeSenseResultScreenProps {
  result: TimeSenseResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function TimeSenseResultScreen({
  result,
  nextLabel,
  onNext,
  onMenu,
}: TimeSenseResultScreenProps) {
  const meta = RATING_META[result.rating];

  const rounded = Math.round(result.errorMs);
  const isExact = rounded === 0;
  const isOver = rounded > 0;
  const heroColor = isExact ? EXACT_COLOR : isOver ? OVER_COLOR : UNDER_COLOR;
  const heroText = isExact ? 'Exact!' : `${isOver ? '+' : '−'}${(Math.abs(rounded) / 1000).toFixed(2)}s`;
  const heroCaption = isExact ? 'Dead on the target' : isOver ? 'Held too long' : 'Released early';

  return (
    <motion.div
      className="flex flex-col items-center gap-8 w-full"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
      role="status"
      aria-live="polite"
    >
      {meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

      {/* Hero: the signed miss — the one number this screen is about */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1], delay: 0.05 }}
      >
        <span
          className="font-score leading-none tabular-nums"
          style={{ color: heroColor, fontSize: 'clamp(3rem, 14vw, 4.5rem)' }}
        >
          {heroText}
        </span>
        <p className="font-ui text-sm text-ink-3 mt-1">{heroCaption}</p>
      </motion.div>

      {/* Target vs held, to one scale */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0, 0, 1], delay: 0.15 }}
      >
        <DurationCompare targetMs={result.targetMs} heldMs={result.heldMs} heldColor={heroColor} />
      </motion.div>

      {/* Accuracy + rating — one quiet line, not a stat table */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.25 }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">{meta.emoji}</span>
          <span className="font-display text-lg" style={{ color: meta.color }}>
            {result.rating}
          </span>
        </div>
        <p className="font-ui text-sm text-ink-3">
          {result.accuracy.toFixed(1)}% accuracy · {formatScore(result.score)}/{MAX_ROUND_SCORE}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        className="flex gap-3 w-full max-w-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.35 }}
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
