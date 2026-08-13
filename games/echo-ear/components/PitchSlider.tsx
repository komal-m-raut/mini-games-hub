'use client';

import { useCallback, useRef } from 'react';
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

/**
 * A large vertical pitch slider — a custom control rather than a native
 * `<input type="range">` because (a) vertical range inputs aren't reliably
 * stylable cross-browser and (b) the value maps log-linearly onto frequency,
 * which a native input has no notion of. Pointer Events cover mouse, pen and
 * touch drag in one handler; keyboard support is added by hand (arrow/page
 * keys move in cents, not raw slider percent, so the step feels the same at
 * every position on the log scale).
 */
export function PitchSlider({ value, onChange, accent, disabled = false }: PitchSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const freqFromClientY = useCallback((clientY: number) => {
    const el = trackRef.current;
    if (!el) return value;
    const rect = el.getBoundingClientRect();
    // Top of the track is the highest pitch, bottom is the lowest.
    const ratio = 1 - (clientY - rect.top) / rect.height;
    return positionToFrequency(ratio);
  }, [value]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    trackRef.current?.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    onChange(freqFromClientY(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || disabled) return;
    onChange(freqFromClientY(e.clientY));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
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

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <span className="text-ink-3 text-xs font-ui uppercase tracking-widest">High</span>
      <div
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
        className="relative w-14 h-64 sm:h-80 rounded-full touch-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        style={
          {
            background: `linear-gradient(180deg, ${accent}55, #14141F)`,
            border: `1px solid ${accent}40`,
            opacity: disabled ? 0.5 : 1,
            '--tw-ring-color': accent,
          } as React.CSSProperties
        }
      >
        <div
          className="absolute left-1/2 w-10 h-10 rounded-full shadow-lg -translate-x-1/2 -translate-y-1/2"
          style={{
            top: `${thumbPercent}%`,
            background: accent,
            boxShadow: `0 0 16px ${accent}80`,
          }}
          aria-hidden="true"
        />
      </div>
      <span className="text-ink-3 text-xs font-ui uppercase tracking-widest">Low</span>
    </div>
  );
}
