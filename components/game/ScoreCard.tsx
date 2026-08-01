'use client';

import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';

interface ScoreCardProps {
  /** Latest round score, out of 10. */
  score: number;
  round: number;
  /** Rounds in this session (5 normal / 3 challenge). */
  totalRounds: number | null;
  /** Running total across the session. */
  totalScore: number;
}

export function ScoreCard({ score, round, totalRounds, totalScore }: ScoreCardProps) {
  const maxTotal = (totalRounds ?? 0) * MAX_ROUND_SCORE;

  return (
    <div className="flex items-center gap-2.5">
      {/* Latest round score — the one prominent number in this row */}
      <Zap className="w-4 h-4 text-brand-yellow shrink-0" strokeWidth={1.5} />
      <div>
        <p className="text-[0.65rem] text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">
          Score
        </p>
        <motion.p
          key={score}
          className="font-score font-bold text-white text-xl leading-none"
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {formatScore(score)}
          <span className="text-white/50 text-sm">/{MAX_ROUND_SCORE}</span>
        </motion.p>
        {/* Total + round, demoted to a single quiet line so the round
            score above stays the only number that reads as "the score" */}
        <p className="font-score text-[0.7rem] text-white/40 leading-none mt-0.5">
          Round {round}
          {totalRounds !== null && <span className="text-white/50">/{totalRounds}</span>}
          {' · '}
          {formatScore(totalScore)}
          {maxTotal > 0 && <span className="text-white/50">/{maxTotal}</span>}
        </p>
      </div>
    </div>
  );
}
