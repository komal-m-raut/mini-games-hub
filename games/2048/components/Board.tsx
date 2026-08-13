'use client';

import { useEffect, useRef } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { BOARD_SIZE, CELL_COUNT } from '../engine';
import { Direction } from '../types';
import { getTileStyle } from '../constants';

interface BoardProps {
  board: number[];
  /** Direction of the most recently applied move — drives the board's brief
   *  directional nudge (the "slide" cue), replayed via `moveSeq` below. */
  lastMoveDir: Direction | null;
  /** Bumped on every applied move, so the nudge retriggers even when the
   *  direction repeats. */
  moveSeq: number;
  /** False once the board is no longer accepting input (game over / round
   *  over) — kept purely visual (dimmed), swipes are gated by the caller. */
  interactive: boolean;
  swipeThreshold: number;
  onMove: (dir: Direction) => void;
}

const NUDGE_PX = 6;
const NUDGE_OFFSET: Record<Direction, { x: number; y: number }> = {
  left: { x: -NUDGE_PX, y: 0 },
  right: { x: NUDGE_PX, y: 0 },
  up: { x: 0, y: -NUDGE_PX },
  down: { x: 0, y: NUDGE_PX },
};

/** 4×4 tile grid. Tiles are keyed by `index-value`, so a cell that changes
 *  value — because a new tile spawned there, a tile slid into it, or two
 *  tiles merged there — remounts and plays its pop-in spring; a cell whose
 *  value is unchanged keeps its key and stays put. Combined with the whole
 *  board's brief directional nudge on every move, this reads as slide+pop
 *  without needing to track individual tile identity across the move (the
 *  engine's board is a plain value grid, not tagged tiles) — see
 *  use2048Game.ts's `move` for where `lastMoveDir`/`moveSeq` come from.
 *  The nudge is driven imperatively via `useAnimationControls` rather than a
 *  remount-on-change `key` on the wrapping element — a `key` there would
 *  remount every child on every move (including the tile grid below),
 *  wiping out the per-tile pop-in keying's whole point. Reduced motion
 *  drops both the nudge and the pop to instant. */
export function Board({
  board,
  lastMoveDir,
  moveSeq,
  interactive,
  swipeThreshold,
  onMove,
}: BoardProps) {
  const reducedMotion = useReducedMotion();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const nudgeControls = useAnimationControls();
  const lastSeqRef = useRef(moveSeq);

  useEffect(() => {
    if (moveSeq === lastSeqRef.current) return;
    lastSeqRef.current = moveSeq;
    if (reducedMotion || !lastMoveDir) return;
    const offset = NUDGE_OFFSET[lastMoveDir];
    void nudgeControls.start({
      x: [0, offset.x, 0],
      y: [0, offset.y, 0],
      transition: { duration: 0.16, ease: 'easeOut' },
    });
  }, [moveSeq, lastMoveDir, reducedMotion, nudgeControls]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !interactive) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < swipeThreshold) return;
    if (absX > absY) {
      onMove(dx > 0 ? 'right' : 'left');
    } else {
      onMove(dy > 0 ? 'down' : 'up');
    }
  };

  return (
    <motion.div
      role="group"
      aria-label="2048 board"
      className="relative w-full mx-auto rounded-2xl p-2.5 sm:p-3"
      style={{
        maxWidth: 420,
        aspectRatio: '1 / 1',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        touchAction: 'none',
        opacity: interactive ? 1 : 0.6,
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      animate={nudgeControls}
    >
      <div
        className="grid w-full h-full"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, gap: 8 }}
      >
        {/* Static empty-slot backdrop, always CELL_COUNT cells. */}
        {Array.from({ length: CELL_COUNT }, (_, i) => (
          <div
            key={`slot-${i}`}
            className="rounded-xl"
            style={{ background: 'rgba(255,255,255,0.035)', aspectRatio: '1 / 1' }}
            aria-hidden="true"
          />
        ))}
      </div>

      <div
        className="grid absolute inset-2.5 sm:inset-3"
        style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`, gap: 8 }}
      >
        {board.map((value, i) => {
          if (value === 0) return <div key={`empty-${i}`} aria-hidden="true" />;
          const style = getTileStyle(value);
          return (
            <motion.div
              key={`${i}-${value}`}
              className="grid place-items-center rounded-xl font-display leading-none select-none"
              style={{
                background: style.background,
                color: style.color,
                boxShadow: style.glow ? `0 0 18px ${style.glow}` : undefined,
                fontSize: value >= 1024 ? '1.15rem' : value >= 128 ? '1.4rem' : '1.7rem',
                aspectRatio: '1 / 1',
              }}
              initial={reducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={
                reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 24 }
              }
            >
              {value}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
