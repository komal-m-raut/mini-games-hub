import { describe, expect, it } from 'vitest';
import { calculateAccuracy, getRating, getSizeDiffLabel } from '@/utils/accuracy';
import { MAX_ROUND_SCORE, calculateScore } from '@/utils/scoring';

describe('calculateScore — accuracy (0–100) to round score (0–10)', () => {
  it('gives 10 for perfect accuracy', () => {
    expect(calculateScore(100)).toBe(MAX_ROUND_SCORE);
  });

  it('gives 0 at or below 50% accuracy', () => {
    expect(calculateScore(50)).toBe(0);
    expect(calculateScore(49.9)).toBe(0);
    expect(calculateScore(0)).toBe(0);
  });

  it('loses one point per 5% of accuracy', () => {
    expect(calculateScore(95)).toBe(9);
    expect(calculateScore(90)).toBe(8);
    expect(calculateScore(75)).toBe(5);
    expect(calculateScore(55)).toBe(1);
  });

  it('rounds to the nearest point at half-step boundaries', () => {
    // (accuracy - 50) / 5 = x.5 → Math.round rounds up
    expect(calculateScore(97.5)).toBe(10);
    expect(calculateScore(97.4)).toBe(9);
    expect(calculateScore(52.5)).toBe(1);
    expect(calculateScore(52.4)).toBe(0);
  });

  it('never exceeds the bounds on out-of-range input', () => {
    expect(calculateScore(150)).toBe(MAX_ROUND_SCORE);
    expect(calculateScore(-20)).toBe(0);
  });
});

describe('calculateAccuracy', () => {
  it('is 100 for an exact match', () => {
    expect(calculateAccuracy(50, 50)).toBe(100);
  });

  it('is symmetric for over- and under-shooting', () => {
    expect(calculateAccuracy(50, 40)).toBe(calculateAccuracy(50, 60));
  });

  it('scales the miss relative to the target size', () => {
    expect(calculateAccuracy(50, 45)).toBe(90); // 5 off a 50 target = 10% miss
    expect(calculateAccuracy(100, 90)).toBe(90);
  });

  it('floors at 0 for wild misses', () => {
    expect(calculateAccuracy(30, 90)).toBe(0); // 200% miss
  });

  it('returns 0 for a zero target instead of dividing by zero', () => {
    expect(calculateAccuracy(0, 50)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(calculateAccuracy(30, 29)).toBe(96.7); // 1/30 = 3.333…% miss
  });
});

describe('getRating — accuracy vs difficulty tolerance', () => {
  // Easy: tolerance 15 → Perfect ≥ 92.5, Great ≥ 85, Good ≥ 70
  it('rates Easy boundaries (±15%)', () => {
    expect(getRating(92.5, 15)).toBe('Perfect');
    expect(getRating(92.4, 15)).toBe('Great');
    expect(getRating(85, 15)).toBe('Great');
    expect(getRating(84.9, 15)).toBe('Good');
    expect(getRating(70, 15)).toBe('Good');
    expect(getRating(69.9, 15)).toBe('Try Again');
  });

  // Hard: tolerance 5 → Perfect ≥ 97.5, Great ≥ 95, Good ≥ 90
  it('rates Hard boundaries (±5%)', () => {
    expect(getRating(97.5, 5)).toBe('Perfect');
    expect(getRating(97.4, 5)).toBe('Great');
    expect(getRating(95, 5)).toBe('Great');
    expect(getRating(94.9, 5)).toBe('Good');
    expect(getRating(90, 5)).toBe('Good');
    expect(getRating(89.9, 5)).toBe('Try Again');
  });

  it('rates a perfect run Perfect at any tolerance', () => {
    expect(getRating(100, 15)).toBe('Perfect');
    expect(getRating(100, 10)).toBe('Perfect');
    expect(getRating(100, 5)).toBe('Perfect');
  });
});

describe('getSizeDiffLabel', () => {
  it('celebrates near-exact matches', () => {
    expect(getSizeDiffLabel(50, 50)).toBe('Spot on!');
    expect(getSizeDiffLabel(50, 50.9)).toBe('Spot on!');
  });

  it('describes direction and magnitude', () => {
    expect(getSizeDiffLabel(50, 60)).toBe('20% too big');
    expect(getSizeDiffLabel(50, 40)).toBe('20% too small');
  });
});
