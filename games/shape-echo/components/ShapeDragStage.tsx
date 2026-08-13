'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { clamp, cn } from '@/lib/utils';
import { GUESS_POSITION_MARGIN, NUDGE_STEP, NUDGE_STEP_SHIFT } from '../constants';
import { GuessGeom, ShapeType } from '../types';
import { ShapeShape } from './ShapeShape';
import styles from '../styles.module.css';

interface ShapeDragStageProps {
  type: ShapeType;
  /** Target's aspect ratio — given, not recreated; only used to render. */
  ratio: number;
  guess: GuessGeom;
  color: string;
  onChange: (next: GuessGeom) => void;
  /** Fired once a discrete move (pointer release or a keyboard nudge)
   *  lands, separate from onChange so callers can throttle a sound to it. */
  onMoveEnd?: () => void;
}

/**
 * The recreate stage: drag anywhere on it to move the shape (not just the
 * shape itself — the whole stage is the drag target), or use arrow keys to
 * nudge it 1% of the stage per press (5% with Shift). Position is always
 * free — there is no grid to snap to. A visible center handle plus a
 * lift (scale + shadow) while held are what make the shape read as
 * something you're actually grabbing, not just a coordinate readout.
 */
export function ShapeDragStage({ type, ratio, guess, color, onChange, onMoveEnd }: ShapeDragStageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const gradId = useId();

  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = clamp((clientX - rect.left) / rect.width, GUESS_POSITION_MARGIN, 1 - GUESS_POSITION_MARGIN);
      const cy = clamp((clientY - rect.top) / rect.height, GUESS_POSITION_MARGIN, 1 - GUESS_POSITION_MARGIN);
      onChange({ ...guess, cx, cy });
    },
    [guess, onChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      e.preventDefault();
      svgRef.current?.setPointerCapture(e.pointerId);
      draggingRef.current = true;
      activePointerId.current = e.pointerId;
      setDragging(true);
      moveTo(e.clientX, e.clientY);
    },
    [moveTo]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current || e.pointerId !== activePointerId.current) return;
      moveTo(e.clientX, e.clientY);
    },
    [moveTo]
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerId !== activePointerId.current) return;
      draggingRef.current = false;
      activePointerId.current = null;
      setDragging(false);
      onMoveEnd?.();
    },
    [onMoveEnd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      const step = e.shiftKey ? NUDGE_STEP_SHIFT : NUDGE_STEP;
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowLeft':
          dx = -step;
          break;
        case 'ArrowRight':
          dx = step;
          break;
        case 'ArrowUp':
          dy = -step;
          break;
        case 'ArrowDown':
          dy = step;
          break;
        default:
          return;
      }
      e.preventDefault();
      const cx = clamp(guess.cx + dx, GUESS_POSITION_MARGIN, 1 - GUESS_POSITION_MARGIN);
      const cy = clamp(guess.cy + dy, GUESS_POSITION_MARGIN, 1 - GUESS_POSITION_MARGIN);
      onChange({ ...guess, cx, cy });
      onMoveEnd?.();
    },
    [guess, onChange, onMoveEnd]
  );

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      className={cn(styles.stage, styles.stageInteractive)}
      role="slider"
      aria-label="Drag anywhere to move the shape. Arrow keys nudge it; hold Shift to move further."
      aria-valuetext={`Position ${Math.round(guess.cx * 100)} percent across, ${Math.round(guess.cy * 100)} percent down`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
    >
      <defs>
        <radialGradient id={gradId} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </radialGradient>
      </defs>
      <g
        className={styles.guessGroup}
        style={{
          transform: dragging ? 'scale(1.02)' : 'scale(1)',
          filter: dragging
            ? `drop-shadow(0 12px 22px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 16px ${color}66)`
            : 'none',
        }}
      >
        <ShapeShape
          type={type}
          cx={guess.cx}
          cy={guess.cy}
          width={guess.width}
          ratio={ratio}
          rotation={guess.rotation}
          fill={`url(#${gradId})`}
          stroke={color}
          strokeWidth={1.5}
        />
        {/* Center handle — a visible grab point independent of rotation,
            since the shape's center never moves when it spins. */}
        <circle
          cx={guess.cx * 100}
          cy={guess.cy * 100}
          r={1.8}
          fill="#fff"
          stroke={color}
          strokeWidth={0.6}
          pointerEvents="none"
        />
      </g>
    </svg>
  );
}
