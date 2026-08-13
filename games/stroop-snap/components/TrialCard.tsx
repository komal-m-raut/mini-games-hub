'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { COLORS, FLASH_MS } from '../constants';
import { Trial } from '../types';

interface TrialCardProps {
  trial: Trial;
  /** Keys the word's own enter/exit animation. */
  trialIndex: number;
  lastAnswer: 'correct' | 'wrong' | null;
  /** Keys the flash overlay so it restarts on every resolved trial. */
  flashSeq: number;
}

const FLASH_COLOR: Record<'correct' | 'wrong', string> = {
  correct: '#22C55E',
  wrong: '#EF4444',
};

/**
 * The word itself: rendered in its trial's ink colour, sized to stay
 * readable from 2.5rem up to 4rem depending on viewport. A 150ms tinted
 * flash confirms the last tap without gating how fast the next trial can be
 * read — the new word is already showing underneath it.
 */
export function TrialCard({ trial, trialIndex, lastAnswer, flashSeq }: TrialCardProps) {
  const reducedMotion = useReducedMotion();
  const ink = COLORS[trial.ink];
  const flashColor = lastAnswer ? FLASH_COLOR[lastAnswer] : null;

  return (
    <div className="relative w-full flex items-center justify-center py-10 rounded-2xl overflow-hidden">
      {flashColor && (
        <motion.div
          key={flashSeq}
          className="absolute inset-0 pointer-events-none"
          style={{ background: flashColor }}
          initial={{ opacity: 0.32 }}
          animate={{ opacity: 0 }}
          transition={{ duration: FLASH_MS / 1000, ease: 'easeOut' }}
          aria-hidden
        />
      )}
      <AnimatePresence mode="wait">
        <motion.p
          key={trialIndex}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={{ duration: reducedMotion ? 0.1 : 0.16 }}
          className="font-display leading-none select-none text-[clamp(2.5rem,8vw,4rem)]"
          style={{ color: ink.hex }}
        >
          {trial.word}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
