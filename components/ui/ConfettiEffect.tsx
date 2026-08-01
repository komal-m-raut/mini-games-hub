'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';

type ConfettiPreset = 'perfect' | 'great' | 'good';

interface ConfettiEffectProps {
  trigger: boolean;
  preset?: ConfettiPreset;
  onComplete?: () => void;
}

const PRESETS: Record<ConfettiPreset, Parameters<typeof confetti>[0]> = {
  perfect: {
    particleCount: 180,
    spread: 100,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.4 },
    colors: ['#A855F7', '#EC4899', '#06B6D4', '#22C55E', '#F97316', '#EAB308'],
    gravity: 0.9,
  },
  great: {
    particleCount: 100,
    spread: 80,
    startVelocity: 40,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#A78BFA', '#06B6D4', '#14B8A6'],
    gravity: 1,
  },
  good: {
    particleCount: 50,
    spread: 60,
    startVelocity: 30,
    origin: { x: 0.5, y: 0.6 },
    colors: ['#7C3AED', '#3B82F6'],
    gravity: 1.2,
  },
};

export function ConfettiEffect({ trigger, preset = 'great', onComplete }: ConfettiEffectProps) {
  const firedRef = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!trigger || firedRef.current) return;
    firedRef.current = true;

    if (prefersReducedMotion) {
      // Respect the user's motion preference — skip the burst entirely,
      // but still fire onComplete so callers relying on it don't stall.
      setTimeout(() => {
        onComplete?.();
        firedRef.current = false;
      }, 0);
      return;
    }

    const options = PRESETS[preset];

    if (preset === 'perfect') {
      // Two-burst effect for Perfect
      confetti({ ...options, angle: 60, origin: { x: 0, y: 0.6 } });
      setTimeout(() => confetti({ ...options, angle: 120, origin: { x: 1, y: 0.6 } }), 150);
      setTimeout(() => confetti({ ...options, origin: { x: 0.5, y: 0.3 } }), 300);
    } else {
      confetti(options);
    }

    setTimeout(() => {
      onComplete?.();
      firedRef.current = false;
    }, 2500);
  }, [trigger, preset, onComplete, prefersReducedMotion]);

  return null;
}
