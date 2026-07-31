'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UNIT_TO_PX } from '@/lib/constants';

interface BalloonProps {
  units: number;
  color: string;
  id: string;
  isTarget?: boolean;
  visible?: boolean;
  pulse?: boolean;
  /** Shrinks the rendered diameter without touching `units` — lets a
   *  container clamp both balloons in a comparison by the same factor so
   *  their *ratio* (the whole point of the screen) stays truthful. */
  scale?: number;
}

function darkenColor(hex: string, factor = 0.6): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 0xff) * factor);
  const g = Math.floor(((n >> 8) & 0xff) * factor);
  const b = Math.floor((n & 0xff) * factor);
  return `rgb(${r},${g},${b})`;
}

/** SVG balloon with gradient shine and glow. */
function BalloonSVG({ color, id }: { color: string; id: string }) {
  const dark = darkenColor(color, 0.55);
  const gradId = `grad-${id}`;
  const glowId = `glow-${id}`;

  return (
    <svg viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <radialGradient id={gradId} cx="34%" cy="30%" r="62%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="35%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={dark} stopOpacity="1" />
        </radialGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow */}
      <ellipse cx="50" cy="48" rx="44" ry="46" fill={color} opacity="0.18" filter={`url(#${glowId})`} />

      {/* Balloon body */}
      <ellipse cx="50" cy="48" rx="44" ry="46" fill={`url(#${gradId})`} />

      {/* Inner highlights */}
      <ellipse cx="35" cy="31" rx="13" ry="10" fill="rgba(255,255,255,0.28)" />
      <ellipse cx="42" cy="23" rx="5" ry="3.5" fill="rgba(255,255,255,0.45)" />

      {/* Bottom knot */}
      <path d="M44 93 Q50 100 56 93 L53 95 L50 98 L47 95 Z" fill={dark} />

      {/* String */}
      <path
        d="M50 99 Q44 112 50 124 Q56 136 50 140"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Balloon({
  units,
  color,
  id,
  isTarget = false,
  visible = true,
  pulse = false,
  scale = 1,
}: BalloonProps) {
  const diameter = Math.max(units * UNIT_TO_PX * scale, 8);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`balloon-${id}`}
          className="relative flex items-end justify-center"
          style={{ width: diameter, height: diameter * 1.4 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            y: pulse ? [0, -6, 0] : 0,
          }}
          exit={{ scale: 0, opacity: 0, y: -40 }}
          transition={
            pulse
              ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut', scale: { duration: 0.4 } }
              : { type: 'spring', stiffness: 200, damping: 18 }
          }
        >
          <BalloonSVG color={color} id={id} />

          {isTarget && (
            <motion.div
              className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-mono text-white/50 whitespace-nowrap px-2 py-0.5 rounded bg-white/5 border border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Target
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Side-by-side comparison of target vs player balloon.
 *
 * Both balloons are clamped by the *same* scale factor derived from the
 * container's measured width, so two full-size balloons plus the gap never
 * exceed the space available — flexbox shrinking them independently would
 * distort the size ratio, which is the entire point of this screen (H2).
 */
export function BalloonComparison({
  targetUnits,
  actualUnits,
  color,
}: {
  targetUnits: number;
  actualUnits: number;
  color: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const recompute = () => {
      const width = el.clientWidth;
      if (width === 0) return;
      // Read the actual applied gap (it changes at the sm: breakpoint)
      // rather than guessing a pixel value from the Tailwind class.
      const gapPx = parseFloat(getComputedStyle(el).columnGap || '0') || 0;
      const largerUnits = Math.max(targetUnits, actualUnits, 1);
      const largerDiameter = largerUnits * UNIT_TO_PX;
      const available = (width - gapPx) / 2;
      setScale(Math.min(1, available / largerDiameter));
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [targetUnits, actualUnits]);

  return (
    <div ref={containerRef} className="flex items-end justify-center gap-8 sm:gap-24 py-8">
      <div className="flex flex-col items-center gap-3">
        <Balloon units={targetUnits} color={color} id="cmp-target" visible scale={scale} />
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Target</p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <Balloon units={actualUnits} color={color} id="cmp-actual" visible scale={scale} />
        <p className="text-xs font-mono text-white/40 uppercase tracking-widest">Yours</p>
      </div>
    </div>
  );
}
