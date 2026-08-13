import { describe, expect, it } from 'vitest';
import { calculateScore } from '@/utils/scoring';
import { makeChallengeRand } from '@/lib/challenge';
import {
  BOARD_RADIUS,
  BULLSEYE_DIFFICULTY,
  CELEBRATE_ACCURACY,
  dartAccuracy,
  getRingLabel,
  makeWobble,
  scoreRound,
} from '@/games/bullseye/constants';
import { getBullseyeChallengeRounds, makeBullseyeRound } from '@/games/bullseye/challenge';
import { legDurationsMs, positionAt, steppedPositionAt } from '@/games/bullseye/oscillator';

// ── oscillator ──────────────────────────────────────────────────────

describe('positionAt', () => {
  it('stays within 0-100 across a long, drifting run', () => {
    const cfg = { frequencyHz: 1.5, phaseOffset: 0, legSpeedScales: [0.85, 1.15, 1, 1.15, 0.85, 1] };
    for (let t = 0; t <= 60000; t += 137) {
      const p = positionAt(cfg, t);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });

  it('is 50 (centre) at t=0 with zero phase offset', () => {
    expect(positionAt({ frequencyHz: 1, phaseOffset: 0, legSpeedScales: [1] }, 0)).toBeCloseTo(50, 8);
  });

  it('matches a plain sine wave for zero-drift configs', () => {
    const cfg = { frequencyHz: 1, phaseOffset: 0.7, legSpeedScales: [1] };
    for (const tMs of [0, 100, 250, 500, 900, 1300]) {
      const expected = 50 + 50 * Math.sin(0.7 + 2 * Math.PI * 1 * (tMs / 1000));
      expect(positionAt(cfg, tMs)).toBeCloseTo(expected, 6);
    }
  });

  it('period matches frequency: repeats after 1/frequencyHz seconds with no drift', () => {
    for (const freq of [0.8, 1.15, 1.5]) {
      const cfg = { frequencyHz: freq, phaseOffset: 1.2, legSpeedScales: [1] };
      const periodMs = 1000 / freq;
      for (const t0 of [0, 123, 4000]) {
        expect(positionAt(cfg, t0)).toBeCloseTo(positionAt(cfg, t0 + periodMs), 6);
      }
    }
  });

  it('is deterministic: same config and elapsed time always returns the same value', () => {
    const cfg = { frequencyHz: 1.15, phaseOffset: 2.4, legSpeedScales: [0.9, 1.1, 1] };
    for (const t of [0, 250, 900, 5000]) {
      expect(positionAt(cfg, t)).toBe(positionAt(cfg, t));
    }
  });

  it('clamps negative elapsed time to t=0', () => {
    const cfg = { frequencyHz: 1, phaseOffset: 0.3, legSpeedScales: [1] };
    expect(positionAt(cfg, -500)).toBeCloseTo(positionAt(cfg, 0), 10);
  });
});

describe('legDurationsMs / drift', () => {
  it('every leg is the same duration with no drift', () => {
    const cfg = { frequencyHz: 1.5, phaseOffset: 0, legSpeedScales: [1] };
    const base = 1000 / (2 * 1.5);
    for (const d of legDurationsMs(cfg, 5)) expect(d).toBeCloseTo(base, 8);
  });

  it("drift changes leg durations on hard: a >1 scale shortens a leg, a <1 scale lengthens it", () => {
    const cfg = { frequencyHz: 1.5, phaseOffset: 0, legSpeedScales: [1.15, 0.85, 1] };
    const base = 1000 / (2 * 1.5);
    const [leg0, leg1, leg2] = legDurationsMs(cfg, 3);
    expect(leg0).toBeCloseTo(base / 1.15, 8);
    expect(leg1).toBeCloseTo(base / 0.85, 8);
    expect(leg2).toBeCloseTo(base, 8);
    expect(leg0).toBeLessThan(leg1);
  });

  it('positionAt itself reflects the drifted leg boundary, not just legDurationsMs', () => {
    const drifted = { frequencyHz: 1, phaseOffset: 0, legSpeedScales: [2, 1] }; // leg 0 twice as fast
    const flat = { frequencyHz: 1, phaseOffset: 0, legSpeedScales: [1] };
    // At 250ms the flat config is still mid-way through its first (500ms)
    // leg, but the drifted config finished its (250ms) first leg already
    // and is partway into the second — the two must disagree here.
    expect(positionAt(drifted, 250)).not.toBeCloseTo(positionAt(flat, 250), 3);
  });

  it("Hard's drift band is exactly ±15%; Easy and Medium carry none", () => {
    expect(BULLSEYE_DIFFICULTY.hard.legDriftPercent).toBeCloseTo(0.15, 10);
    expect(BULLSEYE_DIFFICULTY.easy.legDriftPercent).toBe(0);
    expect(BULLSEYE_DIFFICULTY.medium.legDriftPercent).toBe(0);
  });
});

describe('steppedPositionAt (reduced motion)', () => {
  it('only ever lands on one of `steps` discrete sine values per cycle', () => {
    const cfg = { frequencyHz: 1, phaseOffset: 0, legSpeedScales: [1] };
    const steps = 12;
    const allowed = Array.from(
      { length: steps },
      (_, i) => 50 + 50 * Math.sin((2 * Math.PI * i) / steps)
    );
    for (let t = 0; t <= 2000; t += 17) {
      const v = steppedPositionAt(cfg, t, steps);
      expect(allowed.some((a) => Math.abs(a - v) < 1e-6)).toBe(true);
    }
  });

  it('stays within 0-100 with drift applied', () => {
    const cfg = { frequencyHz: 1.5, phaseOffset: 3, legSpeedScales: [0.85, 1.15] };
    for (let t = 0; t <= 5000; t += 53) {
      const v = steppedPositionAt(cfg, t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });
});

// ── wobble ──────────────────────────────────────────────────────────

describe('makeWobble', () => {
  it('never exceeds the given radius', () => {
    const rand = makeChallengeRand('wobble-radius-check', 'bullseye-test');
    for (let i = 0; i < 500; i++) {
      const w = makeWobble(2.5, rand);
      expect(Math.hypot(w.dx, w.dy)).toBeLessThanOrEqual(2.5 + 1e-9);
    }
  });

  it('is deterministic for the same seed', () => {
    const w1 = makeWobble(1.75, makeChallengeRand('same-seed', 'bullseye'));
    const w2 = makeWobble(1.75, makeChallengeRand('same-seed', 'bullseye'));
    expect(w1).toEqual(w2);
  });

  it('produces varied offsets rather than collapsing to a single point', () => {
    const rand = makeChallengeRand('variety-check', 'bullseye');
    const points = Array.from({ length: 20 }, () => makeWobble(2, rand));
    const distinctX = new Set(points.map((p) => p.dx.toFixed(6))).size;
    expect(distinctX).toBeGreaterThan(10);
  });

  it('a radius of 0 always returns the origin', () => {
    const w = makeWobble(0, makeChallengeRand('zero-radius', 'bullseye'));
    expect(w.dx).toBeCloseTo(0, 10);
    expect(w.dy).toBeCloseTo(0, 10);
  });
});

// ── dartAccuracy / getRingLabel ─────────────────────────────────────

describe('dartAccuracy', () => {
  it('is 100 dead centre', () => {
    expect(dartAccuracy(0, BOARD_RADIUS)).toBe(100);
  });

  it('is 0 exactly at the board edge', () => {
    expect(dartAccuracy(BOARD_RADIUS, BOARD_RADIUS)).toBe(0);
  });

  it('is 0 outside the board', () => {
    expect(dartAccuracy(BOARD_RADIUS + 0.01, BOARD_RADIUS)).toBe(0);
    expect(dartAccuracy(BOARD_RADIUS * 3, BOARD_RADIUS)).toBe(0);
  });

  it('is exactly linear: 50 at the midpoint, 75 at a quarter of the way out', () => {
    expect(dartAccuracy(BOARD_RADIUS / 2, BOARD_RADIUS)).toBe(50);
    expect(dartAccuracy(BOARD_RADIUS / 4, BOARD_RADIUS)).toBe(75);
  });

  it('decreases monotonically with distance', () => {
    const samples = [0, 5, 10, 20, 30, 40, 50].map((d) => dartAccuracy(d, BOARD_RADIUS));
    for (let i = 1; i < samples.length; i++) expect(samples[i]).toBeLessThan(samples[i - 1]);
  });

  it("the bullseye ring's threshold is exactly the celebrate-flash accuracy", () => {
    expect(dartAccuracy(0.08 * BOARD_RADIUS, BOARD_RADIUS)).toBeCloseTo(CELEBRATE_ACCURACY, 5);
  });

  it('matches the other ring thresholds at their exact boundaries', () => {
    expect(dartAccuracy(0.25 * BOARD_RADIUS, BOARD_RADIUS)).toBeCloseTo(75, 5);
    expect(dartAccuracy(0.5 * BOARD_RADIUS, BOARD_RADIUS)).toBeCloseTo(50, 5);
    expect(dartAccuracy(0.75 * BOARD_RADIUS, BOARD_RADIUS)).toBeCloseTo(25, 5);
  });
});

describe('getRingLabel', () => {
  it('labels the bullseye ring at its centre and its 8% boundary', () => {
    expect(getRingLabel(0, BOARD_RADIUS)).toBe('BULLSEYE');
    expect(getRingLabel(0.08 * BOARD_RADIUS, BOARD_RADIUS)).toBe('BULLSEYE');
  });

  it('labels each outer ring correctly', () => {
    expect(getRingLabel(0.2 * BOARD_RADIUS, BOARD_RADIUS)).toBe('50');
    expect(getRingLabel(0.4 * BOARD_RADIUS, BOARD_RADIUS)).toBe('25');
    expect(getRingLabel(0.6 * BOARD_RADIUS, BOARD_RADIUS)).toBe('10');
    expect(getRingLabel(0.9 * BOARD_RADIUS, BOARD_RADIUS)).toBe('5');
  });

  it('labels anything beyond the board a MISS', () => {
    expect(getRingLabel(1.01 * BOARD_RADIUS, BOARD_RADIUS)).toBe('MISS');
    expect(getRingLabel(3 * BOARD_RADIUS, BOARD_RADIUS)).toBe('MISS');
  });
});

// ── scoreRound ──────────────────────────────────────────────────────

describe('scoreRound', () => {
  it('maps the mean of the 5 accuracies through calculateScore', () => {
    const accuracies = [100, 90, 80, 70, 60];
    const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    expect(scoreRound(accuracies)).toBe(calculateScore(mean));
  });

  it('is 10 when every dart is a perfect centre hit', () => {
    expect(scoreRound([100, 100, 100, 100, 100])).toBe(10);
  });

  it('is 0 when the mean accuracy is 50 or worse', () => {
    expect(scoreRound([50, 50, 50, 50, 50])).toBe(0);
    expect(scoreRound([0, 0, 0, 0, 0])).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const score = scoreRound([91.3, 84.7, 76.2, 68.9, 95.1]);
    expect(score).toBe(Math.round(score * 100) / 100);
  });
});

// ── challenge rounds ────────────────────────────────────────────────

describe('getBullseyeChallengeRounds', () => {
  it('produces exactly 3 rounds, easy -> medium -> hard', () => {
    const rounds = getBullseyeChallengeRounds('abc123');
    expect(rounds.map((r) => r.difficulty)).toEqual(['easy', 'medium', 'hard']);
  });

  it('gives every round exactly 5 darts', () => {
    for (const round of getBullseyeChallengeRounds('abc123')) {
      expect(round.darts).toHaveLength(5);
    }
  });

  it('is identical for the same code', () => {
    expect(getBullseyeChallengeRounds('friendly-6')).toEqual(getBullseyeChallengeRounds('friendly-6'));
  });

  it('is case-insensitive', () => {
    expect(getBullseyeChallengeRounds('abcdef')).toEqual(getBullseyeChallengeRounds('ABCDEF'));
  });

  it('differs across codes', () => {
    expect(getBullseyeChallengeRounds('code-one')).not.toEqual(getBullseyeChallengeRounds('code-two'));
  });

  it("every dart's wobble stays within its difficulty's radius", () => {
    for (const round of getBullseyeChallengeRounds('wobble-check')) {
      const radius = BULLSEYE_DIFFICULTY[round.difficulty].wobbleRadiusPercent * BOARD_RADIUS;
      for (const dart of round.darts) {
        expect(Math.hypot(dart.wobble.dx, dart.wobble.dy)).toBeLessThanOrEqual(radius + 1e-9);
      }
    }
  });

  it('only the hard round carries leg drift away from 1', () => {
    const [easy, medium, hard] = getBullseyeChallengeRounds('drift-check');
    expect(easy.darts.every((d) => d.yLegScales.every((s) => s === 1) && d.xLegScales.every((s) => s === 1))).toBe(
      true
    );
    expect(
      medium.darts.every((d) => d.yLegScales.every((s) => s === 1) && d.xLegScales.every((s) => s === 1))
    ).toBe(true);
    expect(
      hard.darts.some((d) => d.yLegScales.some((s) => s !== 1) || d.xLegScales.some((s) => s !== 1))
    ).toBe(true);
  });
});

describe('makeBullseyeRound (solo)', () => {
  it('draws exactly 5 darts using the supplied rand', () => {
    let calls = 0;
    const rand = () => {
      calls++;
      return 0.5;
    };
    const round = makeBullseyeRound('easy', rand);
    expect(round.darts).toHaveLength(5);
    expect(calls).toBeGreaterThan(0);
  });
});
