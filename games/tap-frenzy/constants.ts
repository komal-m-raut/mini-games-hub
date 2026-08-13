import { Difficulty } from '@/types/game';
import { clamp } from '@/lib/utils';
import { round2 } from '@/utils/scoring';
import { RoundStats } from './types';

export const GAME_ID = 'tap-frenzy';

/** Each round is a 30-second sprint; both solo and challenge play 3 of them. */
export const ROUND_SECONDS = 30;
export const TOTAL_ROUNDS = 3;

/** Seconds of "3 · 2 · 1" before each round starts. */
export const COUNTDOWN_SECONDS = 3;

/** Gap after a missed (expired) target before the next one spawns. */
export const MISS_GAP_MS = 250;

/**
 * A hit at or under this latency keeps the combo climbing; a slower hit
 * still counts toward hitRate but neither extends nor breaks the combo —
 * only a miss (expiry) or an empty-arena tap resets it to zero.
 */
export const COMBO_LATENCY_MS = 700;

/** Combo count at which the live HUD switches on its flame treatment. */
export const COMBO_FLAME_THRESHOLD = 3;

export interface FrenzyDifficultyConfig {
  label: string;
  /** Short qualifier shown under the difficulty name on the selector. */
  qualifier: string;
  /** Starting target radius, px — shrinks to ~0 (or fades, reduced motion)
   *  linearly over `lifetimeMs`. */
  radius: number;
  lifetimeMs: number;
  color: string;
  glow: string;
}

/**
 * Tap Frenzy: one circular target at a time, shrinking against the clock.
 * Bigger, slower targets make Easy forgiving; Hard shrinks the target and
 * its window to react both at once.
 */
export const TAP_FRENZY_DIFFICULTY: Record<Difficulty, FrenzyDifficultyConfig> = {
  easy: {
    label: 'Easy',
    qualifier: 'Big targets, slow clock',
    radius: 44,
    lifetimeMs: 2200,
    color: '#22C55E',
    glow: 'rgba(34, 197, 94, 0.4)',
  },
  medium: {
    label: 'Medium',
    qualifier: 'Smaller, faster',
    radius: 36,
    lifetimeMs: 1700,
    color: '#F97316',
    glow: 'rgba(249, 115, 22, 0.4)',
  },
  hard: {
    label: 'Hard',
    qualifier: 'Tiny and quick',
    radius: 30,
    lifetimeMs: 1300,
    color: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
};

// ── Position stream ─────────────────────────────────────────────────

/** Arena width : height — a responsive, roughly-4:3 bounded box. */
export const ARENA_ASPECT_RATIO = 4 / 3;

/** Minimum clearance between a target's centre and the arena edge, on top
 *  of its own radius. */
export const EDGE_PADDING_PX = 8;

/**
 * Conservative reference arena size used only to translate a difficulty's
 * pixel margin (radius + EDGE_PADDING_PX) into a safe fraction for the
 * position stream below. The real arena is measured at render time and
 * every spawn is re-clamped against its actual pixel size (see
 * `toArenaPosition`), so this reference only has to be conservative, not
 * exact — a smaller reference means a larger (safer) fraction margin.
 */
export const REFERENCE_ARENA_WIDTH_PX = 300;
export const REFERENCE_ARENA_HEIGHT_PX = REFERENCE_ARENA_WIDTH_PX / ARENA_ASPECT_RATIO;

export interface TargetSpawn {
  /** Fraction 0–1 across the arena. */
  x: number;
  y: number;
}

/**
 * Safe fraction margins for a target of `radius` — keeps every seeded
 * centre at least `radius + EDGE_PADDING_PX` from the reference box's
 * edges on both axes. Capped at 0.48 so a hypothetically huge radius can't
 * invert the safe range.
 */
export function safeFractionMargins(radius: number): { x: number; y: number } {
  const marginPx = radius + EDGE_PADDING_PX;
  return {
    x: Math.min(0.48, marginPx / REFERENCE_ARENA_WIDTH_PX),
    y: Math.min(0.48, marginPx / REFERENCE_ARENA_HEIGHT_PX),
  };
}

/**
 * Infinite seeded stream of target positions (fractions, 0–1) for a
 * difficulty — a pure generator, so a seeded `rand` reproduces the same run
 * forever. Solo play pulls straight from `Math.random`; the challenge
 * pre-materialises a generous prefix from a seeded RNG (see challenge.ts).
 * Spawn-on-resolve: the caller pulls exactly one value per target, whenever
 * the previous one resolves.
 */
export function* makeTargetStream(
  difficulty: Difficulty,
  rand: () => number
): Generator<TargetSpawn, never, void> {
  const { x: marginX, y: marginY } = safeFractionMargins(TAP_FRENZY_DIFFICULTY[difficulty].radius);
  for (;;) {
    yield {
      x: marginX + rand() * (1 - 2 * marginX),
      y: marginY + rand() * (1 - 2 * marginY),
    };
  }
}

/**
 * Converts a fraction spawn to arena pixels, re-clamped against the actual
 * measured arena size so the radius+padding margin holds exactly — a
 * backstop for arenas smaller than the stream's reference box above (e.g. a
 * narrow phone once page padding is subtracted).
 */
export function toArenaPosition(
  spawn: TargetSpawn,
  arenaWidth: number,
  arenaHeight: number,
  radius: number
): { x: number; y: number } {
  const margin = radius + EDGE_PADDING_PX;
  const maxX = Math.max(margin, arenaWidth - margin);
  const maxY = Math.max(margin, arenaHeight - margin);
  return {
    x: clamp(spawn.x * arenaWidth, margin, maxX),
    y: clamp(spawn.y * arenaHeight, margin, maxY),
  };
}

// ── Scoring ────────────────────────────────────────────────────────

/**
 * Round score out of 10: up to 8 points for accuracy (hitRate = hits ÷
 * spawned, where spawned only counts targets that fully appeared), up to 1
 * point for speed (linear from 0 at an 850ms mean hit latency to the full
 * point at 0ms) and up to 1 point for the best combo reached this round
 * (linear up to a combo of 12). Zero hits scores 0 outright — meanHitMs is
 * undefined with nothing to average.
 */
export function scoreRound(stats: RoundStats): number {
  if (stats.hits <= 0) return 0;
  const hitRate = stats.spawned > 0 ? stats.hits / stats.spawned : 0;
  const meanHitMs = stats.totalLatencyMs / stats.hits;
  const speedBonus = clamp((850 - meanHitMs) / 850, 0, 1);
  const comboBonus = clamp(stats.bestCombo / 12, 0, 1);
  return round2(clamp(hitRate * 8 + speedBonus + comboBonus, 0, 10));
}
