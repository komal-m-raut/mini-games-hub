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
  /** Outcome colour for the landing marker; falls back to white. */
  markerTone?: string;
}

/** Decorative rhythm marks only — 0/50/100 already read from the zone's
 *  centre line and the bar's own edges, so these stay unlabeled. The
 *  quarters are flagged `major` so the track still has a readable scale. */
const TICKS = [10, 20, 25, 30, 40, 60, 70, 75, 80, 90];
const MAJOR_TICKS = new Set([25, 75]);

export function TimingBar({
  position,
  zoneHalfWidth,
  beam,
  frozen,
  slowMotion,
  markerPosition,
  markerTone,
}: TimingBarProps) {
  const reducedMotion = useReducedMotion();
  // Bound straight to the MotionValue so the beam moves at 60fps without
  // ever re-rendering this component.
  const left = useTransform(position, (p) => `${p}%`);
  // Same trick for the "beam is inside the zone right now" cue: derived on
  // the MotionValue, so the live highlight costs zero React renders.
  const inZone = useTransform(position, (p) => (Math.abs(p - 50) <= zoneHalfWidth ? 1 : 0));

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
            className="timing-tick"
            data-major={MAJOR_TICKS.has(t) ? 'true' : undefined}
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

        {/* Unmounted rather than faded out once the round ends: gating this
            inside the transform would bake `frozen` into a closure the
            MotionValue subscription doesn't necessarily re-read. */}
        {!frozen && (
          <motion.div
            aria-hidden
            className="timing-zone-flare"
            style={{
              left: `${50 - zoneHalfWidth}%`,
              width: `${zoneHalfWidth * 2}%`,
              opacity: inZone,
            }}
          />
        )}

        <span className="timing-centerline" />

        {markerPosition !== null && (
          <>
            {/* Distance bracket: a thin line from centre to the marker, so a
                miss reads as "this far off" rather than a lone floating tick. */}
            <motion.span
              className="timing-delta"
              style={
                {
                  left: `${Math.min(50, markerPosition)}%`,
                  '--tone': markerTone ?? '#fff',
                } as React.CSSProperties
              }
              initial={{ width: 0 }}
              animate={{ width: `${Math.abs(50 - markerPosition)}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.35, ease: 'easeOut' }}
            />
            <motion.div
              className="timing-marker"
              // x lives here, not in CSS: animating `y` makes Framer own the
              // whole transform, so a class-level translateX(-50%) would be
              // silently dropped and the caret would sit half a width off.
              style={
                { left: `${markerPosition}%`, x: '-50%', '--tone': markerTone } as never
              }
              initial={reducedMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            />
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
