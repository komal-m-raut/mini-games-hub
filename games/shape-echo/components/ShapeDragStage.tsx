'use client';

import { useCallback, useRef } from 'react';
import { clamp } from '@/lib/utils';
import { GUESS_POSITION_MARGIN, NUDGE_STEP, NUDGE_STEP_SHIFT } from '../constants';
import { GuessGeom, ShapeType } from '../types';
import { ShapeShape } from './ShapeShape';

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
 * nudge it 1% of the stage per press (5% with Shift).
 */
export function ShapeDragStage({ type, ratio, guess, color, onChange, onMoveEnd }: ShapeDragStageProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const activePointerId = useRef<number | null>(null);

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

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerId !== activePointerId.current) return;
      draggingRef.current = false;
      activePointerId.current = null;
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
      className="w-full touch-none select-none rounded-2xl cursor-grab active:cursor-grabbing"
      style={{
        maxWidth: 440,
        aspectRatio: '1 / 1',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      role="slider"
      aria-label="Drag anywhere to move the shape. Arrow keys nudge it; hold Shift to move further."
      aria-valuetext={`Position ${Math.round(guess.cx * 100)} percent across, ${Math.round(guess.cy * 100)} percent down`}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <ShapeShape
        type={type}
        cx={guess.cx}
        cy={guess.cy}
        width={guess.width}
        ratio={ratio}
        rotation={guess.rotation}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={2}
      />
    </svg>
  );
}
