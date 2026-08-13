'use client';

import { GUESS_WIDTH_MAX, GUESS_WIDTH_MIN, MAX_ROTATION_DEG } from '../constants';
import { GuessGeom } from '../types';

interface ShapeSlidersProps {
  guess: GuessGeom;
  /** Rotation slider is hidden entirely on easy — nothing to recreate. */
  showRotation: boolean;
  color: string;
  onChange: (next: GuessGeom) => void;
  onMoveEnd?: () => void;
}

/**
 * Size (scales width, preserving the target's given aspect ratio) and
 * rotation sliders below the recreate stage. Native range inputs, matching
 * Color Match's `ColorSliders` — pointer, touch and keyboard support come
 * for free from the element itself.
 */
export function ShapeSliders({ guess, showRotation, color, onChange, onMoveEnd }: ShapeSlidersProps) {
  const trackStyle = { '--track': `linear-gradient(90deg, #14141F, ${color})`, '--thumb': color } as React.CSSProperties;

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center gap-3">
        <span className="font-ui text-xs w-16 shrink-0 uppercase tracking-wide text-ink-3">Size</span>
        <input
          type="range"
          min={Math.round(GUESS_WIDTH_MIN * 100)}
          max={Math.round(GUESS_WIDTH_MAX * 100)}
          step={1}
          value={Math.round(guess.width * 100)}
          onChange={(e) => onChange({ ...guess, width: Number(e.target.value) / 100 })}
          onPointerUp={onMoveEnd}
          aria-label="Size"
          aria-valuetext={`${Math.round(guess.width * 100)} percent of stage width`}
          className="color-slider flex-1"
          style={trackStyle}
        />
        <span className="font-score text-sm w-10 shrink-0 text-right tabular-nums text-ink-2">
          {Math.round(guess.width * 100)}%
        </span>
      </div>

      {showRotation && (
        <div className="flex items-center gap-3">
          <span className="font-ui text-xs w-16 shrink-0 uppercase tracking-wide text-ink-3">Rotation</span>
          <input
            type="range"
            min={0}
            max={MAX_ROTATION_DEG}
            step={1}
            value={Math.round(guess.rotation)}
            onChange={(e) => onChange({ ...guess, rotation: Number(e.target.value) })}
            onPointerUp={onMoveEnd}
            aria-label="Rotation"
            aria-valuetext={`${Math.round(guess.rotation)} degrees`}
            className="color-slider flex-1"
            style={trackStyle}
          />
          <span className="font-score text-sm w-10 shrink-0 text-right tabular-nums text-ink-2">
            {Math.round(guess.rotation)}°
          </span>
        </div>
      )}
    </div>
  );
}
