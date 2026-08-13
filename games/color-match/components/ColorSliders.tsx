'use client';

import { RefObject } from 'react';
import { CHANNEL_MAX, RGB, rgbToCss } from '../colorMath';
import { CHANNEL_META } from './channelMeta';

interface ColorSlidersProps {
  color: RGB;
  onChange: (channel: keyof RGB, value: number) => void;
  /** The big preview swatch's DOM node — written to directly on every drag
   * tick so the fill can't ever lag behind the thumb (see MixPreview). */
  previewRef?: RefObject<HTMLDivElement | null>;
}

/** Keyboard steps: plain arrows move ±1, Shift+arrow jumps ±10. */
const ARROW_STEP = 1;
const SHIFT_STEP = 10;

const clampChannel = (n: number) => Math.min(CHANNEL_MAX, Math.max(0, n));

/**
 * Each track sweeps across its own channel's full range while holding the
 * *other two* channels at their current value — so the gradient always shows
 * exactly what every point on the track would produce right now, and moves
 * live as the other sliders change. A static black→pure-hue ramp (the old
 * behaviour) looks identical no matter what you've already mixed, which is
 * part of why the sliders read as inert.
 */
function trackGradient(key: keyof RGB, color: RGB): string {
  const lo = rgbToCss({ ...color, [key]: 0 });
  const hi = rgbToCss({ ...color, [key]: CHANNEL_MAX });
  return `linear-gradient(90deg, ${lo}, ${hi})`;
}

/**
 * One range input per channel. Native inputs bring pointer, touch and
 * keyboard support for free, which a custom handle would have to
 * reimplement — see PitchSlider for the case where that trade is worth it
 * (a log-scale, vertical control); a linear 0–255 mixer isn't that case.
 */
export function ColorSliders({ color, onChange, previewRef }: ColorSlidersProps) {
  const handleInput =
    (key: keyof RGB) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      // Paint the preview straight from the DOM event, before React's
      // render even lands — the state update below still happens on the
      // same tick, this just removes any dependency on how much else has
      // to reconcile first.
      if (previewRef?.current) {
        previewRef.current.style.backgroundColor = rgbToCss({ ...color, [key]: value });
      }
      onChange(key, value);
    };

  const handleKeyDown =
    (key: keyof RGB, value: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!e.shiftKey) return; // plain arrows already step by 1 natively
      let delta = 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') delta = SHIFT_STEP;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') delta = -SHIFT_STEP;
      else return;
      e.preventDefault();
      const next = clampChannel(value + delta);
      if (previewRef?.current) {
        previewRef.current.style.backgroundColor = rgbToCss({ ...color, [key]: next });
      }
      onChange(key, next);
    };

  return (
    <div className="flex flex-col gap-5 w-full">
      {CHANNEL_META.map(({ key, label, name, ramp }) => (
        <div key={key} className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <span
              className="font-score text-sm font-semibold tracking-wide"
              style={{ color: ramp }}
              aria-hidden="true"
            >
              {label}
            </span>
            <span className="font-score text-lg tabular-nums text-ink-1">
              {color[key]}
              <span className="text-ink-4 text-xs">/{CHANNEL_MAX}</span>
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={CHANNEL_MAX}
            step={ARROW_STEP}
            value={color[key]}
            onChange={handleInput(key)}
            onKeyDown={handleKeyDown(key, color[key])}
            aria-label={`${name} channel — arrow keys move by 1, shift+arrow by 10`}
            aria-valuetext={`${name} ${color[key]} of ${CHANNEL_MAX}`}
            className="color-slider w-full"
            style={
              {
                '--track': trackGradient(key, color),
                '--thumb': ramp,
              } as React.CSSProperties
            }
          />
        </div>
      ))}
    </div>
  );
}
