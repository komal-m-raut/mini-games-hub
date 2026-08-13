import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { getGridFlashChallengeRounds } from '@/games/grid-flash/challenge';
import {
  GRID_FLASH_DIFFICULTY,
  START_LEVEL,
  calculateGridScore,
  generatePattern,
  maxLevelFor,
} from '@/games/grid-flash/constants';

/** Deterministic RNG so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('generatePattern', () => {
  it('returns exactly `count` cells', () => {
    expect(generatePattern(16, 5, seeded(1))).toHaveLength(5);
    expect(generatePattern(36, 20, seeded(2))).toHaveLength(20);
  });

  it('returns distinct indices, never repeating a cell', () => {
    for (let seed = 0; seed < 50; seed++) {
      const pattern = generatePattern(25, 12, seeded(seed));
      expect(new Set(pattern).size).toBe(pattern.length);
    }
  });

  it('keeps every index inside the grid', () => {
    const cells = 16;
    for (let seed = 0; seed < 50; seed++) {
      const pattern = generatePattern(cells, 10, seeded(seed));
      for (const index of pattern) {
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(cells);
      }
    }
  });

  it('is deterministic for a given rand stream', () => {
    expect(generatePattern(25, 8, seeded(7))).toEqual(generatePattern(25, 8, seeded(7)));
  });

  it('differs across seeds', () => {
    expect(generatePattern(36, 15, seeded(1))).not.toEqual(generatePattern(36, 15, seeded(2)));
  });

  it('clamps count to the number of cells available', () => {
    expect(generatePattern(4, 99, seeded(3))).toHaveLength(4);
  });

  it('produces a valid pattern for every difficulty preset at the starting level', () => {
    for (const cfg of Object.values(GRID_FLASH_DIFFICULTY)) {
      expect(generatePattern(cfg.cells, START_LEVEL, seeded(11))).toHaveLength(START_LEVEL);
    }
  });
});

describe('maxLevelFor', () => {
  it('caps one tile short of lighting the whole grid', () => {
    expect(maxLevelFor('easy')).toBe(GRID_FLASH_DIFFICULTY.easy.cells - 1);
    expect(maxLevelFor('medium')).toBe(GRID_FLASH_DIFFICULTY.medium.cells - 1);
    expect(maxLevelFor('hard')).toBe(GRID_FLASH_DIFFICULTY.hard.cells - 1);
  });
});

describe('GRID_FLASH_DIFFICULTY', () => {
  it('pins the grid sizes to the 4 / 5 / 6 trio', () => {
    // Regression guard: touch-target sizing depends on these exact sizes —
    // an accidental edit here should fail loudly.
    expect(GRID_FLASH_DIFFICULTY.easy.gridSize).toBe(4);
    expect(GRID_FLASH_DIFFICULTY.medium.gridSize).toBe(5);
    expect(GRID_FLASH_DIFFICULTY.hard.gridSize).toBe(6);
  });

  it('flashes Easy and Medium for 1200ms and Hard for 900ms', () => {
    expect(GRID_FLASH_DIFFICULTY.easy.flashMs).toBe(1200);
    expect(GRID_FLASH_DIFFICULTY.medium.flashMs).toBe(1200);
    expect(GRID_FLASH_DIFFICULTY.hard.flashMs).toBe(900);
  });

  it('raises par with difficulty', () => {
    expect(GRID_FLASH_DIFFICULTY.easy.par).toBe(7);
    expect(GRID_FLASH_DIFFICULTY.medium.par).toBe(8);
    expect(GRID_FLASH_DIFFICULTY.hard.par).toBe(9);
  });
});

describe('getGridFlashChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getGridFlashChallengeRounds('abc123')).toEqual(getGridFlashChallengeRounds('abc123'));
    expect(getGridFlashChallengeRounds('ABC123')).toEqual(getGridFlashChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getGridFlashChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('differentiates codes', () => {
    expect(getGridFlashChallengeRounds('aaaaaa')).not.toEqual(
      getGridFlashChallengeRounds('bbbbbb')
    );
  });

  it('produces the full ladder of levels for every round, each a valid pattern', () => {
    for (const round of getGridFlashChallengeRounds('any-code')) {
      const cfg = GRID_FLASH_DIFFICULTY[round.difficulty];
      const expectedLevels = maxLevelFor(round.difficulty) - START_LEVEL + 1;
      expect(round.levels).toHaveLength(expectedLevels);

      round.levels.forEach((pattern, i) => {
        const level = START_LEVEL + i;
        expect(pattern).toHaveLength(level);
        expect(new Set(pattern).size).toBe(pattern.length);
        for (const index of pattern) {
          expect(index).toBeGreaterThanOrEqual(0);
          expect(index).toBeLessThan(cfg.cells);
        }
      });
    }
  });

  it('gives every player the same pattern at the same (round, level), independent of how far anyone climbed', () => {
    // The whole ladder is precomputed up front rather than lazily as levels
    // are reached, so round 2's rand-stream position can never depend on
    // how far a specific player actually got through round 1.
    const a = getGridFlashChallengeRounds('same-code');
    const b = getGridFlashChallengeRounds('same-code');
    for (let round = 0; round < a.length; round++) {
      for (let level = 0; level < a[round].levels.length; level++) {
        expect(a[round].levels[level]).toEqual(b[round].levels[level]);
      }
    }
  });
});

describe('calculateGridScore', () => {
  it('scores 0 when the very first level (peak 2, i.e. nothing completed) is never cleared', () => {
    expect(calculateGridScore(2, 'easy')).toBe(0);
    expect(calculateGridScore(2, 'medium')).toBe(0);
    expect(calculateGridScore(2, 'hard')).toBe(0);
  });

  it('scores a full 10 at exactly par, for every difficulty', () => {
    expect(calculateGridScore(GRID_FLASH_DIFFICULTY.easy.par, 'easy')).toBe(10);
    expect(calculateGridScore(GRID_FLASH_DIFFICULTY.medium.par, 'medium')).toBe(10);
    expect(calculateGridScore(GRID_FLASH_DIFFICULTY.hard.par, 'hard')).toBe(10);
  });

  it('clamps at 10 for a peak above par', () => {
    expect(calculateGridScore(GRID_FLASH_DIFFICULTY.easy.par + 3, 'easy')).toBe(10);
    expect(calculateGridScore(GRID_FLASH_DIFFICULTY.hard.cells - 1, 'hard')).toBe(10);
  });

  it('never drops below 0 for a peak below 2', () => {
    expect(calculateGridScore(0, 'easy')).toBe(0);
    expect(calculateGridScore(1, 'medium')).toBe(0);
  });

  it('rounds to 2 decimal places for a peak that lands off a clean fraction', () => {
    // Medium: par 8 → (3 - 2) / (8 - 2) * 10 = 1.6666… → 1.67
    expect(calculateGridScore(3, 'medium')).toBe(1.67);
    // Hard: par 9 → (5 - 2) / (9 - 2) * 10 = 4.2857… → 4.29
    expect(calculateGridScore(5, 'hard')).toBe(4.29);
  });

  it('increases monotonically with peak', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const max = maxLevelFor(difficulty);
      let prev = calculateGridScore(2, difficulty);
      for (let peak = 3; peak <= max; peak++) {
        const score = calculateGridScore(peak, difficulty);
        expect(score).toBeGreaterThanOrEqual(prev);
        prev = score;
      }
    }
  });
});
