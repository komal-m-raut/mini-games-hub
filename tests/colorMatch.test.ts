import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import {
  NORMAL_ROUND_COUNT,
  calculateScore,
  formatScore,
  getLocalBestSession,
  round2,
  saveBestSession,
} from '@/utils/scoring';
import {
  CHANNEL_MAX,
  RGB,
  colorAccuracy,
  colorDistance,
  hslToRgb,
  rgbHue,
  rgbToHex,
} from '@/games/color-match/colorMath';
import {
  AMAZING_ACCURACY,
  COLOR_DIFFICULTY,
  MIN_HUE_GAP,
  PERFECT_ACCURACY,
  bestSessionKey,
  getColorAccuracy,
  getColorRating,
  makeTargetColor,
} from '@/games/color-match/constants';
import { getColorChallengeRounds } from '@/games/color-match/challenge';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

describe('hslToRgb', () => {
  it('converts the primaries and greys', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 });
    expect(hslToRgb(240, 100, 50)).toEqual({ r: 0, g: 0, b: 255 });
    expect(hslToRgb(0, 0, 0)).toEqual({ r: 0, g: 0, b: 0 });
    expect(hslToRgb(0, 0, 100)).toEqual({ r: 255, g: 255, b: 255 });
    // Hue is irrelevant at zero saturation
    expect(hslToRgb(37, 0, 50)).toEqual(hslToRgb(210, 0, 50));
  });

  it('wraps hue and keeps every channel in range', () => {
    expect(hslToRgb(360, 100, 50)).toEqual(hslToRgb(0, 100, 50));
    expect(hslToRgb(-60, 80, 40)).toEqual(hslToRgb(300, 80, 40));

    const rand = seededRand(7);
    for (let i = 0; i < 500; i++) {
      const { r, g, b } = hslToRgb(rand() * 720 - 360, rand() * 100, rand() * 100);
      for (const channel of [r, g, b]) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(CHANNEL_MAX);
      }
    }
  });
});

describe('rgbToHex', () => {
  it('pads single-digit channels', () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000');
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#FFFFFF');
    expect(rgbToHex({ r: 5, g: 16, b: 171 })).toBe('#0510AB');
  });
});

describe('colorDistance', () => {
  const target: RGB = { r: 120, g: 80, b: 200 };

  it('is zero for identical colours and symmetric otherwise', () => {
    expect(colorDistance(target, target)).toBe(0);
    const other: RGB = { r: 20, g: 220, b: 15 };
    expect(colorDistance(target, other)).toBeCloseTo(colorDistance(other, target), 10);
  });

  it('normalises black vs white to exactly 1', () => {
    expect(colorDistance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(1, 10);
  });

  it('grows with the size of the miss', () => {
    const near = colorDistance(target, { ...target, g: target.g + 10 });
    const far = colorDistance(target, { ...target, g: target.g + 60 });
    expect(near).toBeLessThan(far);
  });

  it('costs less on blue than on green, which is how the eye works', () => {
    const greenMiss = colorDistance(target, { ...target, g: target.g + 40 });
    const blueMiss = colorDistance(target, { ...target, b: target.b + 40 });
    expect(blueMiss).toBeLessThan(greenMiss);
  });
});

describe('colorAccuracy', () => {
  const target: RGB = { r: 200, g: 90, b: 40 };

  it('is 100 for an exact match at every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getColorAccuracy(target, target, difficulty)).toBe(100);
    }
  });

  it('never leaves the 0–100 range, even beyond the tolerance', () => {
    const opposite: RGB = { r: 0, g: 255, b: 255 };
    for (const difficulty of DIFFICULTIES) {
      const accuracy = getColorAccuracy(target, opposite, difficulty);
      expect(accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy).toBeLessThanOrEqual(100);
    }
  });

  it('scores the same miss lower as difficulty rises', () => {
    const guess: RGB = { r: 200, g: 110, b: 55 };
    const easy = getColorAccuracy(target, guess, 'easy');
    const medium = getColorAccuracy(target, guess, 'medium');
    const hard = getColorAccuracy(target, guess, 'hard');
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
  });

  it('decreases monotonically as the guess drifts away', () => {
    let previous = 100;
    for (let miss = 0; miss <= 120; miss += 10) {
      const accuracy = colorAccuracy(target, { ...target, r: target.r - miss }, 0.4);
      expect(accuracy).toBeLessThanOrEqual(previous);
      previous = accuracy;
    }
  });
});

describe('getColorRating', () => {
  it('reserves Perfect and Amazing for the top bands', () => {
    expect(getColorRating(100)).toBe('Perfect');
    expect(getColorRating(PERFECT_ACCURACY)).toBe('Perfect');
    expect(getColorRating(PERFECT_ACCURACY - 0.1)).toBe('Amazing');
    expect(getColorRating(AMAZING_ACCURACY)).toBe('Amazing');
    expect(getColorRating(AMAZING_ACCURACY - 0.1)).toBe('Great');
  });

  it('falls back to the shared score curve below 95%', () => {
    expect(getColorRating(90)).toBe('Great');
    expect(getColorRating(80)).toBe('Good');
    expect(getColorRating(60)).toBe('Try Again');
    expect(getColorRating(0)).toBe('Try Again');
  });

  /**
   * The label must never contradict the score printed beside it (H3): rating
   * is a step function of accuracy, and accuracy drives the score, so the
   * bands have to stay in the same order as the numbers.
   */
  it('never improves as accuracy falls, and tracks the score', () => {
    const order = ['Try Again', 'Good', 'Great', 'Amazing', 'Perfect'];
    let previousRank = order.length - 1;
    let previousScore = calculateScore(100);

    for (let accuracy = 100; accuracy >= 0; accuracy -= 0.1) {
      const rounded = Math.round(accuracy * 10) / 10;
      const rank = order.indexOf(getColorRating(rounded));
      const score = calculateScore(rounded);
      expect(rank).toBeGreaterThanOrEqual(0);
      expect(rank).toBeLessThanOrEqual(previousRank);
      expect(score).toBeLessThanOrEqual(previousScore);
      previousRank = rank;
      previousScore = score;
    }
  });
});

describe('makeTargetColor', () => {
  it('is a pure function of the RNG it is given', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeTargetColor(difficulty, seededRand(99))).toEqual(
        makeTargetColor(difficulty, seededRand(99))
      );
    }
  });

  it('produces in-range channels for every difficulty', () => {
    const rand = seededRand(2024);
    for (let i = 0; i < 300; i++) {
      for (const difficulty of DIFFICULTIES) {
        const { r, g, b } = makeTargetColor(difficulty, rand);
        for (const channel of [r, g, b]) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(CHANNEL_MAX);
        }
      }
    }
  });

  /**
   * The complaint this guards: consecutive rounds felt like "the same colour
   * again". Random hues clump, so each target is steered at least
   * MIN_HUE_GAP degrees around the wheel from the previous one.
   */
  it('keeps every target clear of the previous round\'s hue', () => {
    const rand = seededRand(31337);
    for (const difficulty of DIFFICULTIES) {
      let previousHue: number | undefined;
      for (let i = 0; i < 400; i++) {
        const target = makeTargetColor(difficulty, rand, previousHue);
        const hue = rgbHue(target);
        if (previousHue !== undefined) {
          const gap = Math.abs(hue - previousHue);
          // Shortest way round the wheel
          expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(MIN_HUE_GAP - 1);
        }
        previousHue = hue;
      }
    }
  });

  /**
   * Targets must stay ordinary colours: the neon (near-100% saturation) and
   * muted (near-grey) extremes were removed deliberately, and nothing should
   * quietly reintroduce them.
   */
  it('never generates a neon or a near-grey', () => {
    const rand = seededRand(4242);
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 500; i++) {
        const { r, g, b } = makeTargetColor(difficulty, rand);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const lightness = (max + min) / 2 / 255;
        const saturation = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
        expect(saturation).toBeGreaterThan(0.35);
        expect(saturation).toBeLessThan(0.95);
        expect(lightness).toBeGreaterThan(0.3);
        expect(lightness).toBeLessThan(0.68);
      }
    }
  });
});

describe('difficulty configuration', () => {
  it('shortens observation time and tightens tolerance as it gets harder', () => {
    const { easy, medium, hard } = COLOR_DIFFICULTY;
    expect(easy.observeSeconds).toBeGreaterThan(medium.observeSeconds);
    expect(medium.observeSeconds).toBeGreaterThan(hard.observeSeconds);
    expect(easy.tolerance).toBeGreaterThan(medium.tolerance);
    expect(medium.tolerance).toBeGreaterThan(hard.tolerance);
    // A tolerance above the 0–1 distance ceiling would make every guess score.
    for (const cfg of [easy, medium, hard]) {
      expect(cfg.tolerance).toBeGreaterThan(0);
      expect(cfg.tolerance).toBeLessThanOrEqual(1);
    }
  });
});

describe('getColorChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getColorChallengeRounds('abc123')).toEqual(getColorChallengeRounds('abc123'));
    expect(getColorChallengeRounds('ABC123')).toEqual(getColorChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getColorChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('gives different codes different colours', () => {
    expect(getColorChallengeRounds('aaaaaa')).not.toEqual(getColorChallengeRounds('bbbbbb'));
  });

  it('keeps every seeded target renderable', () => {
    for (let i = 0; i < 200; i++) {
      for (const round of getColorChallengeRounds(`fuzz-${i}`)) {
        const { r, g, b } = round.target;
        for (const channel of [r, g, b]) {
          expect(Number.isInteger(channel)).toBe(true);
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(CHANNEL_MAX);
        }
      }
    }
  });
});

describe('Color Match score display (2dp)', () => {
  /** Random RGB channel, occasionally clamped to an edge to hit boundary cases. */
  function randomChannel(rand: () => number): number {
    return Math.round(rand() * CHANNEL_MAX);
  }

  function randomRgb(rand: () => number): RGB {
    return { r: randomChannel(rand), g: randomChannel(rand), b: randomChannel(rand) };
  }

  it('formats every round score to at most 2 decimal places, across difficulties', () => {
    const rand = seededRand(555);
    for (let i = 0; i < 2000; i++) {
      const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
      const target = randomRgb(rand);
      const guess = randomRgb(rand);
      const accuracy = getColorAccuracy(target, guess, difficulty);
      const score = calculateScore(accuracy);
      expect(formatScore(score)).toMatch(/^\d+(\.\d{2})?$/);
    }
  });

  it('keeps every round score in [0, 10] as an exact 2dp value', () => {
    const rand = seededRand(777);
    for (let i = 0; i < 2000; i++) {
      const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
      const target = randomRgb(rand);
      const guess = randomRgb(rand);
      const score = calculateScore(getColorAccuracy(target, guess, difficulty));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
      // round2 must be a no-op on an already-2dp score — otherwise the value
      // carries hidden float drift that would eventually surface on screen.
      expect(round2(score)).toBe(score);
    }
  });

  /**
   * A session total is a sum of several round scores, which is exactly where
   * binary-float drift (e.g. 0.1 + 0.2) could sneak a long decimal tail past
   * `formatScore`. Routing the sum through `round2` (as SessionSummary and
   * ChallengeComplete both do) has to close that off for real game totals,
   * not just contrived numbers.
   */
  it('keeps a session total at 2dp after summing several round scores', () => {
    const rand = seededRand(999);
    for (let session = 0; session < 500; session++) {
      const roundScores: number[] = [];
      for (let r = 0; r < 5; r++) {
        const difficulty = DIFFICULTIES[Math.floor(rand() * DIFFICULTIES.length)];
        const target = randomRgb(rand);
        const guess = randomRgb(rand);
        roundScores.push(calculateScore(getColorAccuracy(target, guess, difficulty)));
      }
      const total = round2(roundScores.reduce((a, b) => a + b, 0));
      expect(formatScore(total)).toMatch(/^\d+(\.\d{2})?$/);
    }
  });

  it('formats representative exact cases the way the rest of the hub does', () => {
    const target: RGB = { r: 180, g: 60, b: 210 };

    // Exact match always scores the max and prints without a decimal point.
    for (const difficulty of DIFFICULTIES) {
      const score = calculateScore(getColorAccuracy(target, target, difficulty));
      expect(score).toBe(10);
      expect(formatScore(score)).toBe('10');
    }

    // A miss large enough to floor accuracy at 0 must still print clean.
    const farOff: RGB = { r: 255 - target.r, g: 255 - target.g, b: 255 - target.b };
    const zeroScore = calculateScore(getColorAccuracy(target, farOff, 'hard'));
    expect(formatScore(zeroScore)).toBe('0');

    // A fractional score (non-whole tenths/hundredths) must keep both digits.
    expect(formatScore(calculateScore(87.3))).toBe('7.46');
    expect(formatScore(calculateScore(92))).toBe('8.40');
  });
});

/**
 * The scoring module gates storage behind `typeof window === 'undefined'` and
 * the vitest environment is 'node', so a minimal in-memory stub is enough to
 * exercise the read/write paths without pulling in jsdom (same approach as
 * tests/scoring.test.ts).
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
  return store;
}

describe('best session per round count', () => {
  let store: ReturnType<typeof installLocalStorageStub>;

  beforeEach(() => {
    store = installLocalStorageStub();
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  });

  it('keeps the bare game id for the default length so existing records survive', () => {
    expect(bestSessionKey(NORMAL_ROUND_COUNT)).toBe('color-match');
    store.set('mgh_best_session_color-match', '41.5');
    expect(getLocalBestSession(bestSessionKey(NORMAL_ROUND_COUNT))).toBe(41.5);
  });

  it('gives every other length its own record', () => {
    expect(bestSessionKey(3)).toBe('color-match-r3');
    expect(bestSessionKey(1)).toBe('color-match-r1');
    expect(new Set([1, 3, NORMAL_ROUND_COUNT].map(bestSessionKey)).size).toBe(3);
  });

  /**
   * The defect this guards: a 3-round session's 30 must not touch — or be
   * compared against — a 5-round session's 50, and a short session must still
   * record a best of its own (otherwise its summary reads "Best: 0").
   */
  it('never lets a short session overwrite or shadow the full-length best', () => {
    expect(saveBestSession(bestSessionKey(5), 47.25)).toBe(true);
    expect(saveBestSession(bestSessionKey(3), 28.6)).toBe(true);

    expect(getLocalBestSession(bestSessionKey(5))).toBe(47.25);
    expect(getLocalBestSession(bestSessionKey(3))).toBe(28.6);

    // A better 3-round result is a record at its own length, not at 5.
    expect(saveBestSession(bestSessionKey(3), 29.9)).toBe(true);
    expect(getLocalBestSession(bestSessionKey(5))).toBe(47.25);

    // And a weaker 5-round result still loses to the 5-round record.
    expect(saveBestSession(bestSessionKey(5), 12)).toBe(false);
    expect(getLocalBestSession(bestSessionKey(5))).toBe(47.25);
  });

  it('reports a best for a short session rather than a misleading zero', () => {
    saveBestSession(bestSessionKey(3), 22.4);
    expect(getLocalBestSession(bestSessionKey(3))).toBeGreaterThan(0);
  });
});

describe('solo session simulation', () => {
  /** Plays a whole session the way the hook composes its pieces. */
  function playSession(rounds: number, difficulty: Difficulty, rand: () => number) {
    const roundScores: number[] = [];
    const hues: number[] = [];
    let previousHue: number | undefined;
    let totalScore = 0;

    for (let r = 0; r < rounds; r++) {
      const target = makeTargetColor(difficulty, rand, previousHue);
      previousHue = rgbHue(target);
      hues.push(previousHue);

      // A plausible human miss rather than a random colour.
      const guess: RGB = {
        r: Math.max(0, Math.min(CHANNEL_MAX, target.r + Math.round((rand() - 0.5) * 60))),
        g: Math.max(0, Math.min(CHANNEL_MAX, target.g + Math.round((rand() - 0.5) * 60))),
        b: Math.max(0, Math.min(CHANNEL_MAX, target.b + Math.round((rand() - 0.5) * 60))),
      };

      const score = calculateScore(getColorAccuracy(target, guess, difficulty));
      roundScores.push(score);
      totalScore = round2(totalScore + score);
    }

    return { roundScores, totalScore, hues };
  }

  it('plays every offered session length end to end', () => {
    const rand = seededRand(20260809);
    for (const rounds of [1, 3, 5]) {
      for (const difficulty of DIFFICULTIES) {
        const { roundScores, totalScore } = playSession(rounds, difficulty, rand);

        expect(roundScores).toHaveLength(rounds);
        expect(totalScore).toBeGreaterThanOrEqual(0);
        expect(totalScore).toBeLessThanOrEqual(rounds * 10);
        expect(round2(totalScore)).toBe(totalScore);
        expect(formatScore(totalScore)).toMatch(/^\d+(\.\d{2})?$/);
        expect(totalScore).toBeCloseTo(
          roundScores.reduce((a, b) => a + b, 0),
          6
        );
      }
    }
  });

  it('never repeats a hue back to back across a full session', () => {
    const rand = seededRand(7777);
    for (let session = 0; session < 200; session++) {
      const { hues } = playSession(5, 'medium', rand);
      for (let i = 1; i < hues.length; i++) {
        const gap = Math.abs(hues[i] - hues[i - 1]);
        expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(MIN_HUE_GAP - 1);
      }
    }
  });
});
