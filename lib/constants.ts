import { Difficulty } from '@/types/game';

export const SITE_NAME = 'Mini Games Hub';
export const SITE_DESCRIPTION = 'Stress-buster mini games to relax and sharpen your mind.';

// Canonical origin for SEO (sitemap, canonical URLs, OG). Set
// NEXT_PUBLIC_SITE_URL to the real domain in production; falls back to the
// Vercel deployment URL, then localhost for dev.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

// Balloon game: all size values are "units" (0-100).
// Display diameter = units * UNIT_TO_PX.
// Constraint: the .inflate-zone is 320px tall and the balloon renders at
// diameter × 1.4 (body + string), so UNIT_TO_PX must stay ≤ 320 / (100 × 1.4).
export const UNIT_TO_PX = 2.2;

export const BALLOON_COLORS: string[] = [
  '#A855F7', // violet
  '#06B6D4', // cyan
  '#EC4899', // pink
  '#22C55E', // green
  '#F97316', // orange
  '#3B82F6', // blue
  '#EAB308', // yellow
  '#EF4444', // red
  '#14B8A6', // teal
  '#F43F5E', // rose
];

export interface DifficultyConfig {
  label: string;
  minUnits: number;
  maxUnits: number;
  inflationSpeed: number; // units per second while holding
  observeSeconds: number;
  inflateSeconds: number | null; // time limit to lock in a size; null = no limit
  color: string;
  glow: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  // inflationSpeed must let maxUnits be reached well inside inflateSeconds
  // (worst case ~70% of the window) or some targets become unwinnable.
  easy: {
    label: 'Easy',
    minUnits: 30,
    maxUnits: 65,
    inflationSpeed: 12,
    observeSeconds: 5,
    inflateSeconds: null,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    minUnits: 20,
    maxUnits: 78,
    inflationSpeed: 25,
    observeSeconds: 5,
    inflateSeconds: 5,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    minUnits: 15,
    maxUnits: 88,
    inflationSpeed: 45,
    observeSeconds: 5,
    inflateSeconds: 3,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

/** Gold / silver / bronze — shared by every leaderboard's top-3 styling. */
export const RANK_COLORS = ['#EAB308', '#94A3B8', '#D97706'];
