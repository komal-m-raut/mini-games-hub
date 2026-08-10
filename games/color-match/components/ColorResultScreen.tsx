'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { AMAZING_ACCURACY } from '../constants';
import { ColorRating, ColorResult } from '../types';
import { ColorPanel } from './ColorPanel';
import { ParticleBurst } from './ParticleBurst';

const RATING_META: Record<ColorRating, { emoji: string; color: string; message: string }> = {
  Perfect: { emoji: '🏆', color: '#EAB308', message: 'That is the exact colour.' },
  Amazing: { emoji: '✨', color: '#22D3EE', message: 'Your eye is unreal.' },
  Great: { emoji: '🎯', color: '#A78BFA', message: 'So close you can barely tell.' },
  Good: { emoji: '👍', color: '#14B8A6', message: 'Right family, slightly off shade.' },
  'Try Again': { emoji: '🎨', color: '#94A3B8', message: 'Not quite — trust your first instinct.' },
};

interface ColorResultScreenProps {
  result: ColorResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

export function ColorResultScreen({
  result,
  nextLabel,
  onNext,
  onMenu,
}: ColorResultScreenProps) {
  const meta = RATING_META[result.rating];
  const excellent = result.accuracy >= AMAZING_ACCURACY;
  const prefersReducedMotion = useReducedMotion();

  // The swatches start stacked and part to reveal the comparison. Delay is
  // collapsed once the motion preference resolves (it is null on first render).
  const [split, setSplit] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSplit(true), prefersReducedMotion ? 0 : 380);
    return () => clearTimeout(id);
  }, [prefersReducedMotion]);

  return (
    <motion.div
      className="relative flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {result.rating === 'Perfect' && <ConfettiEffect trigger preset="perfect" />}
      {excellent && <ParticleBurst color={result.actual} />}

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

      {/* The score is the only number here; the swatches below show the miss. */}
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
        className="flex items-start justify-center gap-4 sm:gap-6 w-full max-w-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <motion.div
          className="flex-1 min-w-0"
          animate={{ x: split ? 0 : '52%' }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        >
          <ColorPanel color={result.target} label="Target" size="sm" />
        </motion.div>
        <motion.div
          className="flex-1 min-w-0"
          animate={{ x: split ? 0 : '-52%' }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
        >
          <ColorPanel color={result.actual} label="Yours" size="sm" />
        </motion.div>
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
