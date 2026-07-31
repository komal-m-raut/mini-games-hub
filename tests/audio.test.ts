import { describe, expect, it } from 'vitest';
import { waterBodyCutoff, waterGurgleScale, waterResonanceFreq } from '@/lib/sounds';

describe('waterResonanceFreq — quarter-wave stopped-pipe sweep (H5/R1)', () => {
  it('starts at the empty-glass resonance (~260Hz)', () => {
    expect(waterResonanceFreq(0)).toBeCloseTo(260, 5);
  });

  it('ends at the full-glass resonance (~1800Hz)', () => {
    expect(waterResonanceFreq(100)).toBeCloseTo(1800, 5);
  });

  it('rises monotonically as the glass fills', () => {
    const samples = [0, 10, 25, 40, 55, 70, 85, 100].map(waterResonanceFreq);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it('clamps out-of-range fill percentages to the valid endpoints', () => {
    expect(waterResonanceFreq(-50)).toBeCloseTo(waterResonanceFreq(0), 5);
    expect(waterResonanceFreq(150)).toBeCloseTo(waterResonanceFreq(100), 5);
  });
});

describe('waterBodyCutoff — body lowpass darkens as the glass fills', () => {
  it('is brightest when empty and duller when full', () => {
    expect(waterBodyCutoff(0)).toBeGreaterThan(waterBodyCutoff(100));
  });

  it('decreases monotonically across the range', () => {
    const samples = [0, 20, 40, 60, 80, 100].map(waterBodyCutoff);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeLessThan(samples[i - 1]);
    }
  });

  it('clamps out-of-range input', () => {
    expect(waterBodyCutoff(-10)).toBe(waterBodyCutoff(0));
    expect(waterBodyCutoff(200)).toBe(waterBodyCutoff(100));
  });
});

describe('waterGurgleScale — bubbles rise in pitch alongside the main cue', () => {
  it('scales from 0.7x (empty) to 1.3x (full)', () => {
    expect(waterGurgleScale(0)).toBeCloseTo(0.7, 5);
    expect(waterGurgleScale(100)).toBeCloseTo(1.3, 5);
  });

  it('increases monotonically', () => {
    const samples = [0, 25, 50, 75, 100].map(waterGurgleScale);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it('clamps out-of-range input instead of extrapolating below/above range', () => {
    expect(waterGurgleScale(-20)).toBe(waterGurgleScale(0));
    expect(waterGurgleScale(120)).toBe(waterGurgleScale(100));
  });
});
