'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TileState } from '../engine';
import { ACCENT, FLIP_DURATION_MS } from '../constants';
import styles from '../styles.module.css';

/** Amber, matching the yellow used across the app's rating/score scales. */
const PRESENT_COLOR = '#FBBF24';

const STATE_COLOR: Record<TileState, string> = {
  correct: ACCENT,
  present: PRESENT_COLOR,
  absent: 'rgba(255,255,255,0.08)',
};

export type DisplayTileState = TileState | 'empty' | 'filled';

interface TileProps {
  letter: string;
  state: DisplayTileState;
  /** Whether this tile has flipped to reveal `state` yet. Ignored (treated
   *  as always true) for 'empty'/'filled' tiles, which have nothing to
   *  reveal. */
  revealed: boolean;
  /** Plays the winning-row bounce once revealed. */
  celebrate?: boolean;
  /** Stagger offset for the bounce, in ms. */
  celebrateDelayMs?: number;
}

/**
 * One letter cell. Evaluated tiles (`correct`/`present`/`absent`) flip into
 * view — a quick 3D rotation that remounts (via the `key` swap) the instant
 * `revealed` turns true, so the colour change lands exactly when the tile is
 * edge-on and least visible, cascading across a row as each tile's `revealed`
 * flips in turn (driven by `WordGrid`'s stagger timers).
 */
export function Tile({ letter, state, revealed, celebrate, celebrateDelayMs = 0 }: TileProps) {
  const reducedMotion = useReducedMotion();
  const evaluated = state === 'correct' || state === 'present' || state === 'absent';
  const showFinal = evaluated && revealed;

  return (
    <motion.div
      key={reducedMotion ? 'static' : showFinal ? 'revealed' : 'hidden'}
      initial={!reducedMotion && showFinal ? { rotateX: 90 } : false}
      animate={{ rotateX: 0 }}
      transition={{ duration: FLIP_DURATION_MS / 1000, ease: 'easeOut' }}
      className={cn(
        'grid place-items-center w-full aspect-square rounded-lg border-2 font-display text-2xl sm:text-3xl uppercase select-none text-white',
        celebrate && !reducedMotion && styles.celebrate
      )}
      style={{
        animationDelay: celebrate ? `${celebrateDelayMs}ms` : undefined,
        background: showFinal
          ? STATE_COLOR[state as TileState]
          : state === 'filled'
            ? 'rgba(255,255,255,0.06)'
            : 'transparent',
        borderColor: showFinal
          ? STATE_COLOR[state as TileState]
          : letter
            ? 'rgba(255,255,255,0.4)'
            : 'rgba(255,255,255,0.14)',
      }}
      aria-label={letter ? `${letter}${showFinal ? `, ${state}` : ''}` : 'empty'}
    >
      {letter}
    </motion.div>
  );
}
