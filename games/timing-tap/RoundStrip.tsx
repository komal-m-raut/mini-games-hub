'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { TAP_RATING_META, tapRatingFromScore } from './ratings';

export interface RoundStripProps {
  /** Rounds in this session — 5 solo, 3 challenge. */
  totalRounds: number;
  /** Scores banked so far; its length is also the current round index. */
  roundScores: number[];
}

/**
 * One segment per round, tinted by how that round actually went. The
 * ScoreCard already reads out "Round 2/5" in text, so these are purely
 * decorative — the point is a glanceable shape of the run so far, which a
 * numeric fraction can't give you mid-sweep.
 */
export function RoundStrip({ totalRounds, roundScores }: RoundStripProps) {
  const reducedMotion = useReducedMotion();
  const current = roundScores.length;

  return (
    <div className="round-strip" aria-hidden>
      {Array.from({ length: totalRounds }, (_, i) => {
        const done = i < current;
        const tone = done ? TAP_RATING_META[tapRatingFromScore(roundScores[i])].color : null;

        return (
          <motion.span
            key={i}
            className="round-pip"
            data-state={done ? 'done' : i === current ? 'current' : 'upcoming'}
            style={tone ? ({ '--tone': tone } as React.CSSProperties) : undefined}
            initial={false}
            animate={{ scaleY: done || i === current ? 1 : 0.55 }}
            transition={
              reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }
            }
          />
        );
      })}
    </div>
  );
}
