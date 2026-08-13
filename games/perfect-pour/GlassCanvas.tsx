'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';

/**
 * SVG glass with animated liquid and an optional faucet.
 *
 * Glass geometry lives in a 100×150 region: the tumbler tapers from the rim
 * (y=17) to the base (y=129). Liquid is a full-width rect clipped to the
 * interior, so the taper comes for free and only the top edge moves.
 *
 * When `faucet` is set the viewBox gains headroom above the glass (negative
 * y) for a chrome tap, and — while `pouring` — a natural water stream falls
 * from the spout to the liquid surface, with falling droplets, a splash
 * crown and ripples where it meets the water. The glass body renders at the
 * same on-screen size with or without the faucet (the container just grows
 * taller upward), so there's no size jump between the observe and pour
 * phases.
 */

const RIM_Y = 17;
const BASE_Y = 129;
const SPAN = BASE_Y - RIM_Y;

/** Spout opening — where every drop of water originates. */
const SPOUT_X = 50;
const SPOUT_Y = -12;

/** Liquid surface Y for a fill percentage. */
function surfaceY(fill: number): number {
  return BASE_Y - (SPAN * Math.max(0, Math.min(100, fill))) / 100;
}

/** Tapering water ribbon from the spout down to the surface, with a soft bow. */
function streamPath(bottomY: number): string {
  const ty = SPOUT_Y + 1;
  const wt = 2.3; // half-width at the spout
  const wb = 1.2; // half-width at the surface (stream necks down)
  const bow = 0.9; // gentle lateral lean, so it isn't a rigid line
  const mid = (ty + bottomY) / 2;
  return (
    `M ${SPOUT_X - wt} ${ty} ` +
    `Q ${SPOUT_X - wt + bow} ${mid} ${SPOUT_X - wb} ${bottomY} ` +
    `L ${SPOUT_X + wb} ${bottomY} ` +
    `Q ${SPOUT_X + wt + bow} ${mid} ${SPOUT_X + wt} ${ty} Z`
  );
}

interface GlassProps {
  /** Current fill, 0–100. */
  fill: number;
  color: string;
  /** Render scale — Easy uses a bigger glass. */
  scale?: number;
  /** Liquid stream + bubbles while the player holds the lever. */
  pouring?: boolean;
  /** Ripple burst after the pour stops. */
  rippling?: boolean;
  /** Dim label under the glass, e.g. "Target". */
  label?: string;
  /** Smooth the level change (used for the automatic target fill). */
  animateFill?: boolean;
  /** Draw the faucet above the glass and reserve headroom for it. */
  faucet?: boolean;
}

export function Glass({
  fill,
  color,
  scale = 1,
  pouring = false,
  rippling = false,
  label,
  animateFill = false,
  faucet = false,
}: GlassProps) {
  // useId keeps gradient/clip ids unique when several glasses share a screen
  const uid = useId().replace(/:/g, '');
  const clipId = `clip-${uid}`;
  const liquidId = `liquid-${uid}`;
  const glassId = `glass-${uid}`;
  const glowId = `glow-${uid}`;
  const streamId = `stream-${uid}`;
  const chromeId = `chrome-${uid}`;

  const y = surfaceY(fill);
  const width = 150 * scale;
  // Faucet adds 48 units of headroom above the glass; keep the glass body the
  // same pixel size by growing the box proportionally (uniform SVG scale).
  const height = (faucet ? 297 : 225) * scale;
  const viewBox = faucet ? '0 -48 100 198' : '0 0 100 150';

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div style={{ width, height }} className="relative">
        <svg
          viewBox={viewBox}
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

            {/* Vertical stream gradient — brighter core, softer edges */}
            <linearGradient id={streamId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="18%" stopColor={color} stopOpacity="0.9" />
              <stop offset="100%" stopColor={color} stopOpacity="0.75" />
            </linearGradient>

            {/* Glass body sheen */}
            <linearGradient id={glassId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.16)" />
              <stop offset="18%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="82%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
            </linearGradient>

            {/* Chrome for the faucet */}
            <linearGradient id={chromeId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5b6472" />
              <stop offset="28%" stopColor="#eef2f8" />
              <stop offset="52%" stopColor="#aab2c0" />
              <stop offset="75%" stopColor="#727b8a" />
              <stop offset="100%" stopColor="#4a515d" />
            </linearGradient>

            <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ── Faucet (drawn above the glass) ── */}
          {faucet && <Faucet chromeId={chromeId} pouring={pouring} color={color} />}

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
                  : // Live pour: track the level exactly (the 60fps state
                    // updates are already smooth). Any easing here would let
                    // the visible level lag the number the player aims with.
                    { duration: 0 }
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

            {/* Continuous ripple rings where the stream strikes the surface */}
            {pouring &&
              [0, 0.45].map((delay, i) => (
                <motion.ellipse
                  key={i}
                  cx={SPOUT_X}
                  cy={y}
                  rx="2"
                  ry="0.8"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.7"
                  initial={{ opacity: 0.5, scale: 0.4 }}
                  animate={{ opacity: 0, scale: 3.4 }}
                  transition={{ duration: 0.9, repeat: Infinity, delay, ease: 'easeOut' }}
                  style={{ transformOrigin: `${SPOUT_X}px ${y}px` }}
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

          {/* ── Water stream from the spout into the glass ── */}
          {pouring && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              {/* Subtle whole-stream sway for organic movement */}
              <motion.g
                animate={{ x: [0, 0.5, -0.4, 0.3, 0] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path d={streamPath(y)} fill={`url(#${streamId})`} />
                {/* Bright core highlight running down the stream */}
                <path
                  d={`M ${SPOUT_X - 0.3} ${SPOUT_Y + 1} Q ${SPOUT_X + 0.6} ${
                    (SPOUT_Y + y) / 2
                  } ${SPOUT_X - 0.2} ${y}`}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                  opacity="0.55"
                />
                {/* Falling droplets texture the flow with a little randomness */}
                {STREAM_DROPS.map((d, i) => (
                  <motion.ellipse
                    key={i}
                    rx={d.r}
                    ry={d.r * 1.5}
                    fill="#fff"
                    initial={{ cx: d.x, cy: SPOUT_Y + 2, opacity: 0 }}
                    animate={{
                      cx: [d.x, d.x + d.drift, d.x],
                      cy: [SPOUT_Y + 2, y - 1],
                      opacity: [0, 0.85, 0.85, 0],
                    }}
                    transition={{
                      duration: d.dur,
                      repeat: Infinity,
                      delay: d.delay,
                      ease: 'easeIn',
                    }}
                  />
                ))}
              </motion.g>

              {/* Splash crown where the stream hits the surface */}
              {SPLASH.map((s, i) => (
                <motion.circle
                  key={i}
                  r={s.r}
                  fill="#fff"
                  initial={{ cx: SPOUT_X, cy: y, opacity: 0 }}
                  animate={{
                    cx: SPOUT_X + s.dx,
                    cy: [y, y + s.dy, y + s.dy + 3],
                    opacity: [0.9, 0.7, 0],
                  }}
                  transition={{
                    duration: s.dur,
                    repeat: Infinity,
                    delay: s.delay,
                    ease: 'easeOut',
                  }}
                />
              ))}

              {/* Bright impact point pulsing at the surface */}
              <motion.ellipse
                cx={SPOUT_X}
                cy={y}
                rx="2.4"
                ry="1"
                fill="#fff"
                animate={{ opacity: [0.5, 0.85, 0.5], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 0.4, repeat: Infinity }}
                style={{ transformOrigin: `${SPOUT_X}px ${y}px` }}
              />
            </motion.g>
          )}
        </svg>
      </div>

      {label && (
        <p className="text-xs font-ui text-ink-3 uppercase tracking-widest">{label}</p>
      )}
    </div>
  );
}

/** Wall-style chrome tap sitting above the glass; its lever tilts when open. */
function Faucet({
  chromeId,
  pouring,
  color,
}: {
  chromeId: string;
  pouring: boolean;
  color: string;
}) {
  return (
    <g>
      {/* Ceiling mount plate */}
      <rect x="34" y="-48" width="32" height="5" rx="2" fill={`url(#${chromeId})`} />
      {/* Body */}
      <rect x="45.5" y="-46" width="9" height="26" rx="3" fill={`url(#${chromeId})`} />
      {/* Joint ring */}
      <rect x="43.5" y="-22" width="13" height="4" rx="2" fill={`url(#${chromeId})`} />
      {/* Nozzle tapering to the opening */}
      <path
        d="M43.5 -19 L56.5 -19 L54 -12 Q50 -10 46 -12 Z"
        fill={`url(#${chromeId})`}
      />
      {/* Body highlight */}
      <rect x="47" y="-45" width="1.6" height="23" rx="0.8" fill="#ffffff" opacity="0.55" />
      {/* Opening — dark, with a water meniscus when flowing */}
      <ellipse cx="50" cy="-12" rx="4" ry="1.3" fill="#161b25" />
      {pouring && (
        <motion.ellipse
          cx="50"
          cy="-12"
          rx="3.4"
          ry="1"
          fill={color}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.4, repeat: Infinity }}
        />
      )}

      {/* Lever handle — tilts up when the tap opens */}
      <motion.g
        animate={{ rotate: pouring ? -24 : 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        style={{ transformOrigin: '54px -42px' }}
      >
        <rect x="53" y="-44" width="15" height="4" rx="2" fill={`url(#${chromeId})`} />
        <circle cx="54" cy="-42" r="2.4" fill={`url(#${chromeId})`} />
        <circle cx="66" cy="-42" r="2.6" fill={`url(#${chromeId})`} stroke="#3b4250" strokeWidth="0.4" />
      </motion.g>
    </g>
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

/** Droplet lanes falling down the stream — staggered so the flow never repeats. */
const STREAM_DROPS = [
  { x: 49.6, r: 0.7, drift: 0.4, dur: 0.42, delay: 0 },
  { x: 50.4, r: 0.6, drift: -0.5, dur: 0.5, delay: 0.13 },
  { x: 50.0, r: 0.85, drift: 0.3, dur: 0.36, delay: 0.24 },
  { x: 49.4, r: 0.5, drift: -0.3, dur: 0.47, delay: 0.33 },
];

/** Splash particles thrown up where the stream meets the water. */
const SPLASH = [
  { dx: -4.5, dy: -5, r: 0.9, dur: 0.55, delay: 0 },
  { dx: 4.5, dy: -4, r: 0.8, dur: 0.6, delay: 0.16 },
  { dx: -2.5, dy: -6.5, r: 0.7, dur: 0.5, delay: 0.3 },
  { dx: 3, dy: -6, r: 0.6, dur: 0.52, delay: 0.42 },
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
