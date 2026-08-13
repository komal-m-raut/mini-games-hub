'use client';

import { GUESS_WIDTH_MAX, GUESS_WIDTH_MIN, MAX_ROTATION_DEG } from '../constants';
import { GuessGeom } from '../types';
import styles from '../styles.module.css';

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
 * rotation sliders below the recreate stage — premium fat tracks (56px tap
 * height) with a clear label and a live value readout above each one, sized
 * for the thumb zone. Native range inputs, matching Color Match's
 * `ColorSliders`: pointer, touch and keyboard support come for free from
 * the element itself.
 */
export function ShapeSliders({ guess, showRotation, color, onChange, onMoveEnd }: ShapeSlidersProps) {
  const trackStyle = {
    '--track': `linear-gradient(90deg, rgba(255, 255, 255, 0.06), ${color})`,
    '--thumb': color,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col gap-5 w-full">
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-baseline justify-between">
          <span className="font-ui text-2xs uppercase tracking-widest text-ink-3">Size</span>
          <span className="font-score text-sm text-ink-1 tabular-nums">
            {Math.round(guess.width * 100)}%
          </span>
        </div>
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
          className={styles.fatSlider}
          style={trackStyle}
        />
      </div>

      {showRotation && (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-baseline justify-between">
            <span className="font-ui text-2xs uppercase tracking-widest text-ink-3">Rotation</span>
            <span className="font-score text-sm text-ink-1 tabular-nums">
              {Math.round(guess.rotation)}°
            </span>
          </div>
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
            className={styles.fatSlider}
            style={trackStyle}
          />
        </div>
      )}
    </div>
  );
}
