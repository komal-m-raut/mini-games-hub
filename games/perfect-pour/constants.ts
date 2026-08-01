import { Difficulty, Rating } from '@/types/game';
import { ratingFromScore } from '@/utils/scoring';

/**
 * Perfect Pour: watch a glass fill to a random level, then recreate that
 * level by holding to pour. Fill levels are percentages of glass capacity,
 * so "difference" is in percentage points — the number the player sees.
 */
export interface PourDifficultyConfig {
  label: string;
  /** Glass render scale — Easy pours into a big forgiving glass. */
  glassScale: number;
  /** Fill percentage gained per second while holding. */
  pourSpeed: number;
  observeSeconds: number;
  color: string;
  glow: string;
  /** Liquid color for this difficulty. */
  liquid: string;
}

export const POUR_DIFFICULTY: Record<Difficulty, PourDifficultyConfig> = {
  easy: {
    label: 'Easy',
    glassScale: 1.15,
    pourSpeed: 20,
    observeSeconds: 3,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
    liquid: '#22D3EE',
  },
  medium: {
    label: 'Medium',
    glassScale: 1,
    pourSpeed: 34,
    observeSeconds: 3,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    liquid: '#A78BFA',
  },
  hard: {
    label: 'Hard',
    glassScale: 0.85,
    pourSpeed: 52,
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
 * Rating for a pour's round score. Derived from the same score curve as
 * `calculateScore` (H3) — previously this used a separate,
 * difficulty-tolerance-based formula (diff vs `tolerance`) that could
 * disagree with the score shown beside it (e.g. Easy rating "Perfect" next
 * to an 8/10 for a 10-point miss).
 */
export function getPourRating(score: number): Rating {
  return ratingFromScore(score);
}

/**
 * Accuracy as a percentage: a 6-point miss reads as 94% accurate.
 * Percentage points map 1:1 so the number matches what the player sees.
 */
export function getPourAccuracy(target: number, actual: number): number {
  const diff = Math.abs(target - actual);
  return Math.round(Math.max(0, 100 - diff) * 10) / 10;
}
