'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BoardState } from '../engine';

export interface LastMove {
  type: 'place' | 'move';
  from?: number;
  to: number;
}

interface XOBoardProps {
  board: BoardState;
  /** The player's own selected piece, movement phase only. */
  selected: number | null;
  /** Cells the selected piece may legally slide to. */
  legalDestinations: number[];
  /** The one adjacent-and-empty cell the selected piece is locked out of by
   *  the no-backtrack rule — shown crossed out, not just left blank. */
  blockedCell: number | null;
  /** Whether taps are currently accepted at all (player's turn, not mid
   *  bot-think, board not settled into a result screen). */
  interactive: boolean;
  lastMove: LastMove | null;
  accent: string;
  onCellTap: (index: number) => void;
}

/**
 * The 3×3 board. Placement taps drop a mark directly; movement taps select
 * one of your pieces (destination dots + the crossed-out no-backtrack cell
 * light up), then a second tap slides it. Tapping the selected piece again
 * deselects it. Marks slide in from the direction they moved using a
 * percentage transform, so it works at any board size without tracking
 * per-piece identity — `prefers-reduced-motion` just snaps (duration 0).
 */
export function XOBoard({
  board,
  selected,
  legalDestinations,
  blockedCell,
  interactive,
  lastMove,
  accent,
  onCellTap,
}: XOBoardProps) {
  const reducedMotion = useReducedMotion();
  const destSet = new Set(legalDestinations);

  return (
    <div
      className="grid gap-2 w-full max-w-[22rem] mx-auto aspect-square"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(3, 1fr)' }}
      role="grid"
      aria-label="XO Shift board, 3 by 3"
    >
      {board.cells.map((value, i) => {
        const isSelected = selected === i;
        const isDest = destSet.has(i);
        const isBlocked = blockedCell === i;
        const canPlace = board.phase === 'placement' && value === null;
        const canSelect = board.phase === 'movement' && value === board.turn;
        const tappable = interactive && (canPlace || canSelect || isDest);

        let dx = 0;
        let dy = 0;
        if (lastMove?.type === 'move' && lastMove.to === i && lastMove.from !== undefined) {
          const fromRow = Math.floor(lastMove.from / 3);
          const fromCol = lastMove.from % 3;
          const toRow = Math.floor(i / 3);
          const toCol = i % 3;
          dx = (fromCol - toCol) * 100;
          dy = (fromRow - toRow) * 100;
        }
        const isPlaced = lastMove?.type === 'place' && lastMove.to === i;
        const isMoved = lastMove?.type === 'move' && lastMove.to === i;

        return (
          <button
            key={i}
            type="button"
            data-cell={i}
            onClick={() => tappable && onCellTap(i)}
            disabled={!tappable}
            aria-label={`Cell ${i + 1}${value ? `, ${value}` : ', empty'}${
              isBlocked ? ', blocked — cannot return here' : ''
            }`}
            className="relative rounded-2xl border transition-colors flex items-center justify-center"
            style={{
              background: isSelected ? `${accent}22` : 'rgba(255,255,255,0.035)',
              borderColor: isSelected ? accent : 'rgba(255,255,255,0.08)',
              cursor: tappable ? 'pointer' : 'default',
            }}
          >
            {value && (
              <motion.span
                key={`${i}-${value}`}
                className="font-display text-4xl sm:text-5xl select-none"
                style={{ color: value === 'X' ? accent : 'var(--ink-1, #f8fafc)' }}
                initial={
                  reducedMotion
                    ? false
                    : isMoved
                      ? { x: `${dx}%`, y: `${dy}%`, opacity: 1, scale: 1 }
                      : isPlaced
                        ? { opacity: 0, scale: 0.4 }
                        : false
                }
                animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.22, ease: 'easeOut' }}
              >
                {value}
              </motion.span>
            )}

            {isDest && !value && (
              <span
                className="absolute w-3 h-3 rounded-full"
                style={{ background: accent, opacity: 0.75 }}
                aria-hidden="true"
              />
            )}

            {isBlocked && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                <span
                  className="absolute w-9 h-9 rounded-full border-2"
                  style={{ borderColor: 'rgba(239,68,68,0.65)' }}
                />
                <span
                  className="absolute w-9 h-[2px] rotate-45"
                  style={{ background: 'rgba(239,68,68,0.65)' }}
                />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
