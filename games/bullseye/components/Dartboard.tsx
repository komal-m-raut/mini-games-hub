'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BOARD_CENTER, RING_THRESHOLDS } from '../constants';
import { BullseyePhase, DartResult } from '../types';
import styles from '../styles.module.css';

export interface DartboardProps {
  phase: BullseyePhase;
  /** Live oscillator sample, 0–100, driving whichever line is moving. */
  aimPosition: number;
  /** Y locked while aiming X; null before the first lock of a dart. */
  lockedY: number | null;
  /** Darts already landed this round, shown as faint dots. */
  darts: DartResult[];
  /** Most recently landed dart — drives the thunk marker + ring flash. */
  lastDart: DartResult | null;
  beam: string;
  reducedMotion: boolean;
}

/** viewBox is 0–100 on both axes, so board coordinates (already 0–100
 *  board-percent) drop straight into SVG attrs with zero scaling maths —
 *  the board's centre is (50, 50) and BOARD_RADIUS (50) reaches exactly to
 *  the top/bottom edges, leaving the square's corners outside the circle
 *  for a throw that misses the board entirely. */
export function Dartboard({
  phase,
  aimPosition,
  lockedY,
  darts,
  lastDart,
  beam,
  reducedMotion,
}: DartboardProps) {
  const showYLine = phase === 'aiming-y';
  const showXLine = phase === 'aiming-x';
  const isBullseye = phase === 'landing' && lastDart?.ring === 'BULLSEYE';

  return (
    <div className={cn(styles.stage)} style={{ '--beam': beam } as React.CSSProperties}>
      <svg viewBox="0 0 100 100" className={styles.svg} role="img" aria-label="Dartboard">
        {/* Rings, outermost first so each inner ring paints over it. */}
        {[...RING_THRESHOLDS].reverse().map(([label, threshold]) => (
          <circle
            key={label}
            cx={BOARD_CENTER}
            cy={BOARD_CENTER}
            r={threshold * 50}
            className={styles.ring}
            data-ring={label}
          />
        ))}

        {/* Darts already landed this round — faint, so the live throw reads
            clearly against them. */}
        {darts.slice(0, -1).map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={1.4} className={styles.dartGhost} />
        ))}

        {/* Locked Y stays visible (dimmed) while aiming X, so the player can
            see the row their throw is already committed to. */}
        {lockedY !== null && (phase === 'aiming-x' || phase === 'landing') && (
          <line x1={0} y1={lockedY} x2={100} y2={lockedY} className={styles.lockedLine} />
        )}

        {showYLine && (
          <line x1={0} y1={aimPosition} x2={100} y2={aimPosition} className={styles.aimLine} />
        )}
        {showXLine && (
          <line x1={aimPosition} y1={0} x2={aimPosition} y2={100} className={styles.aimLine} />
        )}

        <AnimatePresence>
          {phase === 'landing' && lastDart && (
            <motion.circle
              key={darts.length}
              cx={lastDart.x}
              cy={lastDart.y}
              r={2.2}
              className={styles.dartLanded}
              data-bullseye={isBullseye ? 'true' : undefined}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 2.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            />
          )}
        </AnimatePresence>
      </svg>

      <AnimatePresence>
        {isBullseye && (
          <motion.p
            key={darts.length}
            className={cn('font-display', styles.bullseyeFlash)}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          >
            BULLSEYE!
          </motion.p>
        )}
      </AnimatePresence>

      {phase === 'landing' && lastDart && !isBullseye && (
        <p className={cn('font-ui text-sm', styles.ringFlash)}>
          {lastDart.ring === 'MISS' ? 'MISS' : lastDart.ring}
        </p>
      )}
    </div>
  );
}
