import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import { makeChallengeRand } from '@/lib/challenge';
import { calculateAccuracy, getRating } from '@/utils/accuracy';
import { calculateScore } from '@/utils/scoring';
import {
  TIME_SENSE_DIFFICULTY,
  formatSeconds,
  formatSignedError,
  makeDuration,
} from '@/games/time-sense/constants';
import { getTimeSenseChallengeRounds } from '@/games/time-sense/challenge';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

describe('makeDuration', () => {
  it('matches the documented ranges exactly', () => {
    expect(TIME_SENSE_DIFFICULTY.easy.minSeconds).toBe(1.5);
    expect(TIME_SENSE_DIFFICULTY.easy.maxSeconds).toBe(3.0);
    expect(TIME_SENSE_DIFFICULTY.medium.minSeconds).toBe(1.0);
    expect(TIME_SENSE_DIFFICULTY.medium.maxSeconds).toBe(4.5);
    expect(TIME_SENSE_DIFFICULTY.hard.minSeconds).toBe(2.0);
    expect(TIME_SENSE_DIFFICULTY.hard.maxSeconds).toBe(6.0);
  });

  it('stays within the documented range for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const cfg = TIME_SENSE_DIFFICULTY[difficulty];
      const rand = makeChallengeRand(`range-check-${difficulty}`, 'time-sense');
      for (let i = 0; i < 300; i++) {
        const seconds = makeDuration(difficulty, rand);
        expect(seconds).toBeGreaterThanOrEqual(cfg.minSeconds);
        expect(seconds).toBeLessThanOrEqual(cfg.maxSeconds);
      }
    }
  });

  it('rounds to 2 decimal places', () => {
    const rand = makeChallengeRand('precision-check', 'time-sense');
    for (let i = 0; i < 200; i++) {
      const seconds = makeDuration('hard', rand);
      expect(seconds).toBeCloseTo(Math.round(seconds * 100) / 100, 10);
    }
  });

  it('is deterministic for the same seed', () => {
    for (const difficulty of DIFFICULTIES) {
      const randA = makeChallengeRand('same-seed', 'time-sense');
      const randB = makeChallengeRand('same-seed', 'time-sense');
      expect(makeDuration(difficulty, randA)).toBe(makeDuration(difficulty, randB));
    }
  });

  it('differs across seeds', () => {
    const randA = makeChallengeRand('seed-one', 'time-sense');
    const randB = makeChallengeRand('seed-two', 'time-sense');
    expect(makeDuration('medium', randA)).not.toBe(makeDuration('medium', randB));
  });

  it('differs across difficulties for the same seed (different ranges)', () => {
    const rand = makeChallengeRand('shared-seed', 'time-sense');
    const easy = makeDuration('easy', rand);
    const hard = makeDuration('hard', rand);
    expect(easy).not.toBe(hard);
  });

  it('defaults to Math.random when no rand is supplied', () => {
    for (const difficulty of DIFFICULTIES) {
      const cfg = TIME_SENSE_DIFFICULTY[difficulty];
      const seconds = makeDuration(difficulty);
      expect(seconds).toBeGreaterThanOrEqual(cfg.minSeconds);
      expect(seconds).toBeLessThanOrEqual(cfg.maxSeconds);
    }
  });
});

describe('getTimeSenseChallengeRounds', () => {
  it('produces identical rounds for the same code', () => {
    const a = getTimeSenseChallengeRounds('abc123');
    const b = getTimeSenseChallengeRounds('abc123');
    expect(a).toEqual(b);
  });

  it('is case-insensitive', () => {
    const lower = getTimeSenseChallengeRounds('abcxyz');
    const upper = getTimeSenseChallengeRounds('ABCXYZ');
    expect(lower).toEqual(upper);
  });

  it('always sequences easy → medium → hard', () => {
    const rounds = getTimeSenseChallengeRounds('sequence-check');
    expect(rounds.map((r) => r.difficulty)).toEqual(['easy', 'medium', 'hard']);
  });

  it('differs across codes', () => {
    const a = getTimeSenseChallengeRounds('codeone');
    const b = getTimeSenseChallengeRounds('codetwo');
    expect(a).not.toEqual(b);
  });

  it('every seeded round stays within its own difficulty range', () => {
    const rounds = getTimeSenseChallengeRounds('range-check');
    for (const round of rounds) {
      const cfg = TIME_SENSE_DIFFICULTY[round.difficulty];
      expect(round.targetSeconds).toBeGreaterThanOrEqual(cfg.minSeconds);
      expect(round.targetSeconds).toBeLessThanOrEqual(cfg.maxSeconds);
    }
  });

  it('seeded durations round to 2 decimal places', () => {
    const rounds = getTimeSenseChallengeRounds('decimal-check');
    for (const round of rounds) {
      expect(round.targetSeconds).toBeCloseTo(Math.round(round.targetSeconds * 100) / 100, 10);
    }
  });
});

describe('scoring plumbing: calculateAccuracy → calculateScore', () => {
  it('an exact hold scores a perfect 10', () => {
    const targetMs = 2400;
    const accuracy = calculateAccuracy(targetMs, targetMs);
    expect(accuracy).toBe(100);
    expect(calculateScore(accuracy)).toBe(10);
    expect(getRating(accuracy)).toBe('Perfect');
  });

  it('a hold 10% over or under lands at 90% accuracy and an 8/10 score', () => {
    const targetMs = 3000;
    const over = calculateAccuracy(targetMs, targetMs * 1.1);
    const under = calculateAccuracy(targetMs, targetMs * 0.9);
    expect(over).toBeCloseTo(90, 5);
    expect(under).toBeCloseTo(90, 5);
    expect(calculateScore(over)).toBe(8);
    expect(calculateScore(under)).toBe(8);
  });

  it('a hold 50% off lands at 50% accuracy — the zero-score boundary', () => {
    const targetMs = 2000;
    const accuracy = calculateAccuracy(targetMs, targetMs * 1.5);
    expect(accuracy).toBeCloseTo(50, 5);
    expect(calculateScore(accuracy)).toBe(0);
  });

  it('a wildly wrong hold clamps to 0, never negative', () => {
    const accuracy = calculateAccuracy(2000, 20000);
    expect(calculateScore(accuracy)).toBe(0);
  });

  it('rounds the final score to 2 decimal places', () => {
    const targetMs = 2730;
    const heldMs = 2510;
    const accuracy = calculateAccuracy(targetMs, heldMs);
    const score = calculateScore(accuracy);
    expect(score).toBeCloseTo(Math.round(score * 100) / 100, 10);
  });

  it('errors grow with duration (scalar timing): the same absolute miss scores worse against a shorter target', () => {
    const shortTargetAccuracy = calculateAccuracy(1000, 1200); // 200ms off a 1s target
    const longTargetAccuracy = calculateAccuracy(5000, 5200); // 200ms off a 5s target
    expect(longTargetAccuracy).toBeGreaterThan(shortTargetAccuracy);
  });
});

describe('formatSeconds', () => {
  it('renders milliseconds as seconds to 2dp with a trailing "s"', () => {
    expect(formatSeconds(2400)).toBe('2.40s');
    expect(formatSeconds(0)).toBe('0.00s');
    expect(formatSeconds(6000)).toBe('6.00s');
  });
});

describe('formatSignedError', () => {
  it('labels an over-hold with a plus sign and "over"', () => {
    expect(formatSignedError(320)).toBe('+0.32s over');
  });

  it('labels an under-hold with a minus sign and "under"', () => {
    expect(formatSignedError(-180)).toBe('−0.18s under');
  });

  it('reports an exact match distinctly', () => {
    expect(formatSignedError(0)).toBe('Exact!');
  });
});
