'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Play } from 'lucide-react';

interface ListenOrbProps {
  /** Difficulty colour — the orb's whole identity, no border needed. */
  accent: string;
  disabled: boolean;
  /** Plays the target tone; the orb owns its own "is sounding" timer so the
   *  rings can sync to it without the hook needing to expose playback state. */
  onPlay: () => void;
  /** How long the target tone actually sounds for, ms — keeps the ring
   *  animation locked to the real tone length instead of a guessed value. */
  durationMs: number;
  replaysLeft: number;
  /** Total replays the difficulty allows, beyond the first free listen. */
  totalReplays: number;
  hasListened: boolean;
}

/**
 * The one focal element of the Listen phase: a huge circular play surface
 * that emits concentric rings timed to the tone while it sounds, with the
 * replay budget shown as quiet dots rather than a text chip.
 */
export function ListenOrb({
  accent,
  disabled,
  onPlay,
  durationMs,
  replaysLeft,
  totalReplays,
  hasListened,
}: ListenOrbProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const handleClick = () => {
    if (disabled) return;
    onPlay();
    setIsPlaying(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsPlaying(false), durationMs);
  };

  const statusText = !hasListened
    ? 'Tap to hear the target pitch'
    : replaysLeft > 0
      ? `${replaysLeft} ${replaysLeft === 1 ? 'replay' : 'replays'} left`
      : 'No replays left';

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative grid place-items-center w-56 h-56 sm:w-64 sm:h-64">
        {!reducedMotion &&
          isPlaying &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={`ring-${i}`}
              className="absolute inset-0 rounded-full border-2"
              style={{ borderColor: accent }}
              initial={{ opacity: 0.55, scale: 0.7 }}
              animate={{ opacity: 0, scale: 1.4 }}
              transition={{
                duration: durationMs / 1000,
                delay: (i * durationMs) / 1000 / 3.4,
                ease: [0.2, 0, 0, 1],
              }}
            />
          ))}

        <motion.button
          onClick={handleClick}
          disabled={disabled}
          aria-label="Play the target pitch"
          className="relative grid place-items-center w-full h-full rounded-full disabled:opacity-40"
          style={{
            background: `radial-gradient(circle at 35% 28%, color-mix(in srgb, ${accent} 45%, white), ${accent} 55%, color-mix(in srgb, ${accent} 65%, black) 100%)`,
            boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 35%, transparent), 0 28px 60px -16px color-mix(in srgb, ${accent} 70%, transparent), inset 0 2px 14px rgba(255,255,255,0.28)`,
          }}
          whileTap={disabled ? undefined : { scale: 0.97 }}
          animate={{ scale: isPlaying ? 1.015 : 1 }}
          transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
        >
          <Play
            className="w-14 h-14 sm:w-16 sm:h-16 ml-2"
            style={{ color: '#fff' }}
            strokeWidth={1.5}
            fill="#fff"
          />
        </motion.button>
      </div>

      {!hasListened && (
        <p className="text-ink-3 text-xs font-ui uppercase tracking-widest">
          Tap to hear the target pitch
        </p>
      )}

      {totalReplays > 0 ? (
        <div className="flex items-center gap-2.5" aria-hidden="true">
          {Array.from({ length: totalReplays }, (_, i) => {
            const filled = i < replaysLeft;
            return (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: 7,
                  height: 7,
                  background: filled ? accent : 'var(--color-line-2)',
                  boxShadow: filled ? `0 0 8px color-mix(in srgb, ${accent} 70%, transparent)` : 'none',
                  transitionDuration: '200ms',
                  transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
                }}
              />
            );
          })}
        </div>
      ) : (
        hasListened && (
          <p className="text-ink-4 text-2xs font-ui uppercase tracking-[0.2em]">Single listen</p>
        )
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {statusText}
      </span>
    </div>
  );
}
