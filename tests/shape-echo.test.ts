import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import { calculateScore } from '@/utils/scoring';
import {
  GUESS_POSITION_MARGIN,
  POSITION_MARGIN,
  RATIO_MAX,
  RATIO_MIN,
  SHAPE_DIFFICULTY,
  TARGET_WIDTH_MAX,
  TARGET_WIDTH_MIN,
  angularDelta,
  defaultGuess,
  makeShape,
  shapeAccuracy,
  shapeAccuracyDetail,
  shapeArea,
  symmetryPeriod,
} from '@/games/shape-echo/constants';
import { getShapeEchoChallengeRounds } from '@/games/shape-echo/challenge';
import { GuessGeom, ShapeGeom } from '@/games/shape-echo/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

describe('makeShape', () => {
  it('only draws from the difficulty\'s shape pool', () => {
    const rand = seededRand(11);
    for (let i = 0; i < 500; i++) {
      for (const difficulty of DIFFICULTIES) {
        const { type } = makeShape(difficulty, rand);
        expect(SHAPE_DIFFICULTY[difficulty].shapePool).toContain(type);
      }
    }
  });

  it('keeps easy to rectangles only, and hard eventually uses every shape', () => {
    const rand = seededRand(2222);
    const seenOnHard = new Set<string>();
    for (let i = 0; i < 300; i++) {
      expect(makeShape('easy', rand).type).toBe('rectangle');
      seenOnHard.add(makeShape('hard', rand).type);
    }
    expect(seenOnHard).toEqual(new Set(['rectangle', 'ellipse', 'triangle']));
  });

  it('keeps the center at least POSITION_MARGIN from every edge', () => {
    const rand = seededRand(33);
    for (let i = 0; i < 500; i++) {
      for (const difficulty of DIFFICULTIES) {
        const { cx, cy } = makeShape(difficulty, rand);
        expect(cx).toBeGreaterThanOrEqual(POSITION_MARGIN);
        expect(cx).toBeLessThanOrEqual(1 - POSITION_MARGIN);
        expect(cy).toBeGreaterThanOrEqual(POSITION_MARGIN);
        expect(cy).toBeLessThanOrEqual(1 - POSITION_MARGIN);
      }
    }
  });

  it('keeps width and ratio within their configured ranges', () => {
    const rand = seededRand(44);
    for (let i = 0; i < 500; i++) {
      for (const difficulty of DIFFICULTIES) {
        const { width, ratio } = makeShape(difficulty, rand);
        expect(width).toBeGreaterThanOrEqual(TARGET_WIDTH_MIN);
        expect(width).toBeLessThanOrEqual(TARGET_WIDTH_MAX);
        expect(ratio).toBeGreaterThanOrEqual(RATIO_MIN);
        expect(ratio).toBeLessThanOrEqual(RATIO_MAX);
      }
    }
  });

  it('rotation is always exactly 0 on easy, and stays within 0-180 on medium/hard', () => {
    const rand = seededRand(55);
    for (let i = 0; i < 500; i++) {
      expect(makeShape('easy', rand).rotation).toBe(0);
      for (const difficulty of ['medium', 'hard'] as Difficulty[]) {
        const { rotation } = makeShape(difficulty, rand);
        expect(rotation).toBeGreaterThanOrEqual(0);
        expect(rotation).toBeLessThanOrEqual(180);
      }
    }
  });

  it('is a pure function of the RNG it is given', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeShape(difficulty, seededRand(99))).toEqual(makeShape(difficulty, seededRand(99)));
    }
  });

  it('produces different shapes across different seeds', () => {
    const shapes = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      shapes.add(JSON.stringify(makeShape('hard', seededRand(seed * 7919 + 1))));
    }
    expect(shapes.size).toBeGreaterThan(1);
  });

  it('consumes the RNG in the same fixed order regardless of difficulty, so a shared seed advances identically', () => {
    // Same number of rand() calls on every branch (including the discarded
    // easy rotation draw) — verified indirectly: two difficulties fed from
    // identically-seeded RNGs must each leave the generator at the same
    // internal state, which shows up as identical *next* draws.
    const randEasy = seededRand(4040);
    makeShape('easy', randEasy);
    const nextAfterEasy = randEasy();

    const randHard = seededRand(4040);
    makeShape('hard', randHard);
    const nextAfterHard = randHard();

    expect(nextAfterEasy).toBe(nextAfterHard);
  });
});

describe('angularDelta', () => {
  it('folds a rectangle/ellipse (mod 180) delta the short way round', () => {
    expect(angularDelta(10, 170, 180)).toBe(20);
    expect(angularDelta(170, 10, 180)).toBe(20);
  });

  it('folds a triangle (mod 120) delta the short way round', () => {
    expect(angularDelta(10, 110, 120)).toBe(20);
    expect(angularDelta(110, 10, 120)).toBe(20);
  });

  it('is zero for identical angles, and for angles exactly one period apart', () => {
    expect(angularDelta(5, 5, 180)).toBe(0);
    expect(angularDelta(0, 180, 180)).toBe(0);
    expect(angularDelta(0, 120, 120)).toBe(0);
    expect(angularDelta(37, 37 + 360, 180)).toBe(0);
  });

  it('never exceeds half the symmetry period', () => {
    const rand = seededRand(909);
    for (let i = 0; i < 500; i++) {
      const a = rand() * 720 - 180;
      const b = rand() * 720 - 180;
      const period = i % 2 === 0 ? 180 : 120;
      const delta = angularDelta(a, b, period);
      expect(delta).toBeGreaterThanOrEqual(0);
      expect(delta).toBeLessThanOrEqual(period / 2);
    }
  });

  it('symmetryPeriod is 120 for a triangle and 180 for everything else', () => {
    expect(symmetryPeriod('triangle')).toBe(120);
    expect(symmetryPeriod('rectangle')).toBe(180);
    expect(symmetryPeriod('ellipse')).toBe(180);
  });
});

describe('shapeAccuracy / shapeAccuracyDetail', () => {
  const target: ShapeGeom = { type: 'rectangle', cx: 0.5, cy: 0.4, width: 0.3, ratio: 1.2, rotation: 40 };

  it('is 100 for an exact match, on every difficulty', () => {
    const guess: GuessGeom = { cx: target.cx, cy: target.cy, width: target.width, rotation: target.rotation };
    for (const difficulty of DIFFICULTIES) {
      expect(shapeAccuracy(target, guess, difficulty)).toBe(100);
      const detail = shapeAccuracyDetail(target, guess, difficulty);
      expect(detail.posAcc).toBe(1);
      expect(detail.sizeAcc).toBe(1);
      expect(detail.rotAcc).toBe(1);
    }
  });

  it('verifies the 0.4/0.4/0.2 arithmetic: only position off caps the score at 60 + 40·posAcc', () => {
    // Same size and rotation as target, center moved by a known distance.
    const dx = 0.1;
    const guess: GuessGeom = { cx: target.cx + dx, cy: target.cy, width: target.width, rotation: target.rotation };
    const detail = shapeAccuracyDetail(target, guess, 'medium');
    expect(detail.sizeAcc).toBe(1);
    expect(detail.rotAcc).toBe(1);

    const expectedPosAcc = 1 - dx / 0.5;
    expect(detail.posAcc).toBeCloseTo(expectedPosAcc, 10);
    const expectedAccuracy = Math.round((60 + 40 * expectedPosAcc) * 10) / 10;
    expect(detail.accuracy).toBe(expectedAccuracy);
  });

  it('verifies the arithmetic when only size is off', () => {
    const guess: GuessGeom = { cx: target.cx, cy: target.cy, width: target.width * 1.2, rotation: target.rotation };
    const detail = shapeAccuracyDetail(target, guess, 'medium');
    expect(detail.posAcc).toBe(1);
    expect(detail.rotAcc).toBe(1);

    const targetArea = shapeArea(target);
    const guessArea = shapeArea({ type: target.type, width: guess.width, ratio: target.ratio });
    const expectedSizeAcc = 1 - Math.abs(guessArea - targetArea) / targetArea;
    expect(detail.sizeAcc).toBeCloseTo(expectedSizeAcc, 10);
    const expectedAccuracy = Math.round((60 + 40 * expectedSizeAcc) * 10) / 10;
    expect(detail.accuracy).toBe(expectedAccuracy);
  });

  it('verifies the arithmetic when only rotation is off', () => {
    const guess: GuessGeom = { cx: target.cx, cy: target.cy, width: target.width, rotation: target.rotation + 30 };
    const detail = shapeAccuracyDetail(target, guess, 'medium');
    expect(detail.posAcc).toBe(1);
    expect(detail.sizeAcc).toBe(1);

    const expectedRotAcc = 1 - 30 / 90;
    expect(detail.rotAcc).toBeCloseTo(expectedRotAcc, 10);
    const expectedAccuracy = Math.round((80 + 20 * expectedRotAcc) * 10) / 10;
    expect(detail.accuracy).toBe(expectedAccuracy);
  });

  it('clamps every component at 0 for a maximally wrong guess', () => {
    const farGuess: GuessGeom = { cx: 0.02, cy: 0.02, width: 0.55, rotation: target.rotation + 90 };
    const detail = shapeAccuracyDetail(target, farGuess, 'medium');
    expect(detail.posAcc).toBeGreaterThanOrEqual(0);
    expect(detail.sizeAcc).toBeGreaterThanOrEqual(0);
    expect(detail.rotAcc).toBeGreaterThanOrEqual(0);
    expect(detail.accuracy).toBeGreaterThanOrEqual(0);

    // A guess in the opposite corner, at the largest allowed size (target is
    // small), should floor both position and size — the corner distance
    // alone already exceeds the 0.5·stage normaliser, and the area is more
    // than double the target's.
    const cornerGuess: GuessGeom = { cx: 0.98, cy: 0.98, width: 0.55, rotation: target.rotation };
    const cornerDetail = shapeAccuracyDetail(target, cornerGuess, 'medium');
    expect(cornerDetail.posAcc).toBe(0);
    expect(cornerDetail.sizeAcc).toBe(0);
  });

  it('easy ignores rotation entirely — rotAcc is always 1, regardless of the guess', () => {
    const guess: GuessGeom = { cx: target.cx, cy: target.cy, width: target.width, rotation: target.rotation + 90 };
    const detail = shapeAccuracyDetail(target, guess, 'easy');
    expect(detail.rotAcc).toBe(1);
    // With position and size perfect, easy should score a perfect 100
    // however wrong the (unscored) rotation slider is left.
    expect(detail.accuracy).toBe(100);
  });

  it('never leaves the accuracy outside 0-100', () => {
    const rand = seededRand(6767);
    for (let i = 0; i < 500; i++) {
      const t = makeShape('hard', rand);
      const guess: GuessGeom = {
        cx: rand(),
        cy: rand(),
        width: 0.1 + rand() * 0.45,
        rotation: rand() * 180,
      };
      for (const difficulty of DIFFICULTIES) {
        const accuracy = shapeAccuracy(t, guess, difficulty);
        expect(accuracy).toBeGreaterThanOrEqual(0);
        expect(accuracy).toBeLessThanOrEqual(100);
      }
    }
  });

  it('feeds calculateScore cleanly into a 0-10 round score', () => {
    const guess: GuessGeom = { cx: 0.55, cy: 0.42, width: 0.32, rotation: 35 };
    for (const difficulty of DIFFICULTIES) {
      const accuracy = shapeAccuracy(target, guess, difficulty);
      const score = calculateScore(accuracy);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
});

describe('shapeArea', () => {
  it('matches the closed-form areas for each shape type', () => {
    const width = 0.4;
    const ratio = 1.5;
    expect(shapeArea({ type: 'rectangle', width, ratio })).toBeCloseTo(width * width * ratio, 10);
    expect(shapeArea({ type: 'ellipse', width, ratio })).toBeCloseTo(
      (Math.PI / 4) * width * width * ratio,
      10
    );
    expect(shapeArea({ type: 'triangle', width, ratio })).toBeCloseTo(
      (Math.sqrt(3) / 4) * width * width,
      10
    );
  });

  it('triangle area ignores ratio entirely (width alone)', () => {
    const a = shapeArea({ type: 'triangle', width: 0.3, ratio: 0.6 });
    const b = shapeArea({ type: 'triangle', width: 0.3, ratio: 1.6 });
    expect(a).toBe(b);
  });
});

describe('defaultGuess', () => {
  it('starts centered, at the default width, with no rotation', () => {
    const guess = defaultGuess();
    expect(guess.cx).toBe(0.5);
    expect(guess.cy).toBe(0.5);
    expect(guess.width).toBeGreaterThan(0);
    expect(guess.rotation).toBe(0);
  });

  it('stays within the drag margin used elsewhere', () => {
    const guess = defaultGuess();
    expect(guess.cx).toBeGreaterThanOrEqual(GUESS_POSITION_MARGIN);
    expect(guess.cx).toBeLessThanOrEqual(1 - GUESS_POSITION_MARGIN);
  });
});

describe('getShapeEchoChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getShapeEchoChallengeRounds('abc123')).toEqual(getShapeEchoChallengeRounds('abc123'));
    expect(getShapeEchoChallengeRounds('ABC123')).toEqual(getShapeEchoChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getShapeEchoChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('gives different codes different shapes', () => {
    expect(getShapeEchoChallengeRounds('aaaaaa')).not.toEqual(getShapeEchoChallengeRounds('bbbbbb'));
  });

  it('keeps every seeded target within its difficulty\'s shape pool and in-range geometry', () => {
    for (let i = 0; i < 100; i++) {
      for (const round of getShapeEchoChallengeRounds(`fuzz-${i}`)) {
        const { type, cx, cy, width, ratio, rotation } = round.target;
        expect(SHAPE_DIFFICULTY[round.difficulty].shapePool).toContain(type);
        expect(cx).toBeGreaterThanOrEqual(POSITION_MARGIN);
        expect(cx).toBeLessThanOrEqual(1 - POSITION_MARGIN);
        expect(cy).toBeGreaterThanOrEqual(POSITION_MARGIN);
        expect(cy).toBeLessThanOrEqual(1 - POSITION_MARGIN);
        expect(width).toBeGreaterThanOrEqual(TARGET_WIDTH_MIN);
        expect(width).toBeLessThanOrEqual(TARGET_WIDTH_MAX);
        expect(ratio).toBeGreaterThanOrEqual(RATIO_MIN);
        expect(ratio).toBeLessThanOrEqual(RATIO_MAX);
        expect(rotation).toBeGreaterThanOrEqual(0);
        expect(rotation).toBeLessThanOrEqual(180);
        if (round.difficulty === 'easy') expect(rotation).toBe(0);
      }
    }
  });
});
