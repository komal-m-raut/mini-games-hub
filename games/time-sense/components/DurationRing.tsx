'use client';

interface DurationRingProps {
  /** 0–100 fill percentage, driven by the same clock as the SHOW phase. */
  percent: number;
  /** Live "X.XXs" readout rendered huge in the ring's center. */
  secondsLabel: string;
  color: string;
  glow: string;
}

const SIZE = 280;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const CENTER = SIZE / 2;

/**
 * The single focal element of the SHOW phase: one large ring that sweeps
 * clockwise from 12 o'clock over exactly the target duration, with the
 * live seconds readout in massive type at its center. `percent` comes
 * straight from the hook's own showElapsedMs/targetMs clock — this
 * component only draws it, never derives its own timing.
 */
export function DurationRing({ percent, secondsLabel, color, glow }: DurationRingProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const dashoffset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: 'clamp(220px, 68vw, 320px)', aspectRatio: '1 / 1' }}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full"
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="var(--color-line-1)"
          strokeWidth={STROKE}
        />
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          style={{
            filter: `drop-shadow(0 0 18px ${glow})`,
            transition: 'stroke-dashoffset 0.05s linear',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <span
          className="font-score leading-none tabular-nums text-center"
          style={{ color, fontSize: 'clamp(2.75rem, 12vw, 4rem)' }}
        >
          {secondsLabel}
        </span>
      </div>
    </div>
  );
}
