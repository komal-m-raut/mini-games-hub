'use client';

import { useMemo } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  opacity: number;
}

const COLORS = [
  '#7C3AED',
  '#06B6D4',
  '#EC4899',
  '#A78BFA',
  '#14B8A6',
  '#3B82F6',
  '#F43F5E',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function ParticleBackground({ count = 20 }: { count?: number }) {
  // Use a seeded RNG so values are stable between SSR and client
  const particles: Particle[] = useMemo(() => {
    const rng = seededRandom(42);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: rng() * 100,
      y: rng() * 100,
      size: 2 + rng() * 4,
      color: COLORS[Math.floor(rng() * COLORS.length)],
      duration: 8 + rng() * 16,
      delay: rng() * 10,
      opacity: 0.15 + rng() * 0.35,
    }));
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full particle-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}

      {/* Ambient gradient blobs */}
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />
    </div>
  );
}
