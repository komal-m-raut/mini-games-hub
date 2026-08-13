'use client';

import { motion } from 'framer-motion';
import { GameRecord } from '../types';
import { GAMES_PER_ROUND } from '../constants';

const OUTCOME_COLOR: Record<GameRecord['outcome'], string> = {
  win: '#22C55E',
  draw: '#94A3B8',
  loss: '#EF4444',
};

const OUTCOME_LABEL: Record<GameRecord['outcome'], string> = {
  win: 'Won',
  draw: 'Drew',
  loss: 'Lost',
};

interface RoundPipsProps {
  /** Games completed so far in the round in progress, in order. */
  games: GameRecord[];
}

/** Three pips — one per game in the round's best-of-3 — filled in with a
 *  win/draw/loss colour as each game finishes, outlined and empty for games
 *  still to come. */
export function RoundPips({ games }: RoundPipsProps) {
  return (
    <div className="flex items-center gap-2" role="list" aria-label="Games this round">
      {Array.from({ length: GAMES_PER_ROUND }, (_, i) => {
        const game = games[i];
        return (
          <motion.span
            key={i}
            role="listitem"
            aria-label={game ? `Game ${i + 1}: ${OUTCOME_LABEL[game.outcome]}` : `Game ${i + 1}: not played yet`}
            className="w-3 h-3 rounded-full border-2"
            initial={false}
            animate={{
              background: game ? OUTCOME_COLOR[game.outcome] : 'transparent',
              borderColor: game ? OUTCOME_COLOR[game.outcome] : 'rgba(255,255,255,0.25)',
              scale: game ? 1 : 0.85,
            }}
            transition={{ duration: 0.2 }}
          />
        );
      })}
    </div>
  );
}
