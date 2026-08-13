/**
 * Sweep generation and motion for Block Count — pure maths, no React, so a
 * round can be unit-tested without a DOM (same reasoning as
 * `games/timing-tap/sweep.ts`). A round is one "sweep": a crowd of blocks
 * that drift left-to-right across the stage over `sweepMs`, staggered in
 * over the first 40% of that window, each with a slight per-block speed
 * jitter. Positions are stored as fractions of the stage's width/height so
 * the same `Sweep` renders correctly at any canvas size.
 */
import { Difficulty } from '@/types/game';
import { BLOCK_DIFFICULTY, BlockDifficultyConfig, TARGET_COLOR } from './constants';

/** Fraction of the sweep window (from the start) over which blocks stagger in. */
const ENTRY_STAGGER_FRACTION = 0.4;
/** Nominal crossing duration (before jitter), as a fraction of `sweepMs`. Kept
 *  well under 1 so even a block staggered in at the latest start still
 *  finishes inside the grace budget below. */
const CROSS_DURATION_FRACTION = 0.6;
/** Per-block speed jitter, ± this fraction of the nominal speed. */
const SPEED_JITTER = 0.12;
/** Every block is guaranteed to fully cross by `sweepMs * SWEEP_GRACE` — the
 *  hook uses this as the deadline for ending the sweeping phase. */
export const SWEEP_GRACE = 1.15;
/** How far off-stage (as a fraction of stage width) a block starts/ends,
 *  so it visibly enters/exits rather than popping in at the very edge. */
const EDGE_MARGIN = 0.08;
/** Soft min vertical separation retry budget — a few attempts, not a strict
 *  solver, since clustering/overlap is an intentional difficulty knob. */
const MIN_SEPARATION_ATTEMPTS = 4;

export interface SweepBlock {
  id: number;
  isTarget: boolean;
  color: string;
  /** Diameter in px, sized against `REFERENCE_STAGE_WIDTH` (see constants.ts)
   *  — the canvas scales this to the stage's actual rendered width. */
  size: number;
  /** Block centre, as a fraction (0–1) of the stage height. */
  y: number;
  /** Fraction of the stage width crossed per millisecond. */
  speed: number;
  /** Milliseconds after the sweep starts before this block begins moving. */
  startOffset: number;
}

export interface Sweep {
  blocks: SweepBlock[];
  /** Number of blocks flagged `isTarget` — the correct answer for the round. */
  actualCount: number;
  sweepMs: number;
}

function pickY(cfg: BlockDifficultyConfig, rand: () => number, placed: number[]): number {
  const [yMin, yMax] = cfg.ySpread;
  const band = yMax - yMin;
  const minGap = cfg.allowOverlap ? 0 : band * 0.12;

  let candidate = yMin + rand() * band;
  if (minGap > 0) {
    for (let attempt = 0; attempt < MIN_SEPARATION_ATTEMPTS; attempt++) {
      const tooClose = placed.some((y) => Math.abs(y - candidate) < minGap);
      if (!tooClose) break;
      candidate = yMin + rand() * band;
    }
  }
  placed.push(candidate);
  return candidate;
}

export interface MakeSweepOptions {
  /** Reduced-motion accessibility mode: +40% sweepMs, -25% decoy count —
   *  still moving (the mechanic requires it) but calmer. */
  reducedMotion?: boolean;
}

/**
 * One sweep's worth of blocks for a difficulty, drawn from `rand` — pure and
 * deterministic, so the same seed always yields the same sweep (challenge
 * rounds) while solo play can pass `Math.random`.
 */
export function makeSweep(
  difficulty: Difficulty,
  rand: () => number,
  options: MakeSweepOptions = {}
): Sweep {
  const cfg = BLOCK_DIFFICULTY[difficulty];
  const sweepMs = options.reducedMotion ? Math.round(cfg.sweepMs * 1.4) : cfg.sweepMs;
  const decoyMultiplier = options.reducedMotion ? cfg.decoyMultiplier * 0.75 : cfg.decoyMultiplier;

  const redCount = cfg.minRed + Math.floor(rand() * (cfg.maxRed - cfg.minRed + 1));
  const decoyCount = Math.max(0, Math.round(redCount * decoyMultiplier));

  const placedYs: number[] = [];
  let nextId = 0;

  const makeBlock = (isTarget: boolean): SweepBlock => {
    const jitter = 1 + (rand() * 2 - 1) * SPEED_JITTER;
    const crossDuration = sweepMs * CROSS_DURATION_FRACTION * jitter;
    const speed = (1 + 2 * EDGE_MARGIN) / crossDuration;
    const startOffset = rand() * ENTRY_STAGGER_FRACTION * sweepMs;
    const size = cfg.minSize + rand() * (cfg.maxSize - cfg.minSize);
    const y = pickY(cfg, rand, placedYs);
    const color = isTarget
      ? TARGET_COLOR
      : cfg.decoyColors[Math.floor(rand() * cfg.decoyColors.length)];
    return { id: nextId++, isTarget, color, size, y, speed, startOffset };
  };

  const blocks: SweepBlock[] = [];
  for (let i = 0; i < redCount; i++) blocks.push(makeBlock(true));
  for (let i = 0; i < decoyCount; i++) blocks.push(makeBlock(false));

  // Shuffle draw order (Fisher–Yates, seeded) so decoys don't systematically
  // render on top of every target — ids stay attached, so this doesn't
  // affect isTarget/count logic, only on-screen stacking.
  for (let i = blocks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
  }

  return { blocks, actualCount: redCount, sweepMs };
}

/**
 * A block's x position (fraction of stage width, block centre) at
 * `elapsedMs` since the sweep started. Purely a function of absolute
 * elapsed time (not integrated per-frame), so a dropped or throttled frame
 * can never desync a block's position from the clock — the canvas draw loop
 * just re-evaluates this every frame from `performance.now() - sweepStartAt`.
 * Naturally off-stage (very negative or past `1 + EDGE_MARGIN`) before entry
 * and after exit, so callers can cull on position alone.
 */
export function blockXAt(block: SweepBlock, elapsedMs: number): number {
  const t = elapsedMs - block.startOffset;
  return -EDGE_MARGIN + block.speed * t;
}

/** Milliseconds since the sweep started at which this block finishes
 *  crossing off the right edge — used to verify every block stays inside
 *  the `sweepMs * SWEEP_GRACE` budget. */
export function sweepCompletionMs(block: SweepBlock): number {
  return block.startOffset + (1 + 2 * EDGE_MARGIN) / block.speed;
}
