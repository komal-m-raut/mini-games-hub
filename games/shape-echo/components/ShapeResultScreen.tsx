'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { Rating } from '@/types/game';
import { ShapeResult } from '../types';
import { ShapeShape } from './ShapeShape';
import styles from '../styles.module.css';

const RATING_META: Record<Rating, { emoji: string; color: string }> = {
  Perfect: { emoji: '🏆', color: '#EAB308' },
  Great: { emoji: '🎯', color: '#A78BFA' },
  Good: { emoji: '👍', color: '#14B8A6' },
  'Try Again': { emoji: '🔷', color: '#94A3B8' },
};

const METERS: Array<{ key: 'posAcc' | 'sizeAcc' | 'rotAcc'; label: string; color: string }> = [
  { key: 'posAcc', label: 'Position', color: '#22D3EE' },
  { key: 'sizeAcc', label: 'Size', color: '#A78BFA' },
  { key: 'rotAcc', label: 'Rotation', color: '#F97316' },
];

interface ShapeResultScreenProps {
  result: ShapeResult;
  color: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/**
 * The reveal is the product: a huge accuracy percentage first, then the
 * target (a white ghost outline) and the player's shape (filled in the game
 * accent) settle onto the stage together, then three slim labeled meters
 * break the number down. Under `prefers-reduced-motion` the settle is
 * instant — both shapes simply appear in place, no morph.
 */
export function ShapeResultScreen({ result, color, nextLabel, onNext, onMenu }: ShapeResultScreenProps) {
  const rating = ratingFromScore(result.score);
  const meta = RATING_META[rating];
  const gradId = useId();
  const reducedMotion = useReducedMotion();

  const revealInitial = reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.82 };
  const revealTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.2, 0, 0, 1] as [number, number, number, number] };

  return (
    <motion.div
      className="flex flex-col items-center gap-6 w-full pb-5"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22 }}
    >
      {rating === 'Perfect' && <ConfettiEffect trigger preset="perfect" />}

      {/* The hero: one huge number, everything else demoted around it. */}
      <div className="flex flex-col items-center gap-1 px-5">
        <motion.p
          className="font-score leading-none text-6xl sm:text-7xl"
          style={{ color: meta.color }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          {Math.round(result.accuracy)}
          <span className="text-2xl text-ink-3">%</span>
        </motion.p>
        <p className="font-ui text-sm text-ink-3 flex items-center gap-1.5">
          <span aria-hidden="true">{meta.emoji}</span>
          <span className="font-display text-base" style={{ color: meta.color }}>
            {rating}
          </span>
          <span className="text-ink-4">·</span>
          <span>
            {formatScore(result.score)}/{MAX_ROUND_SCORE}
          </span>
        </p>
      </div>

      <svg
        viewBox="0 0 100 100"
        className={styles.stage}
        role="img"
        aria-label={`Comparison of the target shape and yours, ${Math.round(result.accuracy)} percent accurate`}
      >
        <defs>
          <radialGradient id={gradId} cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.45" />
          </radialGradient>
        </defs>

        {/* Target — a quiet white ghost outline, no fill. */}
        <motion.g initial={revealInitial} animate={{ opacity: 1, scale: 1 }} transition={revealTransition}>
          <ShapeShape
            type={result.target.type}
            cx={result.target.cx}
            cy={result.target.cy}
            width={result.target.width}
            ratio={result.target.ratio}
            rotation={result.target.rotation}
            fill="none"
            stroke="rgba(255, 255, 255, 0.65)"
            strokeWidth={1.25}
          />
        </motion.g>

        {/* Yours — filled in the game accent, settling in just behind the target. */}
        <motion.g
          initial={revealInitial}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...revealTransition, delay: reducedMotion ? 0 : 0.06 }}
        >
          <ShapeShape
            type={result.target.type}
            cx={result.guess.cx}
            cy={result.guess.cy}
            width={result.guess.width}
            ratio={result.target.ratio}
            rotation={result.guess.rotation}
            fill={`url(#${gradId})`}
            stroke={color}
            strokeWidth={1.5}
            filter={`drop-shadow(0 0 12px ${color}66)`}
          />
        </motion.g>
      </svg>

      <div className="flex flex-col gap-3 w-full px-5">
        {METERS.map((m) => (
          <div key={m.key} className={styles.meter}>
            <div className="flex items-center justify-between">
              <span className="font-ui text-2xs uppercase tracking-widest text-ink-3">{m.label}</span>
              <span className="font-score text-xs text-ink-2 tabular-nums">
                {Math.round(result[m.key] * 100)}%
              </span>
            </div>
            <div className={styles.meterTrack}>
              <motion.div
                className={styles.meterFill}
                style={{ background: m.color }}
                initial={{ width: reducedMotion ? `${result[m.key] * 100}%` : 0 }}
                animate={{ width: `${result[m.key] * 100}%` }}
                transition={{
                  duration: reducedMotion ? 0 : 0.5,
                  ease: 'easeOut',
                  delay: reducedMotion ? 0 : 0.15,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 w-full px-5">
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
      </div>
    </motion.div>
  );
}
