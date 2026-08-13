'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { GameRecord } from '../types';
import { RoundPips } from './RoundPips';

interface RoundResultScreenProps {
  score: number;
  games: GameRecord[];
  nextLabel: string;
  accent: string;
  onNext: () => void;
  onMenu: () => void;
}

/** End-of-round summary — the round's best-of-3 record, translated into its
 *  score out of 10 — same shape as the other games' per-round results. */
export function RoundResultScreen({ score, games, nextLabel, accent, onNext, onMenu }: RoundResultScreenProps) {
  const wins = games.filter((g) => g.outcome === 'win').length;
  const draws = games.filter((g) => g.outcome === 'draw').length;
  const losses = games.filter((g) => g.outcome === 'loss').length;

  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: accent }}>
          Round Complete
        </p>
        <p className="font-display text-6xl mb-1">
          {formatScore(score)}
          <span className="text-ink-4 text-3xl">/{MAX_ROUND_SCORE}</span>
        </p>
      </motion.div>

      <RoundPips games={games} />

      <div className="flex gap-3">
        <div className="stat-card px-5">
          <p className="stat-label">Wins</p>
          <p className="stat-value text-brand-purple">{wins}</p>
        </div>
        <div className="stat-card px-5">
          <p className="stat-label">Draws</p>
          <p className="stat-value text-brand-purple">{draws}</p>
        </div>
        <div className="stat-card px-5">
          <p className="stat-label">Losses</p>
          <p className="stat-value text-brand-purple">{losses}</p>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-sm">
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
          accent={accent}
          onClick={onNext}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {nextLabel}
          <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
        </NeonButton>
      </div>
    </div>
  );
}
