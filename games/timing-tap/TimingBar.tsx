'use client';

import { motion, MotionValue, useReducedMotion, useTransform } from 'framer-motion';

export interface TimingBarProps {
  position: MotionValue<number>;
  /** Perfect Zone half-width in bar-percent. */
  zoneHalfWidth: number;
  /** Neon colour for the indicator and bar glow. */
  beam: string;
  /** Dims/freezes the bar once the round is over. */
  frozen: boolean;
  /** Perfect-tap slow-motion hold. */
  slowMotion: boolean;
  /** Final position to mark once frozen, 0–100; null while running. */
  markerPosition: number | null;
}

/** Decorative rhythm marks only — 0/50/100 already read from the zone's
 *  centre line and the bar's own edges, so these stay unlabeled. */
const TICKS = [10, 20, 30, 40, 60, 70, 80, 90];

export function TimingBar({
  position,
  zoneHalfWidth,
  beam,
  frozen,
  slowMotion,
  markerPosition,
}: TimingBarProps) {
  const reducedMotion = useReducedMotion();
  // Bound straight to the MotionValue so the beam moves at 60fps without
  // ever re-rendering this component.
  const left = useTransform(position, (p) => `${p}%`);

  return (
    <div className="timing-stage" style={{ '--beam': beam } as React.CSSProperties}>
      <div
        className="timing-bar"
        data-frozen={frozen ? 'true' : undefined}
        data-slow-motion={slowMotion ? 'true' : undefined}
      >
        {TICKS.map((t) => (
          <span
            key={t}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-px h-2.5 bg-white/15"
            style={{ left: `${t}%` }}
          />
        ))}

        <div
          className="timing-zone"
          style={{
            left: `${50 - zoneHalfWidth}%`,
            width: `${zoneHalfWidth * 2}%`,
            // The app-wide reduced-motion rule already neutralises this via
            // animation-duration, but useReducedMotion is the contract's
            // explicit signal, so honour it here too rather than lean only
            // on the global CSS backstop.
            animation: reducedMotion ? 'none' : undefined,
          }}
        />

        {markerPosition !== null && (
          <>
            {/* Distance bracket: a thin line from centre to the marker, so a
                miss reads as "this far off" rather than a lone floating tick. */}
            <span
              className="absolute top-1/2 -translate-y-1/2 h-px bg-white/35"
              style={{
                left: `${Math.min(50, markerPosition)}%`,
                width: `${Math.abs(50 - markerPosition)}%`,
              }}
            />
            <div className="timing-marker" style={{ left: `${markerPosition}%` }} />
          </>
        )}

        <motion.div
          className="timing-indicator"
          style={{ left, x: '-50%' }}
          animate={{ scale: slowMotion ? 1.5 : 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        >
          {!reducedMotion && (
            <span
              aria-hidden
              className="absolute inset-y-0 rounded-[inherit]"
              style={{ left: -10, right: -10, background: 'var(--beam)', opacity: 0.25, filter: 'blur(6px)' }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
