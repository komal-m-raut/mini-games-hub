'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface PitchOffsetDialProps {
  /** Signed cents offset: negative = flat (low), positive = sharp (high). */
  cents: number;
  /** Cents error at which the needle reaches full deflection — the round's
   *  difficulty divisor * 100, same scale the score itself was computed on. */
  maxCents: number;
  color: string;
}

const SIZE = 216;
const CENTER = SIZE / 2;
const RADIUS = 90;
const STROKE = 10;

/** Point on the arc at `angleDeg`, measured from straight up (0deg),
 *  positive rotating clockwise (toward sharp / right). */
function pointAt(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function arcPath(fromDeg: number, toDeg: number, radius: number) {
  const start = pointAt(fromDeg, radius);
  const end = pointAt(toDeg, radius);
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/**
 * A semicircular gauge for the result screen: needle left = flat, right =
 * sharp, dead centre = perfect. Reads at a glance, in the same spirit as a
 * tuner needle, rather than making the player parse a signed number.
 */
export function PitchOffsetDial({ cents, maxCents, color }: PitchOffsetDialProps) {
  const reducedMotion = useReducedMotion();
  const clamped = Math.max(-maxCents, Math.min(maxCents, cents));
  const angle = maxCents > 0 ? (clamped / maxCents) * 90 : 0;
  const viewH = SIZE / 2 + 18;

  return (
    <div className="flex flex-col items-center" style={{ width: SIZE }}>
      <svg width={SIZE} height={viewH} viewBox={`0 0 ${SIZE} ${viewH}`} aria-hidden="true">
        <path
          d={arcPath(-90, 90, RADIUS)}
          fill="none"
          stroke="var(--color-line-2)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={arcPath(-12, 12, RADIUS)}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          opacity={0.45}
        />
        {[-90, 0, 90].map((deg) => {
          const inner = pointAt(deg, RADIUS - STROKE * 0.9);
          const outer = pointAt(deg, RADIUS + STROKE * 0.6);
          return (
            <line
              key={deg}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="var(--color-line-2)"
              strokeWidth={2}
            />
          );
        })}
        <motion.line
          x1={CENTER}
          y1={CENTER}
          x2={CENTER}
          y2={CENTER - RADIUS + 16}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          initial={{ rotate: 0 }}
          animate={{ rotate: angle }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 130, damping: 15, delay: 0.15 }
          }
        />
        <circle cx={CENTER} cy={CENTER} r={6} fill={color} />
      </svg>
      <div className="flex justify-between w-full -mt-1 px-3 text-2xs font-ui uppercase tracking-widest text-ink-4">
        <span>Flat</span>
        <span>Sharp</span>
      </div>
    </div>
  );
}
