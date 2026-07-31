'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Cell, cellKey } from './pathGen';

interface PathGridProps {
  size: number;
  neon: string;
  /** Path prefix currently lit during the reveal. */
  revealed: Cell[];
  /** Cells the player has traced so far. */
  traced: Cell[];
  /** Pulsing hint so the player knows where to begin. */
  startCell?: Cell | null;
  /** Whether pointer tracing is active. */
  interactive: boolean;
  /** Per-traced-index correctness; set on the results screen. */
  marks?: boolean[];
  /** Fade the lit path out (between memorize and trace). */
  fading?: boolean;
  onTraceStart?: () => void;
  onTraceCell?: (cell: Cell) => void;
  onTraceEnd?: () => void;
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
}

/**
 * Per-size visual tuning. Small grids get chunky, rounded tiles; the 16×16
 * and 25×25 grids shrink the gutter, radius and connector so hundreds of
 * tiles still read as a clean grid instead of a smear.
 */
function gridMetrics(size: number) {
  if (size <= 9) {
    return { inset: 3, radius: 6, stroke: 5, maxWidth: 420, sparkles: true };
  }
  if (size <= 16) {
    return { inset: 1.6, radius: 3, stroke: 3, maxWidth: 480, sparkles: true };
  }
  return { inset: 1, radius: 2, stroke: 2.2, maxWidth: 540, sparkles: false };
}

export function PathGrid({
  size,
  neon,
  revealed,
  traced,
  startCell,
  interactive,
  marks,
  fading = false,
  onTraceStart,
  onTraceCell,
  onTraceEnd,
}: PathGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  // The pointerId that started the current trace — a second finger landing
  // mid-trace must not be able to interleave cells or end the trace.
  const activePointerId = useRef<number | null>(null);
  const sparkleId = useRef(0);
  const lastSparkleAt = useRef(0);
  const sparkleTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  // Sparkles schedule their own removal via setTimeout; if the component
  // unmounts mid-trace those timeouts must not setState afterward.
  useEffect(() => {
    const timeouts = sparkleTimeouts.current;
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };
  }, []);

  const metrics = useMemo(() => gridMetrics(size), [size]);

  /** Maps a screen point to a grid cell via hit-testing the tile elements. */
  const cellAtPoint = useCallback((x: number, y: number): Cell | null => {
    const el = document.elementFromPoint(x, y);
    const holder = el?.closest<HTMLElement>('[data-cell]');
    if (!holder || !gridRef.current?.contains(holder)) return null;
    const [r, c] = holder.dataset.cell!.split(',').map(Number);
    return { r, c };
  }, []);

  const addSparkle = useCallback(
    (clientX: number, clientY: number) => {
      if (!metrics.sparkles) return;
      // Throttle so a fast drag doesn't spawn a sparkle every pointer event
      const now = performance.now();
      if (now - lastSparkleAt.current < 45) return;
      lastSparkleAt.current = now;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;
      const id = sparkleId.current++;
      const sparkle = { id, x: clientX - rect.left, y: clientY - rect.top };
      setSparkles((prev) => [...prev.slice(-7), sparkle]);
      const timeoutId = setTimeout(() => {
        sparkleTimeouts.current.delete(timeoutId);
        setSparkles((prev) => prev.filter((s) => s.id !== id));
      }, 600);
      sparkleTimeouts.current.add(timeoutId);
    },
    [metrics.sparkles]
  );

  const handleDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      // A trace is already in progress from another pointer — ignore.
      if (drawingRef.current) return;
      e.preventDefault();
      // Capture so the drag survives leaving the grid bounds
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      drawingRef.current = true;
      activePointerId.current = e.pointerId;
      onTraceStart?.();
      const cell = cellAtPoint(e.clientX, e.clientY);
      if (cell) {
        onTraceCell?.(cell);
        addSparkle(e.clientX, e.clientY);
      }
    },
    [interactive, onTraceStart, onTraceCell, cellAtPoint, addSparkle]
  );

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !drawingRef.current) return;
      if (e.pointerId !== activePointerId.current) return;
      const cell = cellAtPoint(e.clientX, e.clientY);
      if (cell) onTraceCell?.(cell);
      addSparkle(e.clientX, e.clientY);
    },
    [interactive, onTraceCell, cellAtPoint, addSparkle]
  );

  const handleUp = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingRef.current) return;
      if (e.pointerId !== activePointerId.current) return;
      drawingRef.current = false;
      activePointerId.current = null;
      onTraceEnd?.();
    },
    [onTraceEnd]
  );

  // Path polyline in unit-cell coordinates; zero grid gap keeps centers exact
  const linePoints = revealed.map((c) => `${c.c + 0.5},${c.r + 0.5}`).join(' ');

  // Tile layer — memoized so sparkle re-renders (which only touch the sparkle
  // layer) don't rebuild hundreds of tiles. The element references stay stable
  // between sparkle updates, so React skips reconciling them entirely.
  const tiles = useMemo(() => {
    const revealedKeys = new Set(revealed.map(cellKey));
    const tracedIndex = new Map(traced.map((c, i) => [cellKey(c), i]));
    const transition = `background 0.18s, border-color 0.18s, box-shadow 0.18s, opacity ${
      fading ? 0.6 : 0.2
    }s`;

    return Array.from({ length: size * size }, (_, i) => {
      const r = Math.floor(i / size);
      const c = i % size;
      const key = `${r},${c}`;
      const isRevealed = revealedKeys.has(key);
      const traceIdx = tracedIndex.get(key);
      const isTraced = traceIdx !== undefined;
      const mark = isTraced && marks ? marks[traceIdx!] : undefined;
      const isStart = startCell?.r === r && startCell?.c === c;

      // Results view colors traced cells by correctness; otherwise the neon
      // path (reveal) and the live trace share the accent color.
      let background = 'rgba(255,255,255,0.035)';
      let border = 'rgba(255,255,255,0.07)';
      let shadow = 'none';

      if (mark === true) {
        background = 'rgba(34,197,94,0.25)';
        border = 'rgba(34,197,94,0.7)';
        shadow = `0 0 14px rgba(34,197,94,0.45)`;
      } else if (mark === false) {
        background = 'rgba(239,68,68,0.25)';
        border = 'rgba(239,68,68,0.7)';
        shadow = `0 0 14px rgba(239,68,68,0.45)`;
      } else if (isTraced) {
        background = `${neon}33`;
        border = `${neon}bb`;
        shadow = `0 0 16px ${neon}66`;
      } else if (isRevealed) {
        background = `${neon}2e`;
        border = `${neon}cc`;
        shadow = `0 0 20px ${neon}80`;
      }

      const opacity = fading && isRevealed && !isTraced ? 0.12 : 1;

      return (
        <div key={key} className="path-cell" data-cell={key}>
          <div
            className="path-tile"
            style={{
              inset: metrics.inset,
              borderRadius: metrics.radius,
              background,
              borderColor: border,
              boxShadow: shadow,
              opacity,
              transition,
            }}
          >
            {/* Ripple as the player enters a cell (skip on the huge grid) */}
            {isTraced && metrics.sparkles && (
              <motion.span
                className="absolute inset-0 rounded-[inherit] pointer-events-none"
                style={{ border: `1.5px solid ${neon}` }}
                initial={{ opacity: 0.8, scale: 0.6 }}
                animate={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.5 }}
              />
            )}
            {/* Start hint */}
            {isStart && !isTraced && (
              <motion.span
                className="absolute inset-0 rounded-[inherit] pointer-events-none"
                style={{ border: `2px solid ${neon}` }}
                animate={{ opacity: [0.25, 0.9, 0.25], scale: [0.94, 1.02, 0.94] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
          </div>
        </div>
      );
    });
  }, [size, revealed, traced, marks, startCell, fading, neon, metrics]);

  return (
    <div
      ref={gridRef}
      className="path-grid"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        maxWidth: metrics.maxWidth,
      }}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
    >
      {tiles}

      {/* Glowing connector line following the revealed path */}
      {revealed.length > 1 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${size} ${size}`}
          preserveAspectRatio="none"
        >
          <motion.polyline
            points={linePoints}
            fill="none"
            stroke={neon}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ filter: `drop-shadow(0 0 4px ${neon})`, strokeWidth: metrics.stroke }}
            initial={false}
            animate={{ opacity: fading ? 0 : 0.85 }}
            transition={{ duration: fading ? 0.6 : 0.2 }}
          />
        </svg>
      )}

      {/* Sparkle trail under the finger */}
      <AnimatePresence>
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            className="absolute w-2 h-2 rounded-full pointer-events-none"
            style={{ left: s.x - 4, top: s.y - 4, background: neon }}
            initial={{ opacity: 0.9, scale: 1 }}
            animate={{ opacity: 0, scale: 0.2 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
