'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { GameOutcome } from '../types';

const OUTCOME_COPY: Record<GameOutcome, { headline: string; color: string }> = {
  win: { headline: 'You win this one', color: '#22C55E' },
  loss: { headline: 'Bot takes this one', color: '#EF4444' },
  draw: { headline: "It's a draw", color: '#94A3B8' },
};

interface GameResultBannerProps {
  outcome: GameOutcome;
  gameIndex: number;
  totalGames: number;
  onContinue: () => void;
}

/** Brief per-game outcome, shown between the games of a best-of-3 round.
 *  The board underneath stays visible in its final state — this just
 *  overlays the verdict and the way to the next game. */
export function GameResultBanner({ outcome, gameIndex, totalGames, onContinue }: GameResultBannerProps) {
  const { headline, color } = OUTCOME_COPY[outcome];
  const isLastGame = gameIndex >= totalGames;

  return (
    <motion.div
      className="glass-card flex flex-col items-center gap-5 py-8 px-6 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
        Game {gameIndex} / {totalGames}
      </p>
      <p className="font-display text-3xl sm:text-4xl" style={{ color }}>
        {headline}
      </p>
      <NeonButton
        variant="primary"
        size="md"
        onClick={onContinue}
        className="flex items-center justify-center gap-2 whitespace-nowrap"
      >
        {isLastGame ? 'See round result' : 'Next game'}
        <ArrowRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
      </NeonButton>
    </motion.div>
  );
}
