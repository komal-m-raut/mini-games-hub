'use client';

import { useEffect, useRef } from 'react';
import { REFERENCE_STAGE_WIDTH } from '../constants';
import { Sweep, blockXAt } from '../sweep';

/** Wall-clock dt clamp, matching every rAF loop in the repo (see
 *  useTimingTapGame's MAX_DT) — a throttled/backgrounded tab can only starve
 *  frames, never skip an animation-frame's worth of the glow pulse below.
 *  Block *positions* don't integrate dt at all (see blockXAt): they're
 *  re-evaluated from absolute elapsed time every frame, so a dropped frame
 *  can never desync a block from the clock — only the cosmetic pulse uses dt. */
const MAX_DT = 1 / 15;
/** Stage aspect ratio: height = width * this (~4:3). */
const STAGE_ASPECT = 0.75;
const GLOW_BLUR_BASE = 7;
const GLOW_BLUR_AMPLITUDE = 3;
const GLOW_PULSE_HZ = 1.6;
/** Corner radius as a fraction of a block's size. */
const CORNER_RADIUS_FRACTION = 0.28;

interface BlockCanvasProps {
  sweep: Sweep;
  /** `performance.now()` timestamp the sweep animation began — bumped (not
   *  regenerated) when a hidden-tab pause restarts the same sweep from the
   *  beginning. */
  sweepStartAt: number;
  /** False once the sweep phase ends — stops the loop and clears the stage
   *  instead of continuing to animate underneath the number pad. Safe: every
   *  generated sweep fully exits within its grace budget before this flips. */
  active: boolean;
}

/**
 * Canvas rendering for a sweep: a DPR-aware backing store sized off a
 * ResizeObserver on the container, and an rAF draw loop that re-derives
 * every block's position from `blockXAt(block, elapsed)` each frame — never
 * by integrating a per-frame delta — so a dropped frame changes how big a
 * jump one frame draws, never where a block actually is.
 */
export function BlockCanvas({ sweep, sweepStartAt, active }: BlockCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cssSizeRef = useRef({ width: 0, height: 0 });

  // ── Sizing: DPR-aware backing store, responsive to the container ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const width = container.clientWidth;
      if (width === 0) return;
      const height = width * STAGE_ASPECT;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      cssSizeRef.current = { width, height };

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      // Every draw call below is written in CSS-pixel coordinates; this
      // transform maps them onto the (possibly higher-resolution) backing
      // store instead of drawing at one device pixel per CSS pixel.
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

    if (!active) {
      // Every block is guaranteed to have fully exited by the time the
      // phase flips (sweepMs * SWEEP_GRACE, see sweep.ts), so there's
      // nothing left to freeze mid-flight — just leave the stage clear.
      const { width, height } = cssSizeRef.current;
      if (width > 0 && height > 0) ctx.clearRect(0, 0, width, height);
      return;
    }

    let rafId: number;
    let lastTs = performance.now();
    let pulsePhase = 0;

    const frame = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, MAX_DT);
      lastTs = now;
      pulsePhase += dt;

      const { width, height } = cssSizeRef.current;
      if (width > 0 && height > 0) {
        ctx.clearRect(0, 0, width, height);
        const scale = width / REFERENCE_STAGE_WIDTH;
        const elapsed = now - sweepStartAt;
        const glowBlur =
          GLOW_BLUR_BASE + Math.sin(pulsePhase * GLOW_PULSE_HZ * Math.PI * 2) * GLOW_BLUR_AMPLITUDE;

        for (const block of sweep.blocks) {
          const size = block.size * scale;
          const px = blockXAt(block, elapsed) * width;
          if (px + size / 2 < 0 || px - size / 2 > width) continue; // fully off-stage
          drawBlock(ctx, px, block.y * height, size, block.color, block.isTarget, glowBlur);
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [sweep, sweepStartAt, active]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl overflow-hidden bg-black/20 border border-white/10"
      style={{ aspectRatio: '4 / 3' }}
    >
      {/* Decorative — the surrounding copy carries the instruction; the
          canvas has no text alternative that would make "count the moving
          red shapes" meaningful to a screen reader. */}
      <canvas ref={canvasRef} aria-hidden="true" className="block" />
    </div>
  );
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: string,
  isTarget: boolean,
  glowBlur: number
): void {
  const half = size / 2;
  const radius = size * CORNER_RADIUS_FRACTION;

  ctx.save();
  if (isTarget) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glowBlur;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cx - half, cy - half, size, size, radius);
  } else {
    ctx.rect(cx - half, cy - half, size, size);
  }
  ctx.fill();
  ctx.restore();
}
