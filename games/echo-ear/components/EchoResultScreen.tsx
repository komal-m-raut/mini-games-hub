'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Home, Volume2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { EchoResult } from '../types';
import { PitchOffsetDial } from './PitchOffsetDial';

const RATING_META: Record<Rating, { emoji: string; color: string; message: string }> = {
  Perfect: { emoji: '🎯', color: '#EAB308', message: 'Dead on pitch.' },
  Great: { emoji: '🎶', color: '#A78BFA', message: 'Barely a shade off.' },
  Good: { emoji: '👂', color: '#14B8A6', message: 'Right neighbourhood, not quite the note.' },
  'Try Again': { emoji: '🎵', color: '#94A3B8', message: 'Not quite — trust your first instinct.' },
};

const DIRECTION_WORD: Record<EchoResult['direction'], string> = {
  sharp: 'sharp',
  flat: 'flat',
  perfect: 'dead centre',
};

const EASE_STANDARD = [0.2, 0, 0, 1] as const;

interface EchoResultScreenProps {
  result: EchoResult;
  /** Cents error at which the offset dial reaches full deflection — the
   *  round's difficulty divisor * 100, the same scale the score was cut on. */
  maxCents: number;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
  /** Replays either pitch — outside the round's listen budget. */
  onPreview: (freq: number) => void;
}

export function EchoResultScreen({
  result,
  maxCents,
  nextLabel,
  onNext,
  onMenu,
  onPreview,
}: EchoResultScreenProps) {
  const meta = RATING_META[result.rating];
  const reducedMotion = useReducedMotion();
  const signedCents =
    result.direction === 'flat' ? -result.cents : result.direction === 'sharp' ? result.cents : 0;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-5 w-full"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_STANDARD }}
    >
      {result.rating === 'Perfect' && <ConfettiEffect trigger preset="perfect" />}

      <PitchOffsetDial cents={signedCents} maxCents={maxCents} color={meta.color} />

      {/* Accuracy is the headline number — biggest element on the screen,
          with the round score and rating demoted to supporting lines. */}
      <motion.p
        className="font-score text-6xl sm:text-7xl leading-none -mt-2"
        style={{ color: meta.color }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.25, ease: EASE_STANDARD }}
      >
        {Math.round(result.accuracy)}
        <span className="text-3xl text-ink-3">%</span>
      </motion.p>

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.25, ease: EASE_STANDARD }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xl" aria-hidden="true">
            {meta.emoji}
          </span>
          <h2 className="font-display text-2xl sm:text-3xl" style={{ color: meta.color }}>
            {result.rating}
          </h2>
        </div>
        <p className="text-ink-3 font-ui text-sm">{meta.message}</p>
        <p className="text-ink-4 font-ui text-xs mt-1">
          {formatScore(result.score)}/{MAX_ROUND_SCORE} score · {result.cents.toFixed(1)}¢{' '}
          {DIRECTION_WORD[result.direction]}
        </p>
      </motion.div>

      {/* Both pitches, replayable for comparison — the round is already
          scored, so this sits outside the listen/replay budget. One soft
          container split by a hairline, not two separate cards. */}
      <motion.div
        className="flex items-stretch w-full max-w-sm rounded-2xl overflow-hidden bg-white/[0.035] border border-white/[0.08] mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.25 }}
      >
        <button
          onClick={() => onPreview(result.target)}
          className="flex-1 flex flex-col items-center gap-1 py-4 min-h-[64px] justify-center transition-transform active:scale-[0.97]"
        >
          <span className="flex items-center gap-1.5 text-2xs font-ui uppercase tracking-widest text-ink-3">
            <Volume2 className="w-3.5 h-3.5" strokeWidth={2} /> Target
          </span>
          <span className="font-display text-base font-semibold text-ink-1">
            {result.target.toFixed(1)} Hz
          </span>
        </button>
        <div className="w-px bg-white/[0.08]" aria-hidden="true" />
        <button
          onClick={() => onPreview(result.guess)}
          className="flex-1 flex flex-col items-center gap-1 py-4 min-h-[64px] justify-center transition-transform active:scale-[0.97]"
        >
          <span className="flex items-center gap-1.5 text-2xs font-ui uppercase tracking-widest text-ink-3">
            <Volume2 className="w-3.5 h-3.5" strokeWidth={2} /> Yours
          </span>
          <span className="font-display text-base font-semibold text-ink-1">
            {result.guess.toFixed(1)} Hz
          </span>
        </button>
      </motion.div>

      <motion.div
        className="flex gap-3 w-full max-w-sm mt-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.25, ease: EASE_STANDARD }}
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
