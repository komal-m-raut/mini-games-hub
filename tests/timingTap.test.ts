import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import { calculateScore } from '@/utils/scoring';
import {
  TAP_DIFFICULTY,
  TAP_RATING_THRESHOLDS,
  getTapAccuracy,
  getTapRating,
} from '@/games/timing-tap/constants';
import { RoundConfig, stepPosition } from '@/games/timing-tap/sweep';
import { sweepFilterFreq, sweepPan } from '@/lib/sounds';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

describe('getTapAccuracy', () => {
  it('is 100 at dead centre, for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getTapAccuracy(50, TAP_DIFFICULTY[difficulty].zoneHalfWidth)).toBe(100);
    }
  });

  it('is 90 at exactly the zone edge, for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const z = TAP_DIFFICULTY[difficulty].zoneHalfWidth;
      expect(getTapAccuracy(50 + z, z)).toBe(90);
      expect(getTapAccuracy(50 - z, z)).toBe(90);
    }
  });

  it('is 0 at the bar edges, for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const z = TAP_DIFFICULTY[difficulty].zoneHalfWidth;
      expect(getTapAccuracy(0, z)).toBe(0);
      expect(getTapAccuracy(100, z)).toBe(0);
    }
  });

  it('decreases monotonically as distance from centre grows', () => {
    const z = TAP_DIFFICULTY.medium.zoneHalfWidth;
    const positions = [50, 55, 60, 65, 70, 80, 90, 100];
    const samples = positions.map((p) => getTapAccuracy(p, z));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1]);
    }
  });

  it('is symmetric about the centre', () => {
    const z = TAP_DIFFICULTY.hard.zoneHalfWidth;
    for (const d of [0, 1, 2.6, 10, 25, 49]) {
      expect(getTapAccuracy(50 + d, z)).toBeCloseTo(getTapAccuracy(50 - d, z), 5);
    }
  });

  it('clamps to [0, 100] for out-of-bar positions', () => {
    const z = TAP_DIFFICULTY.easy.zoneHalfWidth;
    expect(getTapAccuracy(-20, z)).toBe(getTapAccuracy(0, z));
    expect(getTapAccuracy(120, z)).toBe(getTapAccuracy(100, z));
  });

  it('rounds to 1 decimal place, matching a hand-computed value', () => {
    // z=2.6, position=63 → distance=13, outside the zone:
    // 90 - (13 - 2.6) * 90 / (50 - 2.6) = 70.253... → rounds to 70.3
    expect(getTapAccuracy(63, TAP_DIFFICULTY.hard.zoneHalfWidth)).toBe(70.3);
    // Every value is a multiple of 0.1 — no stray extra decimal digits.
    for (const position of [3, 17, 41, 58, 76.4, 99]) {
      const value = getTapAccuracy(position, TAP_DIFFICULTY.medium.zoneHalfWidth);
      expect(value).toBeCloseTo(Math.round(value * 10) / 10, 10);
    }
  });
});

describe('getTapRating', () => {
  it('bands every threshold boundary and the value just below it', () => {
    for (const [rating, threshold] of TAP_RATING_THRESHOLDS) {
      expect(getTapRating(threshold)).toBe(rating);
      if (threshold > 0) {
        const nextRating = getTapRating(threshold - 0.1);
        expect(nextRating).not.toBe(rating);
      }
    }
  });

  it('matches the documented bands explicitly', () => {
    expect(getTapRating(100)).toBe('Perfect');
    expect(getTapRating(98)).toBe('Perfect');
    expect(getTapRating(97.9)).toBe('Amazing');
    expect(getTapRating(94)).toBe('Amazing');
    expect(getTapRating(93.9)).toBe('Great');
    expect(getTapRating(88)).toBe('Great');
    expect(getTapRating(87.9)).toBe('Good');
    expect(getTapRating(75)).toBe('Good');
    expect(getTapRating(74.9)).toBe('Try Again');
    expect(getTapRating(0)).toBe('Try Again');
  });
});

describe('rating/score consistency (H3)', () => {
  it('a Perfect rating always scores at least 9.5', () => {
    for (const difficulty of DIFFICULTIES) {
      const z = TAP_DIFFICULTY[difficulty].zoneHalfWidth;
      // Sweep across the whole bar so both inside- and outside-zone
      // accuracy formulas are exercised for every difficulty.
      for (let position = 0; position <= 100; position += 0.5) {
        const accuracy = getTapAccuracy(position, z);
        const rating = getTapRating(accuracy);
        const score = calculateScore(accuracy);
        if (rating === 'Perfect') {
          expect(score).toBeGreaterThanOrEqual(9.5);
        }
      }
    }
  });

  it('never lets a lower-scoring tap out-rate a higher-scoring one', () => {
    const rank: Record<string, number> = {
      'Try Again': 0,
      Good: 1,
      Great: 2,
      Amazing: 3,
      Perfect: 4,
    };
    const z = TAP_DIFFICULTY.hard.zoneHalfWidth;
    let prevAccuracy = getTapAccuracy(50, z);
    let prevRank = rank[getTapRating(prevAccuracy)];
    for (let position = 50.5; position <= 100; position += 0.5) {
      const accuracy = getTapAccuracy(position, z);
      const currentRank = rank[getTapRating(accuracy)];
      expect(accuracy).toBeLessThanOrEqual(prevAccuracy);
      expect(currentRank).toBeLessThanOrEqual(prevRank);
      prevAccuracy = accuracy;
      prevRank = currentRank;
    }
  });
});

describe('sweepFilterFreq — centre frequency rises toward the bar\'s middle', () => {
  it('peaks at the centre', () => {
    const centre = sweepFilterFreq(50);
    expect(centre).toBeGreaterThan(sweepFilterFreq(0));
    expect(centre).toBeGreaterThan(sweepFilterFreq(100));
    expect(centre).toBeGreaterThan(sweepFilterFreq(25));
    expect(centre).toBeGreaterThan(sweepFilterFreq(75));
  });

  it('falls monotonically toward each edge', () => {
    const left = [50, 40, 30, 20, 10, 0].map(sweepFilterFreq);
    for (let i = 1; i < left.length; i++) expect(left[i]).toBeLessThan(left[i - 1]);

    const right = [50, 60, 70, 80, 90, 100].map(sweepFilterFreq);
    for (let i = 1; i < right.length; i++) expect(right[i]).toBeLessThan(right[i - 1]);
  });

  it('is symmetric about the centre', () => {
    for (const d of [5, 10, 25, 40, 50]) {
      expect(sweepFilterFreq(50 + d)).toBeCloseTo(sweepFilterFreq(50 - d), 5);
    }
  });

  it('clamps out-of-range positions to the valid endpoints', () => {
    expect(sweepFilterFreq(-30)).toBeCloseTo(sweepFilterFreq(0), 5);
    expect(sweepFilterFreq(140)).toBeCloseTo(sweepFilterFreq(100), 5);
  });
});

describe('sweepPan — left→right stereo pan tracks position', () => {
  it('is centred at the bar centre', () => {
    expect(sweepPan(50)).toBeCloseTo(0, 5);
  });

  it('is hard left at 0 and hard right at 100', () => {
    expect(sweepPan(0)).toBeCloseTo(-1, 5);
    expect(sweepPan(100)).toBeCloseTo(1, 5);
  });

  it('increases monotonically across the bar', () => {
    const samples = [0, 20, 40, 50, 60, 80, 100].map(sweepPan);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it('clamps out-of-range positions to the valid endpoints', () => {
    expect(sweepPan(-40)).toBeCloseTo(sweepPan(0), 5);
    expect(sweepPan(160)).toBeCloseTo(sweepPan(100), 5);
  });
});

/**
 * The sweep itself: the throttled/hidden-tab preview can't exercise the rAF
 * loop, so the motion invariants that actually decide fairness are pinned
 * here by simulating frames directly.
 */
describe('stepPosition', () => {
  const configFor = (difficulty: Difficulty, over: Partial<RoundConfig> = {}): RoundConfig => ({
    speed: TAP_DIFFICULTY[difficulty].speed,
    zoneHalfWidth: TAP_DIFFICULTY[difficulty].zoneHalfWidth,
    direction: 1,
    speedScales: [1],
    legIndex: 0,
    ...over,
  });

  it('travels speed × dt while it has room', () => {
    const cfg = configFor('easy');
    expect(stepPosition(cfg, 20, 0.5)).toBeCloseTo(20 + 42 * 0.5, 10);
  });

  it('reflects the overshoot at each end instead of stalling on it', () => {
    const right = configFor('easy', { direction: 1 });
    // 98 + 42×0.1 = 102.2 → reflects to 97.8, not clamped to 100
    expect(stepPosition(right, 98, 0.1)).toBeCloseTo(97.8, 10);
    expect(right.direction).toBe(-1);

    const left = configFor('easy', { direction: -1 });
    expect(stepPosition(left, 2, 0.1)).toBeCloseTo(2.2, 10);
    expect(left.direction).toBe(1);
  });

  it('never leaves the bar, at the worst-case frame the dt clamp allows', () => {
    // The reflection only stays inside the bar while one frame carries less
    // than a full bar width. Worst case is MAX_DT (1/15s) at Hard's fastest
    // leg — run a long sweep at exactly that frame budget and stay in bounds.
    const hard = TAP_DIFFICULTY.hard;
    const cfg = configFor('hard', { speedScales: [1 + hard.speedJitter] });
    expect((hard.speed * (1 + hard.speedJitter)) / 15).toBeLessThan(100);

    let p = 50;
    for (let i = 0; i < 5000; i++) {
      p = stepPosition(cfg, p, 1 / 15);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });

  it('advances one leg per bounce and cycles the speed scales', () => {
    const cfg = configFor('hard', { speedScales: [1, 2, 3], direction: 1 });
    stepPosition(cfg, 99, 0.5); // bounces off 100
    expect(cfg.legIndex).toBe(1);
    stepPosition(cfg, 1, 0.5); // now heading left, bounces off 0
    expect(cfg.legIndex).toBe(2);
    // legIndex 3 wraps back onto the first scale
    cfg.legIndex = 3;
    expect(cfg.speedScales[cfg.legIndex % cfg.speedScales.length]).toBe(1);
  });

  it('covers the Perfect Zone on every pass, so a round is always winnable', () => {
    // A sweep that could skip over the zone between two frames would make the
    // round unwinnable. At 60fps even Hard's narrowest zone must be sampled.
    for (const difficulty of DIFFICULTIES) {
      const { zoneHalfWidth, speedJitter } = TAP_DIFFICULTY[difficulty];
      const cfg = configFor(difficulty, { speedScales: [1 + speedJitter] });
      let p = 50 - zoneHalfWidth - 1;
      let framesInZone = 0;
      for (let i = 0; i < 600; i++) {
        p = stepPosition(cfg, p, 1 / 60);
        if (Math.abs(p - 50) <= zoneHalfWidth) framesInZone++;
      }
      expect(framesInZone).toBeGreaterThan(0);
    }
  });
});
