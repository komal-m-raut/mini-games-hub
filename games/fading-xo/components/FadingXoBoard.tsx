'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { FadingXoState, Player, findWinningLine, getOldest, isMovementPhase } from '../engine';
import styles from '../styles.module.css';

interface FadingXoBoardProps {
  engine: FadingXoState;
  /** Empty cells only become tappable once it's genuinely the player's turn
   *  (not the bot's, not while it's thinking, not after the game ended). */
  interactive: boolean;
  onCellTap: (cell: number) => void;
  markColor: Record<Player, string>;
  /** Accessible owner labels. Live rooms replace the solo You/Bot copy. */
  markLabel?: Record<Player, string>;
}

/**
 * The 3×3 board. Both players' current oldest mark — the one forced to move
 * next — renders faded with a shimmer, for BOTH sides (full information, per
 * spec): you're meant to be tracking your opponent's ghost clock as closely
 * as your own. Reduced motion swaps the shimmer for a static dashed outline
 * and drops all entrance animation, so a "move" reads as an instant snap
 * rather than a travel.
 */
export function FadingXoBoard({
  engine,
  interactive,
  onCellTap,
  markColor,
  markLabel = { X: 'Your', O: "Bot's" },
}: FadingXoBoardProps) {
  const reducedMotion = useReducedMotion();
  const playerOldest = getOldest(engine, 'X');
  const botOldest = getOldest(engine, 'O');
  const movementForPlayer = isMovementPhase(engine, 'X');
  const winningLine =
    engine.winner && engine.winner !== 'draw' ? findWinningLine(engine.board, engine.winner) : null;
  const winningSet = new Set(winningLine ?? []);

  return (
    <div
      className="ghost-game-board"
      role="group"
      aria-label="Ghost Grid board"
    >
      {engine.board.map((mark, i) => {
        const isEmpty = mark === null;
        const isGhost = (mark === 'X' && i === playerOldest) || (mark === 'O' && i === botOldest);
        const isDestination = interactive && isEmpty;
        const isWin = winningSet.has(i);

        return (
          <button
            key={i}
            type="button"
            onClick={() => isDestination && onCellTap(i)}
            disabled={!isDestination}
            aria-label={
              mark
                ? `${markLabel[mark]} mark${isGhost ? ', fading — must move next' : ''}`
                : isDestination
                  ? 'Empty cell, tap to play here'
                  : 'Empty cell'
            }
            className={`ghost-game-cell${isWin ? ' is-win' : ''}${isDestination ? ' is-open' : ''}`}
          >
            {isDestination && movementForPlayer && (
              <span
                aria-hidden="true"
                className="ghost-game-cell__hint"
              />
            )}

            {mark && (
              <motion.span
                aria-hidden="true"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.6 }}
                animate={{ opacity: isGhost ? 0.45 : 1, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className={
                  isGhost && !reducedMotion ? `font-display ${styles.ghost}` : 'font-display'
                }
                style={{
                  fontSize: 'clamp(2.4rem, 10vw, 4rem)',
                  color: markColor[mark],
                  outline: isGhost && reducedMotion ? `2px dashed ${markColor[mark]}` : undefined,
                  outlineOffset: isGhost && reducedMotion ? 3 : undefined,
                  borderRadius: isGhost && reducedMotion ? 8 : undefined,
                  padding: isGhost && reducedMotion ? '0 6px' : undefined,
                }}
              >
                {mark}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}
