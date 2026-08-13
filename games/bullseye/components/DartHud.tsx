'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { DARTS_PER_ROUND } from '../constants';
import { DartResult } from '../types';
import styles from '../styles.module.css';

export interface DartHudProps {
  /** Darts landed so far this round (0..DARTS_PER_ROUND). */
  darts: DartResult[];
  beam: string;
}

/**
 * Dart-level progress within the current round: one pip per dart (filled as
 * they land) plus the running mean accuracy of the darts thrown so far —
 * the round's own score/total live in the shared `ScoreCard` above this, so
 * this stays scoped to "how is this round going so far".
 */
export function DartHud({ darts, beam }: DartHudProps) {
  const reducedMotion = useReducedMotion();
  const thrown = darts.length;
  const runningAccuracy =
    thrown === 0 ? null : darts.reduce((sum, d) => sum + d.accuracy, 0) / thrown;

  return (
    <div
      className="flex items-center justify-center gap-3"
      style={{ '--beam': beam } as React.CSSProperties}
    >
      <div
        className="flex items-center gap-1.5"
        aria-label={`${thrown} of ${DARTS_PER_ROUND} darts thrown`}
      >
        {Array.from({ length: DARTS_PER_ROUND }, (_, i) => (
          <motion.span
            key={i}
            className={styles.pip}
            data-state={i < thrown ? 'thrown' : i === thrown ? 'current' : 'upcoming'}
            initial={false}
            animate={{ scale: i < thrown ? 1 : 0.7 }}
            transition={
              reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 26 }
            }
          />
        ))}
      </div>
      <p className="font-ui text-xs text-ink-3">
        {runningAccuracy === null ? 'Take aim' : `${runningAccuracy.toFixed(1)}% avg`}
      </p>
    </div>
  );
}
