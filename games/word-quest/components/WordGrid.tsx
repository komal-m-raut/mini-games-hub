'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MAX_GUESSES, TILE_STAGGER_MS, WORD_LENGTH } from '../constants';
import { GuessRow } from '../engine';
import styles from '../styles.module.css';
import { Tile } from './Tile';

interface WordGridProps {
  rows: GuessRow[];
  currentGuess: string;
  /** Bumped on every rejected submit — retriggers the active row's shake. */
  invalidNonce: number;
  /** True once the round has been won, so the final row can bounce once its
   *  reveal finishes. */
  solved: boolean;
}

/**
 * The 6×5 guess grid. Tracks its own cascading flip-reveal for whichever row
 * was most recently submitted — earlier rows are already fully revealed and
 * just render statically — plus the shake-on-invalid and win-bounce cues.
 */
export function WordGrid({ rows, currentGuess, invalidNonce, solved }: WordGridProps) {
  const reducedMotion = useReducedMotion();

  // How many tiles of the *last submitted* row have flipped to their final
  // colour. Reset synchronously during render whenever a fresh row lands —
  // React's documented pattern for "adjusting state when a prop changes"
  // (react.dev/learn/you-might-not-need-an-effect) — rather than inside a
  // useEffect, since a *synchronous* setState at an effect's top level
  // triggers an extra, avoidable render pass (react-hooks/set-state-in-effect).
  const [revealCount, setRevealCount] = useState(rows.length > 0 ? WORD_LENGTH : 0);
  const [countedRows, setCountedRows] = useState(rows.length);
  if (rows.length !== countedRows) {
    setCountedRows(rows.length);
    setRevealCount(rows.length === 0 || reducedMotion ? (rows.length === 0 ? 0 : WORD_LENGTH) : 0);
  }

  // The actual side effect: stagger `revealCount` up to WORD_LENGTH over
  // time for a freshly-landed row. Every setState here is deferred inside a
  // setTimeout callback, not called synchronously in the effect body, so
  // this is the "subscribe to an external clock" shape the lint rule wants.
  useEffect(() => {
    if (rows.length === 0 || reducedMotion) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < WORD_LENGTH; i++) {
      timers.push(
        setTimeout(() => setRevealCount((c) => Math.max(c, i + 1)), i * TILE_STAGGER_MS + 140)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [rows.length, reducedMotion]);

  const activeRowIndex = rows.length < MAX_GUESSES ? rows.length : -1;
  const lastRowIndex = rows.length - 1;
  const lastRowFullyRevealed = revealCount >= WORD_LENGTH;

  return (
    <div
      className="grid gap-1.5 sm:gap-2 w-full max-w-[320px] sm:max-w-[340px] mx-auto"
      role="grid"
      aria-label="Guess grid"
    >
      {Array.from({ length: MAX_GUESSES }, (_, r) => {
        const row = rows[r];
        const isActive = r === activeRowIndex;
        const isLastSubmitted = r === lastRowIndex;

        const letters = row
          ? row.guess.split('')
          : isActive
            ? Array.from({ length: WORD_LENGTH }, (_, i) => currentGuess[i] ?? '')
            : Array(WORD_LENGTH).fill('');

        return (
          <div
            // Remounting on every rejected submit (via the nonce in the key)
            // restarts the CSS shake animation for free — no timer/state
            // needed to track "is it currently shaking".
            key={isActive ? `${r}-${invalidNonce}` : r}
            role="row"
            className={cn('grid grid-cols-5 gap-1.5 sm:gap-2', isActive && !reducedMotion && styles.shake)}
          >
            {letters.map((letter, c) => {
              const revealed = row ? (isLastSubmitted ? c < revealCount : true) : false;
              const state = row ? row.result[c] : letter ? 'filled' : 'empty';
              const celebrate = solved && isLastSubmitted && lastRowFullyRevealed;
              return (
                <Tile
                  key={c}
                  letter={letter}
                  state={state}
                  revealed={revealed}
                  celebrate={celebrate}
                  celebrateDelayMs={c * 80}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
