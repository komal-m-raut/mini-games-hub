'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { DartResult } from '../types';

const RATING_META: Record<
  Rating,
  { message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: { message: 'A grouped, dead-centre round.', confetti: 'perfect' },
  Great: { message: 'Sharp reads on both axes.', confetti: 'great' },
  Good: { message: 'Solid grouping — keep tightening it up.', confetti: 'good' },
  'Try Again': { message: 'Scattered — watch a full swing before locking.', confetti: null },
};

interface RoundResultScreenProps {
  darts: DartResult[];
  score: number;
  roundAccuracy: number;
  accent: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function RoundResultScreen({
  darts,
  score,
  roundAccuracy,
  accent,
  nextLabel,
  onNext,
  onMenu,
}: RoundResultScreenProps) {
  const reducedMotion = useReducedMotion();
  const rating = ratingFromScore(score);
  const meta = RATING_META[rating];

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      {meta.confetti && <ConfettiEffect trigger preset={meta.confetti} />}

      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.08 }}
      >
        <h2
          className="neon-text font-display text-4xl sm:text-5xl leading-none"
          style={{ color: accent, '--neon': accent } as React.CSSProperties}
        >
          {rating}
        </h2>
        <p className="text-ink-3 font-ui text-sm text-center px-2">{meta.message}</p>
      </motion.div>

      <motion.p
        className="font-score text-4xl leading-none"
        style={{ color: accent }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        {formatScore(score)}
        <span className="text-ink-3 text-xl">/{MAX_ROUND_SCORE}</span>
      </motion.p>

      {/* Five ring badges: the round's whole story at a glance. */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        {darts.map((d, i) => (
          <span
            key={i}
            className="grid place-items-center w-9 h-9 rounded-full text-2xs font-ui border"
            style={{
              color: d.ring === 'MISS' ? '#64748B' : accent,
              borderColor: d.ring === 'MISS' ? 'rgba(100,116,139,0.4)' : `${accent}55`,
              background: d.ring === 'MISS' ? 'rgba(100,116,139,0.1)' : `${accent}15`,
            }}
          >
            {d.ring === 'BULLSEYE' ? '🎯' : d.ring === 'MISS' ? '×' : d.ring}
          </span>
        ))}
      </motion.div>

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.34, duration: reducedMotion ? 0 : undefined }}
      >
        <p className="font-ui text-sm text-ink-2">
          Round accuracy <b style={{ color: accent }}>{roundAccuracy.toFixed(1)}%</b>
        </p>
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
