'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';

/**
 * SVG glass with animated liquid.
 *
 * Geometry is fixed in a 100×150 viewBox: the tumbler tapers from the rim
 * (y=14) to the base (y=132). Liquid is drawn as a full-width rect clipped
 * to the interior, so the taper comes for free and only the top edge needs
 * to move. The wave is a double-width path translated horizontally, which
 * is far cheaper than animating path `d` strings each frame.
 */

const RIM_Y = 17;
const BASE_Y = 129;
const SPAN = BASE_Y - RIM_Y;

/** Liquid surface Y for a fill percentage. */
function surfaceY(fill: number): number {
  return BASE_Y - (SPAN * Math.max(0, Math.min(100, fill))) / 100;
}

interface GlassProps {
  /** Current fill, 0–100. */
  fill: number;
  color: string;
  /** Render scale — Easy uses a bigger glass. */
  scale?: number;
  /** Liquid stream + bubbles while the player holds. */
  pouring?: boolean;
  /** Ripple burst after the pour stops. */
  rippling?: boolean;
  /** Dim label under the glass, e.g. "Target". */
  label?: string;
  /** Smooth the level change (used for the automatic target fill). */
  animateFill?: boolean;
}

export function Glass({
  fill,
  color,
  scale = 1,
  pouring = false,
  rippling = false,
  label,
  animateFill = false,
}: GlassProps) {
  // useId keeps gradient/clip ids unique when several glasses share a screen
  const uid = useId().replace(/:/g, '');
  const clipId = `clip-${uid}`;
  const liquidId = `liquid-${uid}`;
  const glassId = `glass-${uid}`;
  const glowId = `glow-${uid}`;

  const y = surfaceY(fill);
  const width = 150 * scale;
  const height = 225 * scale;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div style={{ width, height }} className="relative">
        <svg
          viewBox="0 0 100 150"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Interior region — every drop of liquid is clipped to this */}
            <clipPath id={clipId}>
              <path d={`M23 ${RIM_Y} L77 ${RIM_Y} L68 ${BASE_Y} Q50 133 32 ${BASE_Y} Z`} />
            </clipPath>

            <linearGradient id={liquidId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={color} stopOpacity="0.65" />
            </linearGradient>

            {/* Glass body sheen */}
            <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="18%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="82%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
            </linearGradient>

            <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Soft glow behind the glass, brighter as it fills */}
          <ellipse
            cx="50"
            cy="120"
            rx="34"
            ry="12"
            fill={color}
            opacity={0.05 + (fill / 100) * 0.22}
            filter={`url(#${glowId})`}
          />

          {/* Glass interior tint */}
          <path
            d={`M23 ${RIM_Y} L77 ${RIM_Y} L68 ${BASE_Y} Q50 133 32 ${BASE_Y} Z`}
            fill={`url(#${glassId})`}
          />

          {/* ── Liquid ── */}
          <g clipPath={`url(#${clipId})`}>
            <motion.g
              animate={{ y }}
              initial={false}
              transition={
                animateFill
                  ? { type: 'spring', stiffness: 90, damping: 18 }
                  : { duration: 0 }
              }
            >
              {/* Body: drawn from the surface down past the base */}
              <rect x="0" y="0" width="100" height="150" fill={`url(#${liquidId})`} />

              {/* Surface wave — double width, slid left on a loop */}
              <motion.path
                d="M-100 0 Q-75 -3 -50 0 T0 0 T50 0 T100 0 T150 0 L150 6 L-100 6 Z"
                fill={color}
                opacity={0.9}
                animate={{ x: [0, 50] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
              {/* Bright meniscus line */}
              <rect x="0" y="-1" width="100" height="1.6" fill="#fff" opacity="0.35" />
            </motion.g>

            {/* Bubbles rise only while pouring */}
            {pouring &&
              BUBBLES.map((b, i) => (
                <motion.circle
                  key={i}
                  cx={b.cx}
                  r={b.r}
                  fill="#fff"
                  opacity={0.4}
                  initial={{ cy: BASE_Y - 4 }}
                  animate={{ cy: y + 4, opacity: [0, 0.45, 0] }}
                  transition={{
                    duration: b.dur,
                    repeat: Infinity,
                    delay: b.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}

            {/* Ripple rings when the pour stops */}
            {rippling && (
              <>
                <motion.ellipse
                  cx="50"
                  cy={y}
                  rx="6"
                  ry="2"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1"
                  initial={{ opacity: 0.6, scale: 0.4 }}
                  animate={{ opacity: 0, scale: 2.6 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  style={{ transformOrigin: `50px ${y}px` }}
                />
                <motion.ellipse
                  cx="50"
                  cy={y}
                  rx="6"
                  ry="2"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.8"
                  initial={{ opacity: 0.5, scale: 0.3 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 0.7, delay: 0.12, ease: 'easeOut' }}
                  style={{ transformOrigin: `50px ${y}px` }}
                />
              </>
            )}
          </g>

          {/* ── Glass outline & highlights (drawn over the liquid) ── */}
          <path
            d={`M20 14 L23 ${RIM_Y} L32 ${BASE_Y} Q50 133 68 ${BASE_Y} L77 ${RIM_Y} L80 14`}
            fill="none"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Rim ellipse gives the tumbler its opening */}
          <ellipse
            cx="50"
            cy="14"
            rx="30"
            ry="4.5"
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.55)"
            strokeWidth="1.4"
          />
          {/* Vertical shine streaks */}
          <path
            d={`M31 24 L38 ${BASE_Y - 12}`}
            stroke="rgba(255,255,255,0.28)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={`M69 30 L64 ${BASE_Y - 24}`}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* Pour stream from above the rim down into the liquid */}
          {pouring && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <motion.rect
                x="47.5"
                y="-30"
                width="5"
                height={Math.max(8, y + 30)}
                rx="2.5"
                fill={color}
                opacity="0.8"
                animate={{ opacity: [0.65, 0.9, 0.65] }}
                transition={{ duration: 0.35, repeat: Infinity }}
              />
              {/* Splash dots where the stream meets the surface */}
              <motion.circle
                cx="45"
                cy={y}
                r="1.6"
                fill={color}
                animate={{ cy: [y, y - 6], cx: [47, 42], opacity: [0.9, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
              <motion.circle
                cx="55"
                cy={y}
                r="1.4"
                fill={color}
                animate={{ cy: [y, y - 5], cx: [53, 58], opacity: [0.9, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
              />
            </motion.g>
          )}
        </svg>
      </div>

      {label && (
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">{label}</p>
      )}
    </div>
  );
}

/** Fixed bubble lanes — deterministic so SSR and hydration agree. */
const BUBBLES = [
  { cx: 40, r: 1.4, dur: 1.6, delay: 0 },
  { cx: 58, r: 1.1, dur: 1.9, delay: 0.35 },
  { cx: 48, r: 1.7, dur: 1.4, delay: 0.7 },
  { cx: 63, r: 1.2, dur: 2.1, delay: 1.0 },
  { cx: 36, r: 1.0, dur: 1.7, delay: 1.35 },
];

/** Side-by-side target vs poured comparison for the results screen. */
export function GlassComparison({
  target,
  actual,
  color,
  scale = 0.72,
}: {
  target: number;
  actual: number;
  color: string;
  scale?: number;
}) {
  return (
    <div className="flex items-end justify-center gap-8 sm:gap-14 py-4">
      <Glass fill={target} color={color} scale={scale} label="Target" />
      <Glass fill={actual} color={color} scale={scale} label="Yours" />
    </div>
  );
}
