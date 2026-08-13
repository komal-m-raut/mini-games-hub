'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { MatchResult } from '../constants';
import { MatchRecord } from '../types';

const RESULT_LABEL: Record<MatchResult, string> = {
  win: 'You Won',
  tie: "It's a Tie",
  loss: 'Bot Won',
};

const RESULT_COLOR: Record<MatchResult, string> = {
  win: '#22C55E',
  tie: '#EAB308',
  loss: '#EF4444',
};

interface MatchResultScreenProps {
  result: MatchRecord;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** Match-end summary: result banner, both innings' totals, match score,
 *  Next/Menu — the round-end shape every game shares. */
export function MatchResultScreen({ result, nextLabel, onNext, onMenu }: MatchResultScreenProps) {
  const { playerRuns, botRuns, target, score, result: outcome } = result;

  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: RESULT_COLOR[outcome] }}>
          {RESULT_LABEL[outcome]}
        </p>
        <p className="font-display text-6xl mb-1">
          {formatScore(score)}
          <span className="text-ink-4 text-3xl">/{MAX_ROUND_SCORE}</span>
        </p>
      </motion.div>

      <div className="flex gap-3">
        <div className="stat-card px-5">
          <p className="stat-label">You batted</p>
          <p className="stat-value text-brand-purple">{playerRuns}</p>
        </div>
        <div className="stat-card px-5">
          <p className="stat-label">Bot batted</p>
          <p className="stat-value text-brand-purple">
            {botRuns}
            <span className="text-ink-4 text-sm"> /{target}</span>
          </p>
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
