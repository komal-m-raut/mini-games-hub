'use client';

import { motion } from 'framer-motion';
import { Home, LucideIcon, RotateCcw, Sparkles, Target, ThumbsUp } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';

const RATING_ICON: Record<Rating, LucideIcon> = {
  Perfect: Target,
  Great: Sparkles,
  Good: ThumbsUp,
  'Try Again': RotateCcw,
};

const RATING_META: Record<Rating, { color: string; message: string }> = {
  Perfect: { color: '#EAB308', message: '25+ food — a flawless round.' },
  Great: { color: '#22C55E', message: 'A strong run at the food.' },
  Good: { color: '#38BDF8', message: 'Solid — bank a little faster next time.' },
  'Try Again': { color: '#94A3B8', message: 'Hug the walls and take it slow early.' },
};

interface SnakeRoundResultProps {
  foodEaten: number;
  score: number;
  survivedFullRound: boolean;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** Challenge round summary — one round of the 3-round sprint just ended,
 *  either by death (foodEaten banked as-is) or by surviving the full 60s. */
export function SnakeRoundResult({
  foodEaten,
  score,
  survivedFullRound,
  nextLabel,
  onNext,
  onMenu,
}: SnakeRoundResultProps) {
  const rating = ratingFromScore(score);
  const meta = RATING_META[rating];
  const Icon = RATING_ICON[rating];

  return (
    <motion.div
      className="flex flex-col items-center gap-5 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
      role="status"
      aria-live="polite"
    >
      {rating === 'Perfect' && <ConfettiEffect trigger preset="perfect" />}

      <motion.div
        className="flex flex-col items-center gap-2"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.08 }}
      >
        <span className="rating-badge" style={{ '--tone': meta.color } as React.CSSProperties}>
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
        {formatScore(score)}
        <span className="text-ink-3 text-xl">/{MAX_ROUND_SCORE}</span>
      </motion.p>

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <p className="text-2xs text-ink-3 font-ui uppercase tracking-widest">Food eaten</p>
        <p className="font-score text-3xl leading-none">{foodEaten}</p>
        <p className="text-ink-4 text-xs font-ui mt-1">
          {survivedFullRound ? 'Survived the full round' : 'Banked at the moment you died'}
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
          Restart
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
