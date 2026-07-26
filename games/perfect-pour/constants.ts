import { Difficulty, Rating } from '@/types/game';

/**
 * Perfect Pour: watch a glass fill to a random level, then recreate that
 * level by holding to pour. Fill levels are percentages of glass capacity,
 * so "difference" is in percentage points — the number the player sees.
 */
export interface PourDifficultyConfig {
  label: string;
  description: string;
  /** Glass render scale — Easy pours into a big forgiving glass. */
  glassScale: number;
  /** Fill percentage gained per second while holding. */
  pourSpeed: number;
  /** Within this many percentage points of the target counts as Perfect. */
  tolerance: number;
  observeSeconds: number;
  color: string;
  glow: string;
  /** Liquid color for this difficulty. */
  liquid: string;
}

export const POUR_DIFFICULTY: Record<Difficulty, PourDifficultyConfig> = {
  easy: {
    label: 'Easy',
    description: 'Large glass · Slow pour',
    glassScale: 1.15,
    pourSpeed: 20,
    tolerance: 10,
    observeSeconds: 3,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
    liquid: '#22D3EE',
  },
  medium: {
    label: 'Medium',
    description: 'Medium glass · Faster pour',
    glassScale: 1,
    pourSpeed: 34,
    tolerance: 6,
    observeSeconds: 3,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    liquid: '#A78BFA',
  },
  hard: {
    label: 'Hard',
    description: 'Small glass · Fast pour',
    glassScale: 0.85,
    pourSpeed: 52,
    tolerance: 3,
    observeSeconds: 3,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    liquid: '#F43F5E',
  },
};

/** Targets stay clear of the rim and the base so every round is pourable. */
export const MIN_TARGET_FILL = 25;
export const MAX_TARGET_FILL = 85;

/**
 * Rating from the raw fill difference, in percentage points.
 * The difficulty's tolerance *is* the Perfect window, per game design:
 * Easy ±10, Medium ±6, Hard ±3.
 */
export function getPourRating(diff: number, tolerance: number): Rating {
  if (diff <= tolerance) return 'Perfect';
  if (diff <= tolerance * 2) return 'Great';
  if (diff <= tolerance * 3.5) return 'Good';
  return 'Try Again';
}

/**
 * Accuracy as a percentage: a 6-point miss reads as 94% accurate.
 * Percentage points map 1:1 so the number matches what the player sees.
 */
export function getPourAccuracy(target: number, actual: number): number {
  const diff = Math.abs(target - actual);
  return Math.round(Math.max(0, 100 - diff) * 10) / 10;
}

/** Human-readable miss direction, e.g. "6% too much". */
export function getPourDiffLabel(target: number, actual: number): string {
  const diff = actual - target;
  const rounded = Math.abs(Math.round(diff));
  if (rounded === 0) return 'Spot on!';
  return diff > 0 ? `${rounded}% too much` : `${rounded}% too little`;
}
