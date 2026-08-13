'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionValue, motion, useReducedMotion } from 'framer-motion';
import { toArenaPosition } from '../constants';
import { LiveTarget } from '../types';
import { Target } from './Target';

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface ArenaProps {
  /** The one live target, or null during the brief post-miss gap / countdown. */
  target: LiveTarget | null;
  progress: MotionValue<number>;
  accent: string;
  onHit: () => void;
  onEmptyTap: () => void;
}

/**
 * The bounded play surface: a responsive, roughly-4:3 box that measures its
 * own pixel size (ResizeObserver) so the seeded fraction positions convert
 * to real coordinates, and a live re-clamp (`toArenaPosition`) so the
 * radius+padding safety margin holds even on arenas smaller than the
 * position stream's reference box. `touchAction: 'none'` throughout — a
 * scroll gesture must never eat a tap here.
 */
export function Arena({ target, progress, accent, onHit, onEmptyTap }: ArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reducedMotion = Boolean(useReducedMotion());

  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const rippleTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const recompute = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const timeouts = rippleTimeouts.current;
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // The target sits on top and stops its own event, so a pointerdown that
    // reaches here is always the empty arena, never the target itself.
    if (e.target !== e.currentTarget) return;
    onEmptyTap();
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev.slice(-5), { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    const timeoutId = setTimeout(() => {
      rippleTimeouts.current.delete(timeoutId);
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 480);
    rippleTimeouts.current.add(timeoutId);
  };

  const pos =
    target && size.width > 0 && size.height > 0
      ? toArenaPosition(target, size.width, size.height, target.radius)
      : null;

  return (
    <div
      ref={containerRef}
      aria-label="Tap arena — tap the target the instant it appears"
      className="relative w-full max-w-md mx-auto aspect-[4/3] rounded-2xl border overflow-hidden select-none"
      style={{
        touchAction: 'none',
        borderColor: `${accent}30`,
        background: `radial-gradient(circle at 50% 38%, ${accent}14, transparent 65%), rgba(255,255,255,0.03)`,
      }}
      onPointerDown={handlePointerDown}
    >
      {pos && target && (
        <Target
          key={target.id}
          x={pos.x}
          y={pos.y}
          radius={target.radius}
          progress={progress}
          reducedMotion={reducedMotion}
          color={accent}
          onHit={onHit}
        />
      )}

      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            aria-hidden
            className="absolute w-3 h-3 rounded-full pointer-events-none"
            style={{ left: r.x - 6, top: r.y - 6, border: '1.5px solid rgba(239,68,68,0.7)' }}
            initial={{ opacity: 0.8, scale: 0.5 }}
            animate={{ opacity: 0, scale: 2.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.48, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
