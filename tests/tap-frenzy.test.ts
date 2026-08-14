import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { CHALLENGE_TARGETS_PER_ROUND, getFrenzyChallengeRounds } from '@/games/tap-frenzy/challenge';
import {
  EDGE_PADDING_PX,
  TAP_FRENZY_DIFFICULTY,
  makeTargetStream,
  safeFractionMargins,
  scoreRound,
  toArenaPosition,
} from '@/games/tap-frenzy/constants';
import { RoundStats } from '@/games/tap-frenzy/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Pulls `n` values out of a generator into a plain array. */
function pull<T>(gen: Generator<T>, n: number): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(gen.next().value);
  return out;
}

// ── makeTargetStream ────────────────────────────────────────────────

describe('makeTargetStream', () => {
  it('is deterministic for a seeded rand', () => {
    for (const difficulty of DIFFICULTIES) {
      const a = pull(makeTargetStream(difficulty, makeChallengeRand('abc123', 'tap-frenzy')), 50);
      const b = pull(makeTargetStream(difficulty, makeChallengeRand('abc123', 'tap-frenzy')), 50);
      expect(a).toEqual(b);
    }
  });

  it('is case-insensitive for a code', () => {
    const a = pull(makeTargetStream('easy', makeChallengeRand('abc123', 'tap-frenzy')), 30);
    const b = pull(makeTargetStream('easy', makeChallengeRand('ABC123', 'tap-frenzy')), 30);
    expect(a).toEqual(b);
  });

  it('differentiates codes', () => {
    const a = pull(makeTargetStream('easy', makeChallengeRand('aaaaaa', 'tap-frenzy')), 20);
    const b = pull(makeTargetStream('easy', makeChallengeRand('bbbbbb', 'tap-frenzy')), 20);
    expect(a).not.toEqual(b);
  });

  it('stays within the safe fraction margins for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const { x: marginX, y: marginY } = safeFractionMargins(TAP_FRENZY_DIFFICULTY[difficulty].radius);
      const stream = makeTargetStream(difficulty, makeChallengeRand(`fuzz-${difficulty}`, 'tap-frenzy'));
      for (const spawn of pull(stream, 300)) {
        expect(spawn.x).toBeGreaterThanOrEqual(marginX);
        expect(spawn.x).toBeLessThanOrEqual(1 - marginX);
        expect(spawn.y).toBeGreaterThanOrEqual(marginY);
        expect(spawn.y).toBeLessThanOrEqual(1 - marginY);
      }
    }
  });

  it('never yields margins that invert the safe range (radius sanity)', () => {
    for (const difficulty of DIFFICULTIES) {
      const { x, y } = safeFractionMargins(TAP_FRENZY_DIFFICULTY[difficulty].radius);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(0.5);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(0.5);
    }
  });
});

// ── toArenaPosition ───────────────────────────────────────────────────

describe('toArenaPosition', () => {
  it('keeps every centre at least radius + EDGE_PADDING_PX from each edge, for a range of arena sizes', () => {
    const spawns = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.5, y: 0.5 },
      { x: 0.01, y: 0.99 },
      { x: 0.99, y: 0.01 },
    ];
    const arenaSizes: Array<[number, number]> = [
      [400, 300],
      [300, 225],
      [240, 180], // smaller than the stream's reference box — the backstop case
      [120, 90], // pathologically small — must still not invert min/max
    ];
    for (const difficulty of DIFFICULTIES) {
      const radius = TAP_FRENZY_DIFFICULTY[difficulty].radius;
      const margin = radius + EDGE_PADDING_PX;
      for (const [w, h] of arenaSizes) {
        for (const spawn of spawns) {
          const { x, y } = toArenaPosition(spawn, w, h, radius);
          // The backstop can't manufacture margin the arena doesn't have —
          // it clamps to whatever fits, but never crosses the centre line.
          expect(x).toBeGreaterThanOrEqual(Math.min(margin, w / 2));
          expect(x).toBeLessThanOrEqual(Math.max(margin, w - margin));
          expect(y).toBeGreaterThanOrEqual(Math.min(margin, h / 2));
          expect(y).toBeLessThanOrEqual(Math.max(margin, h - margin));
        }
      }
    }
  });

  it('maps fractions linearly inside a generously-sized arena', () => {
    const { x, y } = toArenaPosition({ x: 0.5, y: 0.5 }, 400, 300, 30);
    expect(x).toBeCloseTo(200, 5);
    expect(y).toBeCloseTo(150, 5);
  });
});

// ── getFrenzyChallengeRounds ─────────────────────────────────────────

describe('getFrenzyChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    const a = getFrenzyChallengeRounds('abc123');
    const b = getFrenzyChallengeRounds('ABC123');
    expect(a).toEqual(b);
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getFrenzyChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('differentiates codes', () => {
    expect(getFrenzyChallengeRounds('aaaaaa')).not.toEqual(getFrenzyChallengeRounds('bbbbbb'));
  });

  it('pre-generates the full, comfortably-generous position sequence per round', () => {
    for (const round of getFrenzyChallengeRounds('any-code')) {
      expect(round.positions).toHaveLength(CHALLENGE_TARGETS_PER_ROUND);
    }
  });

  it('keeps every position within that round\'s safe margins', () => {
    for (let i = 0; i < 50; i++) {
      for (const round of getFrenzyChallengeRounds(`fuzz-${i}`)) {
        const { x: marginX, y: marginY } = safeFractionMargins(
          TAP_FRENZY_DIFFICULTY[round.difficulty].radius
        );
        const invalid = round.positions.find(
          (spawn) =>
            spawn.x < marginX ||
            spawn.x > 1 - marginX ||
            spawn.y < marginY ||
            spawn.y > 1 - marginY
        );
        expect(invalid).toBeUndefined();
      }
    }
  });
});

// ── scoreRound ────────────────────────────────────────────────────────

describe('scoreRound', () => {
  const stats = (over: Partial<RoundStats>): RoundStats => ({
    spawned: 0,
    hits: 0,
    totalLatencyMs: 0,
    bestCombo: 0,
    ...over,
  });

  it('scores exactly 0 with zero hits, regardless of other stats', () => {
    expect(scoreRound(stats({ spawned: 20, hits: 0, totalLatencyMs: 0, bestCombo: 30 }))).toBe(0);
    expect(scoreRound(stats({ spawned: 0, hits: 0 }))).toBe(0);
  });

  it('scores exactly 10 for a perfect, instant, high-combo round', () => {
    const perfect = stats({ spawned: 20, hits: 20, totalLatencyMs: 0, bestCombo: 20 });
    expect(scoreRound(perfect)).toBe(10);
  });

  it('clamps at 10 even if bestCombo exceeds the cap', () => {
    expect(scoreRound(stats({ spawned: 10, hits: 10, totalLatencyMs: 0, bestCombo: 999 }))).toBe(10);
  });

  it('is monotonically non-decreasing in hit rate, other factors held constant', () => {
    const spawned = 20;
    const meanHitMs = 400;
    const bestCombo = 5;
    let previous = -1;
    for (let hits = 1; hits <= spawned; hits++) {
      const score = scoreRound(
        stats({ spawned, hits, totalLatencyMs: meanHitMs * hits, bestCombo })
      );
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
  });

  it('rewards a faster mean hit latency over a slower one, all else equal', () => {
    const fast = scoreRound(stats({ spawned: 10, hits: 10, totalLatencyMs: 100 * 10, bestCombo: 3 }));
    const slow = scoreRound(stats({ spawned: 10, hits: 10, totalLatencyMs: 800 * 10, bestCombo: 3 }));
    expect(fast).toBeGreaterThan(slow);
  });

  it('rewards a higher best combo over a lower one, all else equal', () => {
    const highCombo = scoreRound(stats({ spawned: 10, hits: 10, totalLatencyMs: 3000, bestCombo: 12 }));
    const lowCombo = scoreRound(stats({ spawned: 10, hits: 10, totalLatencyMs: 3000, bestCombo: 1 }));
    expect(highCombo).toBeGreaterThan(lowCombo);
  });

  it('never leaves the [0, 10] bounds for a wide fuzz of stats', () => {
    for (let i = 0; i < 500; i++) {
      const spawned = Math.floor(Math.random() * 60);
      const hits = Math.floor(Math.random() * (spawned + 1));
      const totalLatencyMs = hits * Math.random() * 2500;
      const bestCombo = Math.floor(Math.random() * 40);
      const score = scoreRound(stats({ spawned, hits, totalLatencyMs, bestCombo }));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it('always rounds to at most 2 decimal places', () => {
    for (let i = 0; i < 200; i++) {
      const spawned = 1 + Math.floor(Math.random() * 30);
      const hits = 1 + Math.floor(Math.random() * spawned);
      const totalLatencyMs = hits * Math.random() * 2000;
      const bestCombo = Math.floor(Math.random() * 15);
      const score = scoreRound(stats({ spawned, hits, totalLatencyMs, bestCombo }));
      expect(Number.isInteger(Math.round(score * 100))).toBe(true);
      expect(score).toBeCloseTo(Math.round(score * 100) / 100, 10);
    }
  });
});
