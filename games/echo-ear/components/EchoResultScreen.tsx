'use client';

import { motion } from 'framer-motion';
import { Home, Volume2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { EchoResult } from '../types';

const RATING_META: Record<Rating, { emoji: string; color: string; message: string }> = {
  Perfect: { emoji: '🎯', color: '#EAB308', message: 'Dead on pitch.' },
  Great: { emoji: '🎶', color: '#A78BFA', message: 'Barely a shade off.' },
  Good: { emoji: '👂', color: '#14B8A6', message: 'Right neighbourhood, not quite the note.' },
  'Try Again': { emoji: '🎵', color: '#94A3B8', message: 'Not quite — trust your first instinct.' },
};

const DIRECTION_LABEL: Record<EchoResult['direction'], string> = {
  sharp: 'Sharp — you landed above the target',
  flat: 'Flat — you landed below the target',
  perfect: 'Dead centre — exact match',
};

interface EchoResultScreenProps {
  result: EchoResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
  /** Replays either pitch — outside the round's listen budget. */
  onPreview: (freq: number) => void;
}

export function EchoResultScreen({
  result,
  nextLabel,
  onNext,
  onMenu,
  onPreview,
}: EchoResultScreenProps) {
  const meta = RATING_META[result.rating];

  return (
    <motion.div
      className="relative flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {result.rating === 'Perfect' && <ConfettiEffect trigger preset="perfect" />}

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
      </motion.div>

      <motion.p
        className="font-score text-5xl sm:text-6xl leading-none"
        style={{ color: meta.color }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {formatScore(result.score)}
        <span className="text-2xl text-ink-3">/{MAX_ROUND_SCORE}</span>
      </motion.p>

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.28 }}
      >
        <p className="font-ui text-sm text-ink-2">
          Off by <span className="font-score text-ink-1">{result.cents.toFixed(1)}</span> cents
        </p>
        <p className="font-ui text-xs text-ink-3 uppercase tracking-widest">
          {DIRECTION_LABEL[result.direction]}
        </p>
      </motion.div>

      {/* Both pitches, replayable for comparison — the round is already
          scored, so this sits outside the listen/replay budget. */}
      <motion.div
        className="flex items-stretch justify-center gap-4 sm:gap-6 w-full max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <button
          onClick={() => onPreview(result.target)}
          className="stat-card flex-1 flex flex-col items-center gap-1 py-3"
        >
          <span className="stat-label flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" strokeWidth={2} /> Target
          </span>
          <span className="stat-value text-brand-purple">{result.target.toFixed(2)} Hz</span>
        </button>
        <button
          onClick={() => onPreview(result.guess)}
          className="stat-card flex-1 flex flex-col items-center gap-1 py-3"
        >
          <span className="stat-label flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" strokeWidth={2} /> Yours
          </span>
          <span className="stat-value text-brand-purple">{result.guess.toFixed(2)} Hz</span>
        </button>
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
