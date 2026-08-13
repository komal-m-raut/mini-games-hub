import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { GuessGeom, ShapeGeom, ShapeType } from './types';

export const GAME_ID = 'shape-echo';

// ── Target generation ────────────────────────────────────────────────

/** The target's center stays at least this far (as a fraction of the stage)
 *  from every edge, so a flashed shape is never clipped against the frame. */
export const POSITION_MARGIN = 0.18;

/** Target width, as a fraction of the stage width. */
export const TARGET_WIDTH_MIN = 0.2;
export const TARGET_WIDTH_MAX = 0.45;

/** Height/width aspect ratio for rectangle and ellipse targets — seeded and
 *  handed to the player unchanged; only the recreate size slider (which
 *  scales width, preserving this ratio) is under their control. */
export const RATIO_MIN = 0.6;
export const RATIO_MAX = 1.6;

/** Rotation range, degrees. Always 0 on easy. */
export const MAX_ROTATION_DEG = 180;

// ── Recreate defaults & controls ────────────────────────────────────

/** The recreate shape starts centered, at this width and rotation. */
export const DEFAULT_GUESS_WIDTH = 0.3;
export const DEFAULT_GUESS_ROTATION = 0;

/** Size slider range, as a fraction of stage width. */
export const GUESS_WIDTH_MIN = 0.1;
export const GUESS_WIDTH_MAX = 0.55;

/** Keyboard nudge step, as a fraction of the stage; Shift multiplies it. */
export const NUDGE_STEP = 0.01;
export const NUDGE_STEP_SHIFT = 0.05;

/** How close to the stage edge the player's shape center may be dragged. */
export const GUESS_POSITION_MARGIN = 0.02;

export function defaultGuess(): GuessGeom {
  return { cx: 0.5, cy: 0.5, width: DEFAULT_GUESS_WIDTH, rotation: DEFAULT_GUESS_ROTATION };
}

// ── Difficulty ───────────────────────────────────────────────────────

export interface ShapeDifficultyConfig {
  label: string;
  qualifier: string;
  /** How long the target is shown before it's hidden. */
  flashSeconds: number;
  shapePool: ShapeType[];
  /** Whether the rotation slider (and non-zero target rotation) is in play. */
  rotationEnabled: boolean;
  color: string;
  glow: string;
}

export const SHAPE_DIFFICULTY: Record<Difficulty, ShapeDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Rectangles only, 2.5s to look',
    flashSeconds: 2.5,
    shapePool: ['rectangle'],
    rotationEnabled: false,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '+ ellipses, tilted shapes',
    flashSeconds: 2.5,
    shapePool: ['rectangle', 'ellipse'],
    rotationEnabled: true,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: '+ triangles, only 1.5s to look',
    flashSeconds: 1.5,
    shapePool: ['rectangle', 'ellipse', 'triangle'],
    rotationEnabled: true,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/**
 * Target shape for a difficulty. Consumes the RNG in a fixed order — type,
 * position, size, ratio, rotation — regardless of which branch a call takes
 * (easy still draws a rotation value, it's just discarded), so a seeded
 * challenge round always advances the shared RNG by the same amount. Same
 * convention as Color Match's `makeTargetColor`.
 */
export function makeShape(difficulty: Difficulty, rand: () => number): ShapeGeom {
  const pool = SHAPE_DIFFICULTY[difficulty].shapePool;
  const type = pool[Math.floor(rand() * pool.length)];
  const cx = POSITION_MARGIN + rand() * (1 - 2 * POSITION_MARGIN);
  const cy = POSITION_MARGIN + rand() * (1 - 2 * POSITION_MARGIN);
  const width = TARGET_WIDTH_MIN + rand() * (TARGET_WIDTH_MAX - TARGET_WIDTH_MIN);
  const ratio = RATIO_MIN + rand() * (RATIO_MAX - RATIO_MIN);
  const rawRotation = rand() * MAX_ROTATION_DEG;
  const rotation = difficulty === 'easy' ? 0 : rawRotation;
  return { type, cx, cy, width, ratio, rotation };
}

// ── Accuracy ─────────────────────────────────────────────────────────

/** Rotational symmetry period for a shape type: a rectangle or ellipse
 *  looks identical every 180°, an equilateral triangle every 120°. */
export function symmetryPeriod(type: ShapeType): number {
  return type === 'triangle' ? 120 : 180;
}

/**
 * Symmetry-aware angular difference between two rotations, folded into
 * [0, symmetryDeg / 2] — a 170° guess against a 10° rectangle target is only
 * 20° off (both period 180°), not 160°.
 */
export function angularDelta(a: number, b: number, symmetryDeg: number): number {
  const folded = (((a - b) % symmetryDeg) + symmetryDeg) % symmetryDeg;
  return Math.min(folded, symmetryDeg - folded);
}

/** Area of a shape, given its type/width/ratio (see `ShapeGeom` for units). */
export function shapeArea(shape: { type: ShapeType; width: number; ratio: number }): number {
  switch (shape.type) {
    case 'rectangle':
      return shape.width * shape.width * shape.ratio;
    case 'ellipse':
      return (Math.PI / 4) * shape.width * shape.width * shape.ratio;
    case 'triangle':
      return (Math.sqrt(3) / 4) * shape.width * shape.width;
  }
}

export interface ShapeAccuracyDetail {
  posAcc: number;
  sizeAcc: number;
  rotAcc: number;
  /** 0-100, one decimal place. */
  accuracy: number;
}

/**
 * Full accuracy breakdown — the per-component numbers the result screen's
 * bars need, plus the combined 0-100 score `shapeAccuracy` returns alone.
 * posAcc = 1 − dist(centers)/(0.5·stage); sizeAcc = 1 − |Δarea|/targetArea;
 * rotAcc = 1 − angularDelta/90 (symmetry-aware; always 1 on easy). Each
 * component is clamped to [0, 1] before the 0.4/0.4/0.2 weighting.
 */
export function shapeAccuracyDetail(
  target: ShapeGeom,
  guess: GuessGeom,
  difficulty: Difficulty
): ShapeAccuracyDetail {
  const dist = Math.hypot(target.cx - guess.cx, target.cy - guess.cy);
  const posAcc = clamp(1 - dist / 0.5, 0, 1);

  const targetArea = shapeArea(target);
  const guessArea = shapeArea({ type: target.type, width: guess.width, ratio: target.ratio });
  const sizeAcc = clamp(1 - Math.abs(guessArea - targetArea) / targetArea, 0, 1);

  let rotAcc = 1;
  if (difficulty !== 'easy') {
    const delta = angularDelta(guess.rotation, target.rotation, symmetryPeriod(target.type));
    rotAcc = clamp(1 - delta / 90, 0, 1);
  }

  const raw = 100 * (0.4 * posAcc + 0.4 * sizeAcc + 0.2 * rotAcc);
  const accuracy = Math.round(raw * 10) / 10;
  return { posAcc, sizeAcc, rotAcc, accuracy };
}

/** Combined 0-100 accuracy only — see `shapeAccuracyDetail` for the
 *  per-component breakdown the result screen renders. */
export function shapeAccuracy(target: ShapeGeom, guess: GuessGeom, difficulty: Difficulty): number {
  return shapeAccuracyDetail(target, guess, difficulty).accuracy;
}
