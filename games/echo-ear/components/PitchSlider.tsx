'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MAX_FREQ,
  MIN_FREQ,
  applyCents,
  frequencyToPosition,
  pitchDescriptor,
  positionToFrequency,
} from '../constants';

interface PitchSliderProps {
  /** Current pitch, Hz. */
  value: number;
  onChange: (freq: number) => void;
  accent: string;
  disabled?: boolean;
}

/** Keyboard step sizes, in cents — matches the spec's ↑/↓ and PageUp/Down. */
const ARROW_CENTS = 5;
const PAGE_CENTS = 50;

const EASE_STANDARD = [0.2, 0, 0, 1] as const;

/**
 * A large vertical pitch slider — a custom control rather than a native
 * `<input type="range">` because (a) vertical range inputs aren't reliably
 * stylable cross-browser and (b) the value maps log-linearly onto frequency,
 * which a native input has no notion of. Pointer Events cover mouse, pen and
 * touch drag in one handler; keyboard support is added by hand (arrow/page
 * keys move in cents, not raw slider percent, so the step feels the same at
 * every position on the log scale).
 *
 * The track itself is the interface: near-full-height, a fat touch area, a
 * dark-low-to-bright-high frequency gradient, and a glowing thumb that
 * follows the pointer directly (no lag) while easing in on keyboard steps.
 * Nothing here reveals the Hz value on screen — this is a match-by-ear
 * control, and `pitchDescriptor` keeps the a11y string non-numeric too.
 */
export function PitchSlider({ value, onChange, accent, disabled = false }: PitchSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const reducedMotion = useReducedMotion();

  const freqFromClientY = useCallback(
    (clientY: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      // Top of the track is the highest pitch, bottom is the lowest.
      const ratio = 1 - (clientY - rect.top) / rect.height;
      return positionToFrequency(ratio);
    },
    [value]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    trackRef.current?.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setIsDragging(true);
    onChange(freqFromClientY(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled) return;
    onChange(freqFromClientY(e.clientY));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    setIsDragging(false);
    if (trackRef.current?.hasPointerCapture(e.pointerId)) {
      trackRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let cents = 0;
    if (e.key === 'ArrowUp' || e.key === 'Right') cents = ARROW_CENTS;
    else if (e.key === 'ArrowDown' || e.key === 'Left') cents = -ARROW_CENTS;
    else if (e.key === 'PageUp') cents = PAGE_CENTS;
    else if (e.key === 'PageDown') cents = -PAGE_CENTS;
    else return;
    e.preventDefault();
    onChange(applyCents(value, cents));
  };

  const thumbPercent = (1 - frequencyToPosition(value)) * 100;
  const dark = `color-mix(in srgb, ${accent} 50%, #05050f)`;
  const bright = `color-mix(in srgb, ${accent} 55%, white)`;
  const thumbSize = 56;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <span className="text-ink-4 text-2xs font-ui uppercase tracking-[0.2em]">High</span>
      <motion.div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-orientation="vertical"
        aria-label="Pitch — drag or use the arrow keys to adjust, then confirm your match"
        aria-valuemin={MIN_FREQ}
        aria-valuemax={MAX_FREQ}
        aria-valuenow={Math.round(value)}
        aria-valuetext={pitchDescriptor(value)}
        aria-disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={handleKeyDown}
        animate={{ scale: isDragging ? 0.98 : 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.2, ease: EASE_STANDARD }}
        className="relative w-20 sm:w-24 h-[55vh] min-h-[380px] max-h-[560px] rounded-full touch-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={
          {
            background: `linear-gradient(180deg, ${bright} 0%, ${accent} 45%, ${dark} 100%)`,
            boxShadow: 'inset 0 2px 14px rgba(0,0,0,0.35), inset 0 -2px 10px rgba(0,0,0,0.2)',
            opacity: disabled ? 0.4 : 1,
            '--tw-ring-color': accent,
          } as React.CSSProperties
        }
      >
        <div
          className="absolute left-1/2 rounded-full"
          style={{
            top: `${thumbPercent}%`,
            width: thumbSize,
            height: thumbSize,
            transition: isDragging
              ? 'none'
              : `top ${reducedMotion ? '0ms' : '160ms'} cubic-bezier(0.2, 0, 0, 1), transform 200ms cubic-bezier(0.2, 0, 0, 1)`,
            transform: `translate(-50%, -50%) scale(${isDragging ? 1.15 : 1})`,
            background: `radial-gradient(circle at 35% 30%, #fff, ${accent} 55%, color-mix(in srgb, ${accent} 70%, black) 100%)`,
            boxShadow: `0 0 0 4px rgba(255,255,255,0.14), 0 0 26px 4px color-mix(in srgb, ${accent} 80%, transparent), 0 10px 22px rgba(0,0,0,0.45)`,
          }}
          aria-hidden="true"
        />
      </motion.div>
      <span className="text-ink-4 text-2xs font-ui uppercase tracking-[0.2em]">Low</span>
    </div>
  );
}
