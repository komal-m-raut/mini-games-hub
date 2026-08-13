'use client';

import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { Rating } from '@/types/game';
import { ShapeResult } from '../types';
import { ShapeShape } from './ShapeShape';

const RATING_META: Record<Rating, { emoji: string; color: string; message: string }> = {
  Perfect: { emoji: '🏆', color: '#EAB308', message: 'Position, size and rotation all landed.' },
  Great: { emoji: '🎯', color: '#A78BFA', message: 'Very close to the flash.' },
  Good: { emoji: '👍', color: '#14B8A6', message: 'Right idea, a little off.' },
  'Try Again': { emoji: '🔷', color: '#94A3B8', message: 'Trust the first thing you noticed.' },
};

interface ShapeResultScreenProps {
  result: ShapeResult;
  color: string;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

function AccuracyBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-xs font-ui text-ink-3">
        <span>{label}</span>
        <span className="tabular-nums text-ink-2">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/** Comparison overlay: the target as a dashed ghost, the player's shape
 *  solid on top, both drawn from the same `ShapeShape` primitive. */
export function ShapeResultScreen({ result, color, nextLabel, onNext, onMenu }: ShapeResultScreenProps) {
  const rating = ratingFromScore(result.score);
  const meta = RATING_META[rating];

  return (
    <motion.div
      className="relative flex flex-col items-center gap-6 w-full"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 150, damping: 20 }}
    >
      {rating === 'Perfect' && <ConfettiEffect trigger preset="perfect" />}

      <motion.div
        className="flex flex-col items-center gap-1"
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 250, damping: 18, delay: 0.1 }}
      >
        <span className="text-5xl">{meta.emoji}</span>
        <h2 className="font-display text-4xl sm:text-5xl" style={{ color: meta.color }}>
          {rating}
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

      <motion.svg
        viewBox="0 0 100 100"
        className="w-full select-none rounded-2xl"
        style={{
          maxWidth: 340,
          aspectRatio: '1 / 1',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        role="img"
        aria-label="Comparison of the target shape and yours"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <ShapeShape
          type={result.target.type}
          cx={result.target.cx}
          cy={result.target.cy}
          width={result.target.width}
          ratio={result.target.ratio}
          rotation={result.target.rotation}
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <ShapeShape
          type={result.target.type}
          cx={result.guess.cx}
          cy={result.guess.cy}
          width={result.guess.width}
          ratio={result.target.ratio}
          rotation={result.guess.rotation}
          fill={`${color}33`}
          stroke={color}
          strokeWidth={2}
        />
      </motion.svg>

      <div className="flex items-center justify-center gap-4 text-xs font-ui text-ink-3">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm border border-dashed"
            style={{ borderColor: 'rgba(255,255,255,0.55)' }}
          />
          Target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: `${color}55`, border: `1px solid ${color}` }} />
          Yours
        </span>
      </div>

      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        <AccuracyBar label="Position" value={result.posAcc} color="#22D3EE" />
        <AccuracyBar label="Size" value={result.sizeAcc} color="#A78BFA" />
        <AccuracyBar label="Rotation" value={result.rotAcc} color="#F97316" />
      </div>

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
