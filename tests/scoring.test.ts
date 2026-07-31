import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateAccuracy, getRating, getSizeDiffLabel } from '@/utils/accuracy';
import {
  MAX_ROUND_SCORE,
  calculateScore,
  getLocalBestSession,
  getLocalHighScore,
  saveBestSession,
  saveHighScore,
} from '@/utils/scoring';

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

/**
 * The scoring module gates all storage access behind `typeof window ===
 * 'undefined'`; the vitest environment here is 'node', so there is no real
 * `window`/`localStorage` global. A minimal in-memory stub is enough to
 * exercise the read/write paths without pulling in jsdom.
 */
function installLocalStorageStub() {
  const store = new Map<string, string>();
  const stub = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { localStorage: unknown }).localStorage = stub;
  return stub;
}

function uninstallLocalStorageStub() {
  delete (globalThis as unknown as { window?: unknown }).window;
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
}

describe('localStorage best-score guards (M13)', () => {
  let storage: ReturnType<typeof installLocalStorageStub>;

  beforeEach(() => {
    storage = installLocalStorageStub();
  });

  afterEach(() => {
    uninstallLocalStorageStub();
  });

  it('getLocalHighScore falls back to 0 for a missing value', () => {
    expect(getLocalHighScore()).toBe(0);
  });

  it('getLocalHighScore falls back to 0 for a corrupted (non-numeric) value instead of NaN', () => {
    storage.setItem('mgh_balloon_best10', 'not-a-number');
    expect(getLocalHighScore()).toBe(0);
    expect(Number.isNaN(getLocalHighScore())).toBe(false);
  });

  it('saveHighScore beats a corrupted stored value since NaN can no longer freeze detection', () => {
    storage.setItem('mgh_balloon_best10', 'garbage');
    expect(saveHighScore(5)).toBe(true);
    expect(getLocalHighScore()).toBe(5);
  });

  it('saveHighScore only overwrites when the new score is strictly higher', () => {
    storage.setItem('mgh_balloon_best10', '7');
    expect(saveHighScore(6)).toBe(false);
    expect(getLocalHighScore()).toBe(7);
    expect(saveHighScore(8)).toBe(true);
    expect(getLocalHighScore()).toBe(8);
  });

  it('getLocalBestSession falls back to 0 for a corrupted (non-numeric) value instead of NaN', () => {
    storage.setItem('mgh_balloon_best_session', 'NaN-ish garbage');
    expect(getLocalBestSession('balloon-match')).toBe(0);
  });

  it('saveBestSession beats a corrupted stored value for a non-legacy game key too', () => {
    storage.setItem('mgh_best_session_perfect-pour', '¯\\_(ツ)_/¯');
    expect(saveBestSession('perfect-pour', 12)).toBe(true);
    expect(getLocalBestSession('perfect-pour')).toBe(12);
  });

  it('saveHighScore does not throw when localStorage.setItem throws (quota/private mode)', () => {
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(() => saveHighScore(3)).not.toThrow();
    // The in-memory "win" still reports true even though persistence failed.
    expect(saveHighScore(3)).toBe(true);
  });

  it('saveBestSession does not throw when localStorage.setItem throws (quota/private mode)', () => {
    storage.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(() => saveBestSession('memory-path', 10)).not.toThrow();
  });
});
