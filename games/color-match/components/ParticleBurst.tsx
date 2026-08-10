'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { RGB, rgbToCss } from '../colorMath';

/** Fixed table so the burst renders identically on every replay. */
const PARTICLES = [
  { angle: -90, distance: 140, size: 7, delay: 0 },
  { angle: -38, distance: 120, size: 5, delay: 0.04 },
  { angle: 14, distance: 152, size: 6, delay: 0.02 },
  { angle: 62, distance: 118, size: 5, delay: 0.07 },
  { angle: 110, distance: 146, size: 7, delay: 0.01 },
  { angle: 158, distance: 122, size: 5, delay: 0.05 },
  { angle: 206, distance: 150, size: 6, delay: 0.03 },
  { angle: 254, distance: 124, size: 5, delay: 0.06 },
  { angle: 302, distance: 144, size: 6, delay: 0.02 },
];

/** Small spray of dots for an excellent match, in the colour the player mixed. */
export function ParticleBurst({ color }: { color: RGB }) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;

  const css = rgbToCss(color);

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      {PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, background: css }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
            animate={{
              x: Math.cos(rad) * p.distance,
              y: Math.sin(rad) * p.distance,
              scale: [0.4, 1, 0.2],
              opacity: [0, 0.9, 0],
            }}
            transition={{ duration: 0.95, delay: p.delay, ease: 'easeOut' }}
          />
        );
      })}
    </div>
  );
}
