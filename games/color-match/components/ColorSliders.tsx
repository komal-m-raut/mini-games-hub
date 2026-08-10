'use client';

import { CHANNEL_MAX, RGB } from '../colorMath';

interface ColorSlidersProps {
  color: RGB;
  onChange: (channel: keyof RGB, value: number) => void;
}

/** Standard channel ramps: black to the pure channel colour. */
const CHANNELS: Array<{ key: keyof RGB; label: string; name: string; ramp: string }> = [
  { key: 'r', label: 'R', name: 'Red', ramp: '#FF4D4D' },
  { key: 'g', label: 'G', name: 'Green', ramp: '#4DE07A' },
  { key: 'b', label: 'B', name: 'Blue', ramp: '#4D8DFF' },
];

/**
 * One range input per channel. Native inputs bring pointer, touch and keyboard
 * support for free, which a custom handle would have to reimplement.
 */
export function ColorSliders({ color, onChange }: ColorSlidersProps) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {CHANNELS.map(({ key, label, name, ramp }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="font-score text-sm w-4 shrink-0 text-center" aria-hidden="true">
            {label}
          </span>

          <input
            type="range"
            min={0}
            max={CHANNEL_MAX}
            step={1}
            value={color[key]}
            onChange={(e) => onChange(key, Number(e.target.value))}
            aria-label={name}
            aria-valuetext={`${name} ${color[key]} of ${CHANNEL_MAX}`}
            className="color-slider flex-1"
            style={
              {
                '--track': `linear-gradient(90deg, #14141F, ${ramp})`,
                '--thumb': ramp,
              } as React.CSSProperties
            }
          />

          <span className="font-score text-sm w-9 shrink-0 text-right tabular-nums text-ink-2">
            {color[key]}
          </span>
        </div>
      ))}
    </div>
  );
}
