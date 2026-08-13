'use client';

import { useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Board } from '../engine';
import { LONG_PRESS_MS, NUMBER_COLORS } from '../constants';

interface MineBoardProps {
  board: Board;
  /** The mine that ended a lost round, so it can be marked distinctly from
   *  the rest of the revealed mine field. */
  lostIndex: number | null;
  /** Whether input is currently accepted (false once the round has ended). */
  interactive: boolean;
  onPrimary: (index: number) => void;
  onSecondary: (index: number) => void;
}

/** Cell contents: number, flag, mine or wrong-flag mark. */
function cellGlyph(board: Board, index: number, lostIndex: number | null): string {
  if (board.flagged[index]) {
    const gameOver = lostIndex !== null;
    if (gameOver && !board.mines[index]) return '❌'; // a flag that turned out wrong
    return '🚩';
  }
  if (!board.revealed[index]) return '';
  if (board.mines[index]) return index === lostIndex ? '💥' : '💣';
  const count = board.counts[index];
  return count > 0 ? String(count) : '';
}

function cellAriaLabel(board: Board, index: number, lostIndex: number | null): string {
  const row = Math.floor(index / board.width) + 1;
  const col = (index % board.width) + 1;
  const base = `Row ${row} column ${col}`;
  if (board.flagged[index]) return `${base} flagged`;
  if (!board.revealed[index]) return `${base} hidden`;
  if (board.mines[index]) return `${base} ${index === lostIndex ? 'mine, game over' : 'mine'}`;
  return `${base} ${board.counts[index]} adjacent`;
}

export function MineBoard({ board, lostIndex, interactive, onPrimary, onSecondary }: MineBoardProps) {
  const reducedMotion = useReducedMotion();
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const pressStartRef = useRef<{ x: number; y: number } | null>(null);

  const clearPressTimer = useCallback(() => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      if (!interactive || e.pointerType !== 'touch') return;
      longPressFiredRef.current = false;
      pressStartRef.current = { x: e.clientX, y: e.clientY };
      clearPressTimer();
      pressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onSecondary(index);
      }, LONG_PRESS_MS);
    },
    [interactive, onSecondary, clearPressTimer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pressStartRef.current;
      if (!start || !pressTimerRef.current) return;
      // Cancel a pending long-press if the finger drifts — that's a scroll,
      // not a hold.
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 10) clearPressTimer();
    },
    [clearPressTimer]
  );

  const handlePointerUp = useCallback(() => {
    clearPressTimer();
  }, [clearPressTimer]);

  const handleClick = useCallback(
    (index: number) => {
      if (!interactive) return;
      if (longPressFiredRef.current) {
        // Swallow the click that follows a long-press flag.
        longPressFiredRef.current = false;
        return;
      }
      onPrimary(index);
    },
    [interactive, onPrimary]
  );

  const handleContextMenu = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      if (!interactive) return;
      onSecondary(index);
    },
    [interactive, onSecondary]
  );

  return (
    <div
      className="w-full mx-auto overflow-y-auto rounded-xl"
      style={{ maxWidth: 460, maxHeight: '62vh' }}
    >
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${board.width}, minmax(28px, 1fr))`, gap: 3 }}
        role="group"
        aria-label={`${board.width} by ${board.height} minesweeper board`}
      >
        {Array.from({ length: board.width * board.height }, (_, i) => {
          const isRevealed = board.revealed[i];
          const isFlagged = board.flagged[i];
          const isMine = board.mines[i];
          const isTrigger = i === lostIndex;
          const glyph = cellGlyph(board, i, lostIndex);
          const count = isRevealed && !isMine ? board.counts[i] : 0;

          let background = 'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02))';
          let border = 'rgba(255,255,255,0.14)';
          let boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 1px 2px rgba(0,0,0,0.3)';

          if (isTrigger) {
            background = 'rgba(239,68,68,0.35)';
            border = 'rgba(239,68,68,0.9)';
            boxShadow = '0 0 14px rgba(239,68,68,0.55)';
          } else if (isRevealed) {
            background = 'rgba(255,255,255,0.035)';
            border = 'rgba(255,255,255,0.08)';
            boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.35)';
          } else if (isFlagged) {
            background = 'linear-gradient(145deg, rgba(203,213,225,0.16), rgba(203,213,225,0.04))';
            border = 'rgba(203,213,225,0.4)';
          }

          return (
            <motion.button
              key={i}
              type="button"
              aria-label={cellAriaLabel(board, i, lostIndex)}
              disabled={!interactive && !isRevealed && !isFlagged}
              onPointerDown={(e) => handlePointerDown(i, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => handleClick(i)}
              onContextMenu={(e) => handleContextMenu(i, e)}
              className="rounded-md touch-manipulation select-none flex items-center justify-center font-ui font-semibold text-sm sm:text-base"
              style={{
                background,
                border: `1px solid ${border}`,
                boxShadow,
                aspectRatio: '1 / 1',
                color: count > 0 ? NUMBER_COLORS[count] : undefined,
                cursor: interactive ? 'pointer' : 'default',
                transition: reducedMotion
                  ? undefined
                  : 'background 0.12s, border-color 0.12s, box-shadow 0.12s',
              }}
              whileTap={interactive && !reducedMotion ? { scale: 0.92 } : undefined}
            >
              {glyph}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
