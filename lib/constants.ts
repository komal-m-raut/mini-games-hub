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
  color: string;
  glow: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Easy',
    description: 'Slow inflation · Generous tolerance',
    minUnits: 30,
    maxUnits: 65,
    inflationSpeed: 10,
    tolerancePercent: 15,
    observeSeconds: 5,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    description: 'Moderate speed · Tighter tolerance',
    minUnits: 20,
    maxUnits: 78,
    inflationSpeed: 16,
    tolerancePercent: 10,
    observeSeconds: 5,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    description: 'Fast inflation · Pixel-perfect tolerance',
    minUnits: 15,
    maxUnits: 88,
    inflationSpeed: 24,
    tolerancePercent: 5,
    observeSeconds: 5,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

// Score multipliers per rating
export const SCORE_VALUES: Record<string, number> = {
  Perfect: 1000,
  Great: 700,
  Good: 400,
  'Try Again': 100,
};

// Placeholder Google AdSense Publisher ID — replace before going live
export const ADSENSE_PUBLISHER_ID = 'ca-pub-XXXXXXXXXXXXXXXXX';

// Placeholder Ad Unit IDs
export const AD_UNITS = {
  BELOW_HUB_BANNER: 'XXXXXXXXXX',
  BETWEEN_GAMES_BANNER: 'XXXXXXXXXX',
  FOOTER_BANNER: 'XXXXXXXXXX',
} as const;
