'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { Game2048RoundResult } from '../types';

interface RoundResultScreenProps {
  result: Game2048RoundResult;
  nextLabel: string;
  onNext: () => void;
}

/** End-of-sprint summary for one challenge round: points scored in the 90s
 *  and the round score out of 10 that feeds the challenge total. No undo in
 *  challenge mode, so there's no "Menu" escape here — Retry only, via
 *  ChallengeComplete after the last round. */
export function RoundResultScreen({ result, nextLabel, onNext }: RoundResultScreenProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-6">
      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: '#FB923C' }}>
          Sprint Complete
        </p>
        <p className="font-display text-6xl mb-1">
          {formatScore(result.score10)}
          <span className="text-ink-4 text-3xl">/{MAX_ROUND_SCORE}</span>
        </p>
        <p className="text-ink-3 text-sm font-ui">{result.points.toLocaleString()} points scored</p>
      </motion.div>

      <NeonButton
        variant="primary"
        size="md"
        accent="#FB923C"
        onClick={onNext}
        className="flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {nextLabel}
        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
      </NeonButton>
    </div>
  );
}
