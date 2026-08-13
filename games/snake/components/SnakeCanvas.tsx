'use client';

import { useEffect, useRef } from 'react';
import { GRID_COLS, GRID_ROWS, SnakeState } from '../engine';

/** Wall-clock dt clamp, matching every rAF loop in the repo (see
 *  BlockCanvas's identical constant) — only the cosmetic food pulse uses
 *  dt here; segment positions are read straight off the latest engine
 *  state each frame via a ref, never integrated. */
const MAX_DT = 1 / 15;
const FOOD_PULSE_HZ = 1.4;
const HEAD_COLOR = '#86EFAC';
const HEAD_GLOW = '#4ADE80';
const BODY_COLOR = '#22C55E';
const FOOD_COLOR = '#FB923C';
const GRID_LINE_COLOR = 'rgba(255,255,255,0.05)';
/** Corner radius as a fraction of a cell's smaller dimension. */
const CORNER_RADIUS_FRACTION = 0.32;

interface SnakeCanvasProps {
  engine: SnakeState;
  reducedMotion: boolean;
}

/**
 * Canvas rendering for the grid, snake and food: a DPR-aware backing store
 * sized off a ResizeObserver on the container (mirrors BlockCanvas), and an
 * rAF draw loop that reads the latest engine state via a ref rather than
 * restarting on every tick — the snake only actually moves once per
 * tickMs(), but the food's pulse still animates smoothly every frame.
 */
export function SnakeCanvas({ engine, reducedMotion }: SnakeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cssSizeRef = useRef({ width: 0, height: 0 });
  const engineRef = useRef(engine);

  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);

  // ── Sizing: DPR-aware backing store, responsive to the container ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const width = container.clientWidth;
      if (width === 0) return;
      const height = width * (GRID_ROWS / GRID_COLS);
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cssSizeRef.current = { width, height };

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Draw loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let rafId: number;
    let lastTs = performance.now();
    let pulsePhase = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, MAX_DT);
      lastTs = now;
      pulsePhase += dt;

      const { width, height } = cssSizeRef.current;
      if (width > 0 && height > 0) {
        draw(ctx, width, height, engineRef.current, pulsePhase, reducedMotion);
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [reducedMotion]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden bg-black/30 border border-white/10"
      style={{ aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`, touchAction: 'none' }}
    >
      {/* Decorative — the surrounding copy/HUD carries the state; the grid
          itself has no text alternative worth announcing every frame. */}
      <canvas ref={canvasRef} aria-hidden="true" className="block" />
    </div>
  );
}

function draw(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: SnakeState,
  pulsePhase: number,
  reducedMotion: boolean
): void {
  ctx.clearRect(0, 0, width, height);
  const cellW = width / GRID_COLS;
  const cellH = height / GRID_ROWS;

  // Grid lines
  ctx.strokeStyle = GRID_LINE_COLOR;
  ctx.lineWidth = 1;
  for (let x = 1; x < GRID_COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(Math.round(x * cellW) + 0.5, 0);
    ctx.lineTo(Math.round(x * cellW) + 0.5, height);
    ctx.stroke();
  }
  for (let y = 1; y < GRID_ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y * cellH) + 0.5);
    ctx.lineTo(width, Math.round(y * cellH) + 0.5);
    ctx.stroke();
  }

  // Food — a pulsing accent dot; the pulse is switched off under reduced
  // motion rather than removed, so the cue stays visible either way.
  const pulse = reducedMotion ? 1 : 0.78 + 0.22 * Math.sin(pulsePhase * FOOD_PULSE_HZ * Math.PI * 2);
  const fx = (engine.foodPos.x + 0.5) * cellW;
  const fy = (engine.foodPos.y + 0.5) * cellH;
  const foodRadius = Math.min(cellW, cellH) * 0.32 * pulse;
  ctx.save();
  ctx.shadowColor = FOOD_COLOR;
  ctx.shadowBlur = reducedMotion ? 6 : 6 + 6 * pulse;
  ctx.fillStyle = FOOD_COLOR;
  ctx.beginPath();
  ctx.arc(fx, fy, foodRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Snake — rounded segments, a brighter glowing head, drawn tail-first so
  // the head's glow never gets occluded by a later-drawn body segment.
  const cornerRadius = Math.min(cellW, cellH) * CORNER_RADIUS_FRACTION;
  for (let i = engine.snake.length - 1; i >= 0; i--) {
    const seg = engine.snake[i];
    const isHead = i === 0;
    const sx = seg.x * cellW;
    const sy = seg.y * cellH;
    const inset = Math.min(cellW, cellH) * 0.08;

    ctx.save();
    if (isHead) {
      ctx.shadowColor = HEAD_GLOW;
      ctx.shadowBlur = 10;
      ctx.fillStyle = HEAD_COLOR;
    } else {
      ctx.fillStyle = BODY_COLOR;
    }
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(sx + inset, sy + inset, cellW - inset * 2, cellH - inset * 2, cornerRadius);
    } else {
      ctx.rect(sx + inset, sy + inset, cellW - inset * 2, cellH - inset * 2);
    }
    ctx.fill();
    ctx.restore();
  }
}
