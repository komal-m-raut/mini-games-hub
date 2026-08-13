'use client';

import { motion } from 'framer-motion';
import { Flame, Home, Target as TargetIcon, Timer, Zap } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { RoundResult } from '../types';

export interface FrenzyResultScreenProps {
  result: RoundResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** Round-end breakdown: score, hits, hit rate, average reaction time and
 *  the best combo reached — the same numbers `scoreRound` was computed
 *  from, laid out so the score is never a mystery. */
export function FrenzyResultScreen({ result, nextLabel, onNext, onMenu }: FrenzyResultScreenProps) {
  const rating = ratingFromScore(result.score);
  const hitPct = Math.round(result.hitRate * 100);

  return (
    <motion.div
      className="flex flex-col items-center gap-5 w-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 22 }}
    >
      {result.score >= 8 && <ConfettiEffect trigger preset={result.score >= 9.5 ? 'perfect' : 'great'} />}

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.6 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.08 }}
      >
        <p className="font-ui text-xs text-ink-3 uppercase tracking-widest">{rating}</p>
        <p className="font-score text-4xl leading-none">
          {formatScore(result.score)}
          <span className="text-ink-3 text-xl">/{MAX_ROUND_SCORE}</span>
        </p>
      </motion.div>

      {/* Hit-rate meter */}
      <motion.div
        className="w-full max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
      >
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-brand-yellow"
            initial={{ width: 0 }}
            animate={{ width: `${hitPct}%` }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
        <p className="mt-1.5 text-center text-xs text-ink-3 font-ui">
          {result.hits}/{result.spawned} hit · {hitPct}%
        </p>
      </motion.div>

      {/* Stat breakdown */}
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
        <div className="stat-card px-4">
          <p className="stat-label flex items-center gap-1 justify-center">
            <TargetIcon className="w-3 h-3" strokeWidth={2} aria-hidden />
            Hits
          </p>
          <p className="stat-value text-brand-purple">{result.hits}</p>
        </div>
        <div className="stat-card px-4">
          <p className="stat-label flex items-center gap-1 justify-center">
            <Timer className="w-3 h-3" strokeWidth={2} aria-hidden />
            Avg Speed
          </p>
          <p className="stat-value text-brand-purple">
            {result.hits > 0 ? `${Math.round(result.meanHitMs)}ms` : '—'}
          </p>
        </div>
        <div className="stat-card px-4">
          <p className="stat-label flex items-center gap-1 justify-center">
            <Flame className="w-3 h-3" strokeWidth={2} aria-hidden />
            Best Combo
          </p>
          <p className="stat-value text-brand-purple">×{result.bestCombo}</p>
        </div>
        <div className="stat-card px-4">
          <p className="stat-label flex items-center gap-1 justify-center">
            <Zap className="w-3 h-3" strokeWidth={2} aria-hidden />
            Spawned
          </p>
          <p className="stat-value text-brand-purple">{result.spawned}</p>
        </div>
      </div>

      {/* Actions */}
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
