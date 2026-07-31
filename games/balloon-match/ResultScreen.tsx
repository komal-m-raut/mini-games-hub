'use client';

import { motion } from 'framer-motion';
import { RotateCcw, Home } from 'lucide-react';
import { GameResult, Rating } from '@/types/game';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { BalloonComparison } from './BalloonCanvas';
import { MAX_ROUND_SCORE } from '@/utils/scoring';

const RATING_META: Record<
  Rating,
  { emoji: string; color: string; glow: string; message: string; confetti: 'perfect' | 'great' | 'good' | null }
> = {
  Perfect: {
    emoji: '🏆',
    color: '#EAB308',
    glow: 'rgba(234, 179, 8, 0.5)',
    message: 'Absolutely flawless!',
    confetti: 'perfect',
  },
  Great: {
    emoji: '🎯',
    color: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.5)',
    message: 'Outstanding match!',
    confetti: 'great',
  },
  Good: {
    emoji: '👍',
    color: '#A78BFA',
    glow: 'rgba(167, 139, 250, 0.4)',
    message: 'Solid effort!',
    confetti: 'good',
  },
  'Try Again': {
    emoji: '💪',
    color: '#94A3B8',
    glow: 'rgba(148, 163, 184, 0.3)',
    message: "Keep practicing — you've got this!",
    confetti: null,
  },
};

interface ResultScreenProps {
  result: GameResult;
  targetColor: string;
  isNewHighScore: boolean;
  /** Label for the primary action, e.g. "Next Round" or "Final Results". */
  nextLabel?: string;
  onPlayAgain: () => void;
  onMenu: () => void;
}

export function ResultScreen({
  result,
  targetColor,
  isNewHighScore,
  nextLabel = 'Next Round',
  onPlayAgain,
  onMenu,
}: ResultScreenProps) {
  const meta = RATING_META[result.rating];
  // A "Try Again" is the worst rating band — never worth a celebration,
  // even if it happens to beat a fresh/low stored best (M29).
  const showHighScoreBadge = isNewHighScore && result.rating !== 'Try Again';

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {meta.confetti && (
        <ConfettiEffect trigger preset={meta.confetti} />
      )}

      {/* Rating badge */}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
      >
        <span className="text-5xl">{meta.emoji}</span>
        <h2
          className="font-display text-4xl sm:text-5xl font-bold"
          style={{ color: meta.color, textShadow: `0 0 32px ${meta.glow}` }}
        >
          {result.rating}
        </h2>
        <p className="text-white/50 font-mono text-sm mt-1">{meta.message}</p>

        {/* Round score — the one number on this screen (the top bar shows
            the running total separately), promoted under the rating word */}
        <motion.p
          className="font-score font-bold text-3xl mt-1"
          style={{ color: meta.color }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {result.score}
          <span className="text-white/50 text-lg">/{MAX_ROUND_SCORE}</span>
        </motion.p>

        {showHighScoreBadge && (
          <motion.div
            className="mt-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-xs font-mono"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            🎉 New High Score!
          </motion.div>
        )}
      </motion.div>

      {/* Balloon comparison — shows how far off the player was more
          legibly than an accuracy/difference stat row would (U7) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
        className="w-full"
      >
        <BalloonComparison
          targetUnits={result.targetSize}
          actualUnits={result.actualSize}
          color={targetColor}
        />
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
          onClick={onPlayAgain}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
          glow="rgba(124, 58, 237, 0.5)"
        >
          <RotateCcw className="w-4 h-4 shrink-0 hidden sm:block" strokeWidth={1.5} />
          {nextLabel}
        </NeonButton>
      </motion.div>
    </motion.div>
  );
}
