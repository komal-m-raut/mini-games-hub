'use client';

import { motion } from 'framer-motion';
import { Trophy, Zap, Target } from 'lucide-react';
import { formatScore } from '@/utils/scoring';

interface ScoreCardProps {
  score: number;
  highScore: number;
  round: number;
  accuracy?: number;
  isNewHighScore?: boolean;
}

export function ScoreCard({ score, highScore, round, accuracy, isNewHighScore }: ScoreCardProps) {
  return (
    <div className="flex items-center gap-3 sm:gap-6">
      {/* Current score */}
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
            {formatScore(score)}
          </motion.p>
        </div>
      </div>

      {/* High score */}
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
            {formatScore(highScore)}
          </p>
        </div>
      </div>

      {/* Round */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-brand-cyan shrink-0" strokeWidth={1.5} />
        <div>
          <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Round</p>
          <p className="font-display font-bold text-white text-lg leading-none">{round}</p>
        </div>
      </div>

      {/* Accuracy (optional) */}
      {accuracy !== undefined && (
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border border-brand-purple shrink-0" />
          <div>
            <p className="text-xs text-white/40 font-mono uppercase tracking-wide leading-none mb-0.5">Accuracy</p>
            <p className="font-display font-bold text-brand-purple text-lg leading-none">
              {accuracy.toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
