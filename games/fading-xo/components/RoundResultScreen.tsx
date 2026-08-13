'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Home } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { Rating } from '@/types/game';
import { MAX_ROUND_SCORE, formatScore, ratingFromScore } from '@/utils/scoring';
import { FadingXoRoundResult } from '../types';
import { MatchPips } from './MatchPips';

const RATING_COLOR: Record<Rating, string> = {
  Perfect: '#EAB308',
  Great: '#22C55E',
  Good: '#38BDF8',
  'Try Again': '#94A3B8',
};

interface RoundResultScreenProps {
  result: FadingXoRoundResult;
  nextLabel: string;
  onNext: () => void;
  onMenu: () => void;
}

/** End-of-round summary: the best-of-3 record (as pips), the round score out
 *  of 10, then Next/Menu — same shape as every other duel-adjacent round
 *  result screen in the hub. */
export function RoundResultScreen({ result, nextLabel, onNext, onMenu }: RoundResultScreenProps) {
  const { wins, draws, losses, outcomes, score } = result;
  const rating = ratingFromScore(score);

  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: RATING_COLOR[rating] }}>
          {rating}
        </p>
        <p className="font-display text-6xl mb-1">
          {formatScore(score)}
          <span className="text-ink-4 text-3xl">/{MAX_ROUND_SCORE}</span>
        </p>
        <p className="text-ink-3 text-sm font-ui">
          {wins}W · {draws}D · {losses}L
        </p>
      </motion.div>

      <MatchPips outcomes={outcomes} totalGames={outcomes.length} accent="#64748B" />

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
