import { Difficulty } from '@/types/game';

export const SITE_NAME = 'Mini Games Hub';
export const SITE_DESCRIPTION = 'Stress-buster mini games to relax and sharpen your mind.';

// Neon palette used throughout the UI
export const NEON = {
  purple: '#7C3AED',
  purpleLight: '#A78BFA',
  cyan: '#06B6D4',
  pink: '#EC4899',
  teal: '#14B8A6',
  blue: '#3B82F6',
  rose: '#F43F5E',
  green: '#22C55E',
} as const;

// Balloon game: all size values are "units" (0-100).
// Display diameter = units * UNIT_TO_PX
export const UNIT_TO_PX = 2.8;

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
  description: string;
  minUnits: number;
  maxUnits: number;
  inflationSpeed: number; // units per second while holding
  tolerancePercent: number;
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
    description: 'No timer · Forgiving',
    minUnits: 30,
    maxUnits: 65,
    inflationSpeed: 12,
    tolerancePercent: 15,
    observeSeconds: 5,
    inflateSeconds: null,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    description: '5 seconds · Tighter',
    minUnits: 20,
    maxUnits: 78,
    inflationSpeed: 25,
    tolerancePercent: 10,
    observeSeconds: 5,
    inflateSeconds: 5,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    description: '3 seconds · No mercy',
    minUnits: 15,
    maxUnits: 88,
    inflationSpeed: 45,
    tolerancePercent: 5,
    observeSeconds: 5,
    inflateSeconds: 3,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

// Placeholder Google AdSense Publisher ID — replace before going live
export const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXXX';

// Placeholder Ad Unit IDs
export const AD_UNITS = {
  BELOW_HUB_BANNER: 'XXXXXXXXXX',
  BETWEEN_GAMES_BANNER: 'XXXXXXXXXX',
  FOOTER_BANNER: 'XXXXXXXXXX',
} as const;
