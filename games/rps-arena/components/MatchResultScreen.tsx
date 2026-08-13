'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { MatchOutcome } from '../types';

const OUTCOME_META: Record<MatchOutcome, { label: string; color: string }> = {
  won: { label: 'Match Won', color: '#22C55E' },
  lost: { label: 'Match Lost', color: '#EF4444' },
  drawn: { label: 'Match Drawn', color: '#EAB308' },
};

interface MatchResultScreenProps {
  outcome: MatchOutcome;
  playerWins: number;
  botWins: number;
  score: number;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** End-of-match summary: won/lost/drawn, the final game tally, the match's
 *  score out of 10, then Next/Menu — same shape as every other game's
 *  round-result screen (see MathResultScreen, TapResultScreen). */
export function MatchResultScreen({
  outcome,
  playerWins,
  botWins,
  score,
  nextLabel,
  onNext,
  onMenu,
}: MatchResultScreenProps) {
  const meta = OUTCOME_META[outcome];

  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: meta.color }}>
          {meta.label}
        </p>
        <p className="font-display text-6xl mb-1">
          {formatScore(score)}
          <span className="text-ink-4 text-3xl">/{MAX_ROUND_SCORE}</span>
        </p>
      </motion.div>

      <div className="flex gap-3">
        <div className="stat-card px-5">
          <p className="stat-label">You</p>
          <p className="stat-value text-brand-purple">{playerWins}</p>
        </div>
        <div className="stat-card px-5">
          <p className="stat-label">Bot</p>
          <p className="stat-value text-brand-purple">{botWins}</p>
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
