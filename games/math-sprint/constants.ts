import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';

export const GAME_ID = 'math-sprint';

/** Each round is a 30-second sprint; both solo and challenge play 3 of them. */
export const ROUND_SECONDS = 30;
export const TOTAL_ROUNDS = 3;

/** Seconds of "3 · 2 · 1" before each round starts. */
export const COUNTDOWN_SECONDS = 3;

/**
 * '−' (U+2212) rather than a hyphen so the operator reads correctly at
 * display size — this value is also what gets rendered directly, so there is
 * no separate display-glyph lookup to keep in sync.
 */
export type MathOp = '+' | '−' | '×' | '÷';

export interface MathQuestion {
  a: number;
  b: number;
  op: MathOp;
  answer: number;
}

export interface MathDifficultyConfig {
  label: string;
  /** Short qualifier shown under the difficulty name on the selector. */
  qualifier: string;
  /**
   * Net correct answers (see `calculateMathNet`) needed in 30s for a
   * perfect 10/10 round. Drops as the arithmetic gets harder, since each
   * question takes longer to work out.
   */
  par: number;
  color: string;
  glow: string;
}

export const MATH_DIFFICULTY: Record<Difficulty, MathDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: '+ and − up to 20',
    par: 20,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: '+ times tables, up to 50',
    par: 16,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: '+ division, up to 99',
    par: 12,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

// ── Question generation ──────────────────────────────────────────────
// Pure functions of the RNG they're given, so a seeded `rand` (challenge
// mode) and `Math.random` (solo mode) share exactly one implementation —
// same reasoning as `makeTargetColor` in color-match/constants.ts.

function randInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/** a+b or a−b, operands drawn from [min, max]. Subtraction always orders the
 *  bigger draw first, so the result is never negative. */
function addOrSubtract(rand: () => number, min: number, max: number): MathQuestion {
  const op: MathOp = rand() < 0.5 ? '+' : '−';
  const x = randInt(rand, min, max);
  const y = randInt(rand, min, max);
  if (op === '+') return { a: x, b: y, op, answer: x + y };
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  return { a, b, op, answer: a - b };
}

/** Easy: a+b / a−b, operands 2–20. */
function makeEasyQuestion(rand: () => number): MathQuestion {
  return addOrSubtract(rand, 2, 20);
}

/** Medium: a+b / a−b (operands 10–50), plus a×b with a,b in 2–10. */
function makeMediumQuestion(rand: () => number): MathQuestion {
  const r = rand();
  if (r < 2 / 3) return addOrSubtract(rand, 10, 50);
  const a = randInt(rand, 2, 10);
  const b = randInt(rand, 2, 10);
  return { a, b, op: '×', answer: a * b };
}

/** Hard: a+b / a−b (operands 20–99), a×b (3–12 each), and exact c÷b
 *  (b and the quotient both 3–12, c = b × quotient so it's always exact). */
function makeHardQuestion(rand: () => number): MathQuestion {
  const r = rand();
  if (r < 0.5) return addOrSubtract(rand, 20, 99);
  if (r < 0.75) {
    const a = randInt(rand, 3, 12);
    const b = randInt(rand, 3, 12);
    return { a, b, op: '×', answer: a * b };
  }
  const b = randInt(rand, 3, 12);
  const answer = randInt(rand, 3, 12);
  return { a: b * answer, b, op: '÷', answer };
}

/** One question for a difficulty, drawn from `rand` — pass `Math.random`
 *  for solo play or a seeded RNG (see challenge.ts) for a challenge round. */
export function makeMathQuestion(difficulty: Difficulty, rand: () => number): MathQuestion {
  if (difficulty === 'easy') return makeEasyQuestion(rand);
  if (difficulty === 'medium') return makeMediumQuestion(rand);
  return makeHardQuestion(rand);
}

// ── Scoring ─────────────────────────────────────────────────────────

/** Net correct answers: every wrong answer or skip costs half a point,
 *  never below zero. */
export function calculateMathNet(correct: number, wrong: number): number {
  return Math.max(0, correct - 0.5 * wrong);
}

/** Round score out of 10: net measured against the difficulty's par,
 *  clamped to [0, 10] and rounded to 2dp. */
export function calculateMathScore(correct: number, wrong: number, difficulty: Difficulty): number {
  const net = calculateMathNet(correct, wrong);
  const par = MATH_DIFFICULTY[difficulty].par;
  return round2(clamp((net / par) * 10, 0, 10));
}
