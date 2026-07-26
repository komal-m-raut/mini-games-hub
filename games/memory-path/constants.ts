import { Difficulty, Rating } from '@/types/game';

/**
 * Memory Path difficulty. Bigger grids carry longer paths, revealed faster
 * and held on screen for less time — so the pressure comes from the reveal,
 * never from a countdown while the player is tracing.
 */
export interface PathDifficultyConfig {
  label: string;
  description: string;
  /** Grid is size × size. */
  size: number;
  /** Cells in the path. */
  pathLength: number;
  /** Time each segment takes to light up, in ms. */
  revealMs: number;
  /** How long the finished path stays lit before fading, in ms. */
  memorizeMs: number;
  color: string;
  glow: string;
  /** Neon color of the path itself. */
  neon: string;
  /** Pulse the first cell while tracing — Easy only, so the ramp bites. */
  showStartHint: boolean;
}

export const PATH_DIFFICULTY: Record<Difficulty, PathDifficultyConfig> = {
  easy: {
    label: 'Easy',
    description: '4×4 grid · Short path',
    size: 4,
    pathLength: 5,
    revealMs: 560,
    memorizeMs: 2200,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
    neon: '#22D3EE',
    showStartHint: true,
  },
  medium: {
    label: 'Medium',
    description: '5×5 grid · Longer path',
    size: 5,
    pathLength: 7,
    revealMs: 400,
    memorizeMs: 1600,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
    neon: '#A78BFA',
    showStartHint: false,
  },
  hard: {
    label: 'Hard',
    description: '6×6 grid · Complex path',
    size: 6,
    pathLength: 9,
    revealMs: 270,
    memorizeMs: 1100,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    neon: '#F472B6',
    showStartHint: false,
  },
};

/** How long the lit path takes to dissolve before tracing opens, in ms. */
export const PATH_FADE_MS = 700;

/**
 * Rating from the trace comparison. A Perfect needs the whole path back in
 * order with nothing extra; below that it's purely how much was recovered.
 */
export function getPathRating(accuracy: number, mistakes: number): Rating {
  if (accuracy >= 100 && mistakes === 0) return 'Perfect';
  if (accuracy >= 80) return 'Great';
  if (accuracy >= 60) return 'Good';
  return 'Try Again';
}
