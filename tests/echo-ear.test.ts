import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import { calculateScore, formatScore, round2 } from '@/utils/scoring';
import {
  ECHO_DIFFICULTY,
  MAX_FREQ,
  MIN_FREQ,
  MIN_START_OFFSET_CENTS,
  accuracyFromCents,
  applyCents,
  centsBetween,
  frequencyToPosition,
  getEchoRating,
  makeFrequency,
  makeStartFrequency,
  pitchDescriptor,
  positionToFrequency,
} from '@/games/echo-ear/constants';
import { getEchoChallengeRounds } from '@/games/echo-ear/challenge';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

// ── makeFrequency ─────────────────────────────────────────────────────

describe('makeFrequency', () => {
  it('stays within the two-octave range', () => {
    const rand = seededRand(11);
    for (let i = 0; i < 2000; i++) {
      const freq = makeFrequency(rand);
      expect(freq).toBeGreaterThanOrEqual(MIN_FREQ);
      expect(freq).toBeLessThanOrEqual(MAX_FREQ);
    }
  });

  it('rounds to at most 2 decimal places', () => {
    const rand = seededRand(22);
    for (let i = 0; i < 500; i++) {
      const freq = makeFrequency(rand);
      expect(round2(freq)).toBe(freq);
    }
  });

  it('is a pure, deterministic function of the RNG it is given', () => {
    expect(makeFrequency(seededRand(99))).toBe(makeFrequency(seededRand(99)));
  });

  it('produces different sequences for different seeds', () => {
    const a = [seededRand(1), seededRand(2)].map((rand) =>
      Array.from({ length: 5 }, () => makeFrequency(rand))
    );
    expect(a[0]).not.toEqual(a[1]);
  });

  it('covers the exact endpoints at rand() 0 and 1', () => {
    expect(makeFrequency(() => 0)).toBe(MIN_FREQ);
    expect(makeFrequency(() => 1)).toBe(MAX_FREQ);
  });

  it('is roughly log-uniform: the median of many draws lands near 440 Hz', () => {
    const rand = seededRand(2026);
    const draws = Array.from({ length: 4000 }, () => makeFrequency(rand)).sort((a, b) => a - b);
    const median = draws[Math.floor(draws.length / 2)];
    // 440 Hz is the exact log-midpoint of [220, 880]; a wide tolerance keeps
    // this robust to the specific RNG sequence while still catching a
    // regression to a linear (rather than log-uniform) distribution, which
    // would skew the median well above 440.
    expect(median).toBeGreaterThan(380);
    expect(median).toBeLessThan(500);
  });
});

// ── centsBetween ─────────────────────────────────────────────────────

describe('centsBetween', () => {
  it('is 0 for a unison (identical frequencies)', () => {
    expect(centsBetween(440, 440)).toBe(0);
    expect(centsBetween(220, 220)).toBe(0);
  });

  it('is exactly 1200 for a full octave', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
    expect(centsBetween(440, 220)).toBeCloseTo(1200, 6);
    expect(centsBetween(MIN_FREQ, MAX_FREQ)).toBeCloseTo(2400, 6);
  });

  it('is symmetric', () => {
    expect(centsBetween(300, 500)).toBeCloseTo(centsBetween(500, 300), 10);
  });

  it('is always non-negative', () => {
    const rand = seededRand(5);
    for (let i = 0; i < 500; i++) {
      const a = MIN_FREQ + rand() * (MAX_FREQ - MIN_FREQ);
      const b = MIN_FREQ + rand() * (MAX_FREQ - MIN_FREQ);
      expect(centsBetween(a, b)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── accuracyFromCents ────────────────────────────────────────────────

describe('accuracyFromCents', () => {
  it('is 100 for a 0-cent miss at every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(accuracyFromCents(0, difficulty)).toBe(100);
    }
  });

  it('reaches exactly 0 at divisor * 100 cents, and clamps beyond it', () => {
    for (const difficulty of DIFFICULTIES) {
      const { divisor } = ECHO_DIFFICULTY[difficulty];
      expect(accuracyFromCents(divisor * 100, difficulty)).toBe(0);
      expect(accuracyFromCents(divisor * 100 + 500, difficulty)).toBe(0);
    }
  });

  it('never leaves the 0–100 range', () => {
    const rand = seededRand(7);
    for (let i = 0; i < 1000; i++) {
      const cents = rand() * 3000;
      for (const difficulty of DIFFICULTIES) {
        const accuracy = accuracyFromCents(cents, difficulty);
        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(100);
      }
    }
  });

  it('uses the documented per-difficulty divisors (800/600/400 cents to zero)', () => {
    expect(ECHO_DIFFICULTY.easy.divisor).toBe(8);
    expect(ECHO_DIFFICULTY.medium.divisor).toBe(6);
    expect(ECHO_DIFFICULTY.hard.divisor).toBe(4);
  });

  it('scores an identical miss lower as difficulty rises', () => {
    const cents = 120;
    const easy = accuracyFromCents(cents, 'easy');
    const medium = accuracyFromCents(cents, 'medium');
    const hard = accuracyFromCents(cents, 'hard');
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
  });

  it('decreases monotonically as the miss grows', () => {
    for (const difficulty of DIFFICULTIES) {
      let previous = 100;
      for (let cents = 0; cents <= 1000; cents += 25) {
        const accuracy = accuracyFromCents(cents, difficulty);
        expect(accuracy).toBeLessThanOrEqual(previous);
        previous = accuracy;
      }
    }
  });

  it('feeds the shared score curve without ever contradicting a Rating', () => {
    const order = ['Try Again', 'Good', 'Great', 'Perfect'];
    for (const difficulty of DIFFICULTIES) {
      let previousRank = order.length - 1;
      for (let cents = 0; cents <= ECHO_DIFFICULTY[difficulty].divisor * 100; cents += 5) {
        const score = calculateScore(accuracyFromCents(cents, difficulty));
        const rank = order.indexOf(getEchoRating(score));
        expect(rank).toBeGreaterThanOrEqual(0);
        expect(rank).toBeLessThanOrEqual(previousRank);
        previousRank = rank;
      }
    }
  });
});

// ── position <-> frequency mapping ──────────────────────────────────

describe('positionToFrequency / frequencyToPosition', () => {
  it('round-trips across the range', () => {
    const rand = seededRand(31);
    for (let i = 0; i < 500; i++) {
      const position = rand();
      const freq = positionToFrequency(position);
      expect(frequencyToPosition(freq)).toBeCloseTo(position, 6);
    }
  });

  it('maps the endpoints and the log-midpoint correctly', () => {
    expect(positionToFrequency(0)).toBeCloseTo(MIN_FREQ, 6);
    expect(positionToFrequency(1)).toBeCloseTo(MAX_FREQ, 6);
    expect(positionToFrequency(0.5)).toBeCloseTo(440, 6);
    expect(frequencyToPosition(MIN_FREQ)).toBeCloseTo(0, 6);
    expect(frequencyToPosition(MAX_FREQ)).toBeCloseTo(1, 6);
  });

  it('is monotonically increasing', () => {
    let previous = MIN_FREQ;
    for (let p = 0; p <= 1; p += 0.02) {
      const freq = positionToFrequency(p);
      expect(freq).toBeGreaterThanOrEqual(previous);
      previous = freq;
    }
  });
});

describe('applyCents', () => {
  it('a 1200-cent shift is exactly one octave', () => {
    expect(applyCents(440, 1200)).toBeCloseTo(880, 6);
    expect(applyCents(440, -1200)).toBeCloseTo(220, 6);
  });

  it('clamps to the playable range', () => {
    expect(applyCents(MAX_FREQ, 500)).toBe(MAX_FREQ);
    expect(applyCents(MIN_FREQ, -500)).toBe(MIN_FREQ);
  });

  it('a zero-cent shift is a no-op', () => {
    expect(applyCents(500, 0)).toBeCloseTo(500, 6);
  });
});

// ── slider start offset ─────────────────────────────────────────────

describe('makeStartFrequency', () => {
  it('always lands at least MIN_START_OFFSET_CENTS from the target', () => {
    const rand = seededRand(4242);
    for (let i = 0; i < 1000; i++) {
      const target = makeFrequency(rand);
      const start = makeStartFrequency(target, rand);
      // A small epsilon absorbs floating-point round-trip error in the
      // fallback path (apply-cents-then-measure-cents), same pattern the
      // rest of the hub uses for exact-boundary geometry checks.
      expect(centsBetween(start, target)).toBeGreaterThanOrEqual(MIN_START_OFFSET_CENTS - 0.01);
    }
  });

  it('always stays within the playable range', () => {
    const rand = seededRand(909);
    for (let i = 0; i < 1000; i++) {
      const target = makeFrequency(rand);
      const start = makeStartFrequency(target, rand);
      expect(start).toBeGreaterThanOrEqual(MIN_FREQ);
      expect(start).toBeLessThanOrEqual(MAX_FREQ);
    }
  });

  it('lands on both sides of the target across many draws (never leaks direction)', () => {
    const rand = seededRand(31337);
    let above = 0;
    let below = 0;
    for (let i = 0; i < 300; i++) {
      const target = makeFrequency(rand);
      const start = makeStartFrequency(target, rand);
      if (start > target) above++;
      else if (start < target) below++;
    }
    expect(above).toBeGreaterThan(0);
    expect(below).toBeGreaterThan(0);
  });

  it('still returns a valid, far-enough start near either edge of the range', () => {
    // Targets pinned close to each edge exercise the fallback path, where
    // one direction is clamped and the helper must fall back to the other.
    const rand = seededRand(1);
    for (const target of [MIN_FREQ + 1, MIN_FREQ + 50, MAX_FREQ - 50, MAX_FREQ - 1]) {
      const start = makeStartFrequency(target, rand);
      expect(start).toBeGreaterThanOrEqual(MIN_FREQ);
      expect(start).toBeLessThanOrEqual(MAX_FREQ);
      expect(centsBetween(start, target)).toBeGreaterThanOrEqual(MIN_START_OFFSET_CENTS - 0.01);
    }
  });

  it('is a pure function of target and the RNG it is given', () => {
    expect(makeStartFrequency(500, seededRand(17))).toBe(makeStartFrequency(500, seededRand(17)));
  });
});

// ── pitchDescriptor ──────────────────────────────────────────────────

describe('pitchDescriptor', () => {
  it('never mentions a raw Hz number', () => {
    const rand = seededRand(3);
    for (let i = 0; i < 200; i++) {
      const freq = makeFrequency(rand);
      expect(pitchDescriptor(freq)).not.toMatch(/\d/);
    }
  });

  it('is monotonic-ish: the low end and high end read as opposite extremes', () => {
    expect(pitchDescriptor(MIN_FREQ).toLowerCase()).toContain('low');
    expect(pitchDescriptor(MAX_FREQ).toLowerCase()).toContain('high');
  });
});

// ── Challenge rounds ─────────────────────────────────────────────────

describe('getEchoChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getEchoChallengeRounds('abc123')).toEqual(getEchoChallengeRounds('abc123'));
    expect(getEchoChallengeRounds('ABC123')).toEqual(getEchoChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getEchoChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('gives different codes different target pitches', () => {
    expect(getEchoChallengeRounds('aaaaaa')).not.toEqual(getEchoChallengeRounds('bbbbbb'));
  });

  it('keeps every seeded target within the playable range', () => {
    for (let i = 0; i < 200; i++) {
      for (const round of getEchoChallengeRounds(`fuzz-${i}`)) {
        expect(round.target).toBeGreaterThanOrEqual(MIN_FREQ);
        expect(round.target).toBeLessThanOrEqual(MAX_FREQ);
      }
    }
  });
});

// ── Score display (2dp), same contract as every other game ─────────

describe('Echo Ear score display (2dp)', () => {
  it('formats every round score to at most 2 decimal places, across difficulties', () => {
    const rand = seededRand(555);
    for (let i = 0; i < 2000; i++) {
      const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
      const target = makeFrequency(rand);
      const guess = makeFrequency(rand);
      const score = calculateScore(accuracyFromCents(centsBetween(guess, target), difficulty));
      expect(formatScore(score)).toMatch(/^\d+(\.\d{2})?$/);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });

  it('keeps a session total at 2dp after summing several round scores', () => {
    const rand = seededRand(999);
    for (let session = 0; session < 300; session++) {
      let total = 0;
      for (let r = 0; r < 5; r++) {
        const difficulty = DIFFICULTIES[Math.floor(rand() * DIFFICULTIES.length)];
        const target = makeFrequency(rand);
        const guess = makeFrequency(rand);
        const score = calculateScore(accuracyFromCents(centsBetween(guess, target), difficulty));
        total = round2(total + score);
      }
      expect(formatScore(total)).toMatch(/^\d+(\.\d{2})?$/);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(50);
    }
  });

  it('an exact match always scores the max, for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const score = calculateScore(accuracyFromCents(0, difficulty));
      expect(score).toBe(10);
      expect(formatScore(score)).toBe('10');
    }
  });
});
