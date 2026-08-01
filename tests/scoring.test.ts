import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { calculateAccuracy, getRating } from '@/utils/accuracy';
import {
  MAX_ROUND_SCORE,
  calculateScore,
  formatScore,
  getLocalBestSession,
  getLocalHighScore,
  round2,
  saveBestSession,
  saveHighScore,
} from '@/utils/scoring';

describe('round2', () => {
  it('rounds to at most 2 decimal places', () => {
    expect(round2(7.4567)).toBe(7.46);
    expect(round2(7.123)).toBe(7.12);
  });

  it('is a no-op for values already at 2dp', () => {
    expect(round2(7.46)).toBe(7.46);
    expect(round2(10)).toBe(10);
  });

  it('handles float-artefact inputs correctly (the naive *100/100 trap)', () => {
    // 1.005 * 100 === 100.49999999999999 in plain float arithmetic, so a
    // naive Math.round(n*100)/100 would give 1 instead of 1.01. Routing
    // through the string round-trip avoids that.
    expect(round2(1.005)).toBe(1.01);
    // Classic float-accumulation drift: 0.1 + 0.2 !== 0.3 in raw IEEE754.
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('rounds negative numbers correctly', () => {
    expect(round2(-7.456)).toBe(-7.46);
  });
});

describe('formatScore', () => {
  it('trims a bare .00 down to a whole number', () => {
    expect(formatScore(8)).toBe('8');
    expect(formatScore(8.0)).toBe('8');
    expect(formatScore(10)).toBe('10');
  });

  it('keeps a real 2dp fraction exactly as computed', () => {
    expect(formatScore(7.46)).toBe('7.46');
  });

  it('keeps a single trailing zero (.X0), only strips .00', () => {
    expect(formatScore(7.5)).toBe('7.50');
  });

  it('rounds to 2dp before formatting, so float noise never reaches the UI', () => {
    expect(formatScore(7.199999999999999)).toBe('7.20');
    expect(formatScore(0.1 + 0.2)).toBe('0.30');
  });

  it('does not itself clamp — callers (calculateScore) own the 0–10 bound', () => {
    // formatScore is a pure renderer; it should format whatever it's given
    // rather than silently clamping, so a caller bug surfaces as a visibly
    // wrong number instead of being masked here.
    expect(formatScore(-3)).toBe('-3');
    expect(formatScore(15.5)).toBe('15.50');
  });
});

describe('calculateScore — accuracy (0–100) to round score (0–10), 2dp', () => {
  it('gives 10 for perfect accuracy', () => {
    expect(calculateScore(100)).toBe(MAX_ROUND_SCORE);
  });

  it('gives 0 at or below 50% accuracy', () => {
    expect(calculateScore(50)).toBe(0);
    expect(calculateScore(49.9)).toBe(0);
    expect(calculateScore(0)).toBe(0);
  });

  it('loses one point per 5% of accuracy on clean values', () => {
    expect(calculateScore(95)).toBe(9);
    expect(calculateScore(90)).toBe(8);
    expect(calculateScore(75)).toBe(5);
    expect(calculateScore(55)).toBe(1);
  });

  it('carries fractional accuracy through to 2 decimal places', () => {
    // calculateAccuracy already returns 1dp, so 2dp falls out naturally.
    expect(calculateScore(87.3)).toBe(7.46);
    expect(calculateScore(96.7)).toBe(9.34);
  });

  it('rounds at the 3rd-decimal boundary rather than truncating', () => {
    // (98.76 - 50) / 5 = 9.752 → rounds to 9.75, not 9.76 or a truncated 9.7.
    expect(calculateScore(98.76)).toBe(9.75);
  });

  it('is float-artefact-safe: repeated accumulation never drifts off 2dp', () => {
    const scores = [calculateScore(87.3), calculateScore(96.7), calculateScore(61.4)];
    const total = round2(scores.reduce((a, b) => a + b, 0));
    // Every intermediate value, and the total, must land on exactly 2dp —
    // no `7.199999999999999`-style noise.
    for (const s of [...scores, total]) {
      expect(s).toBe(Number(s.toFixed(2)));
    }
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

describe('getRating — derived from the score curve (H3)', () => {
  // Score bands: Perfect ≥ 9.5, Great ≥ 8, Good ≥ 6, else Try Again — same
  // curve as `ratingFromScore`, on calculateScore's accuracy → score mapping
  // (score = (accuracy - 50) / 5). So label and number can never disagree,
  // regardless of difficulty/tolerance — the exact H3 bug this replaces
  // (Hard rating "Try Again" next to an 8/10 at 89.9% accuracy).
  it('rates the Perfect boundary at score 9.5 (accuracy 97.5)', () => {
    expect(getRating(97.5)).toBe('Perfect');
    expect(getRating(97.4)).toBe('Great');
  });

  it('rates the Great boundary at score 8 (accuracy 90)', () => {
    expect(getRating(90)).toBe('Great');
    expect(getRating(89.9)).toBe('Good');
  });

  it('rates the Good boundary at score 6 (accuracy 80)', () => {
    expect(getRating(80)).toBe('Good');
    expect(getRating(79.9)).toBe('Try Again');
  });

  it('rates a perfect run Perfect regardless of the caller', () => {
    expect(getRating(100)).toBe('Perfect');
  });

  it('never disagrees with calculateScore — the H3 regression case', () => {
    // The reported bug: 89.9% accuracy on Hard (tolerancePercent 5) used to
    // render "Try Again" next to an ~8/10. Rating is now derived from that
    // same score (7.98 here), so it reads "Good" — never the bottom tier
    // next to a near-8 number.
    expect(calculateScore(89.9)).toBeCloseTo(7.98, 2);
    expect(getRating(89.9)).toBe('Good');
    expect(getRating(89.9)).not.toBe('Try Again');
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
