'use client';

import { motion } from 'framer-motion';
import { Trophy, Zap, Target } from 'lucide-react';
import { MAX_ROUND_SCORE } from '@/utils/scoring';
import { MAX_CHALLENGE_SCORE } from '@/lib/challenge';

interface ScoreCardProps {
  score: number;
  highScore: number;
  round: number;
  /** Set for challenge mode: fixed round count + running total. */
  totalRounds?: number | null;
  totalScore?: number;
  isNewHighScore?: boolean;
}

export function ScoreCard({
  score,
  highScore,
  round,
  totalRounds,
  totalScore,
  isNewHighScore,
}: ScoreCardProps) {
  const isChallenge = totalRounds != null;

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

      {isChallenge ? (
        /* Challenge total */
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-brand-yellow shrink-0" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Total</p>
            <p className="font-display font-bold text-white text-lg leading-none">
              {totalScore ?? 0}
              <span className="text-white/30 text-sm">/{MAX_CHALLENGE_SCORE}</span>
            </p>
          </div>
        </div>
      ) : (
        /* Personal best */
        <div className="flex items-center gap-2">
          <Trophy
            className={`w-4 h-4 shrink-0 ${isNewHighScore ? 'text-brand-yellow' : 'text-white/30'}`}
            strokeWidth={1.5}
          />
          <div>
            <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">
              {isNewHighScore ? '🎉 New Best!' : 'Best'}
            </p>
            <p className="font-display font-bold text-white/60 text-lg leading-none">
              {highScore}
              <span className="text-white/30 text-sm">/{MAX_ROUND_SCORE}</span>
            </p>
          </div>
        </div>
      )}

      {/* Round */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-brand-cyan shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Round</p>
          <p className="font-display font-bold text-white text-lg leading-none">
            {round}
            {isChallenge && <span className="text-white/30 text-sm">/{totalRounds}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
