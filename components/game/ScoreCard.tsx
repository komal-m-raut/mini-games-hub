'use client';

import { motion } from 'framer-motion';
import { Trophy, Zap, Target } from 'lucide-react';
import { MAX_ROUND_SCORE } from '@/utils/scoring';

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
    <div className="flex items-center gap-3 sm:gap-6">
      {/* Latest round score */}
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-brand-yellow shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Score</p>
          <motion.p
            key={score}
            className="font-display font-bold text-white text-lg leading-none"
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            {score}
            <span className="text-white/30 text-sm">/{MAX_ROUND_SCORE}</span>
          </motion.p>
        </div>
      </div>

      {/* Session total */}
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-brand-yellow shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Total</p>
          <p className="font-display font-bold text-white text-lg leading-none">
            {totalScore}
            {maxTotal > 0 && <span className="text-white/30 text-sm">/{maxTotal}</span>}
          </p>
        </div>
      </div>

      {/* Round progress */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-brand-cyan shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Round</p>
          <p className="font-display font-bold text-white text-lg leading-none">
            {round}
            {totalRounds !== null && <span className="text-white/30 text-sm">/{totalRounds}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
