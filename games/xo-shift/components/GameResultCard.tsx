'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GameRecord } from '../types';
import { RoundPips } from './RoundPips';

const OUTCOME_COPY: Record<GameRecord['outcome'], { headline: string; color: string }> = {
  win: { headline: 'You won this game', color: '#22C55E' },
  loss: { headline: 'Bot won this game', color: '#EF4444' },
  draw: { headline: 'Drawn game', color: '#94A3B8' },
};

interface GameResultCardProps {
  result: GameRecord;
  roundGames: GameRecord[];
  isRoundComplete: boolean;
  accent: string;
  onNext: () => void;
}

/** The brief interstitial after a single game inside a round's best-of-3:
 *  who won, the pip row so far, and a button into the next game or into the
 *  round's score. */
export function GameResultCard({ result, roundGames, isRoundComplete, accent, onNext }: GameResultCardProps) {
  const { headline, color } = OUTCOME_COPY[result.outcome];

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-2">
      <motion.p
        className="font-display text-2xl sm:text-3xl text-center"
        style={{ color }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        {headline}
      </motion.p>

      <RoundPips games={roundGames} />

      <NeonButton
        variant="primary"
        size="md"
        accent={accent}
        onClick={onNext}
        className="flex items-center gap-2 whitespace-nowrap"
      >
        {isRoundComplete ? 'Round Result' : 'Next Game'}
        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
      </NeonButton>
    </div>
  );
}
