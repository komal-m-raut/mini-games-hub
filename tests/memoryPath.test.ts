import { describe, expect, it } from 'vitest';
import {
  Cell,
  cellKey,
  comparePaths,
  generatePath,
  isAdjacent,
} from '@/games/memory-path/pathGen';
import { PATH_DIFFICULTY, getPathRating } from '@/games/memory-path/constants';

/** Deterministic RNG so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('generatePath', () => {
  it('returns a path of the requested length', () => {
    expect(generatePath(5, 7, seeded(1))).toHaveLength(7);
  });

  it('never revisits a cell', () => {
    for (let seed = 0; seed < 50; seed++) {
      const path = generatePath(6, 9, seeded(seed));
      expect(new Set(path.map(cellKey)).size).toBe(path.length);
    }
  });

  it('only steps between orthogonally adjacent cells', () => {
    for (let seed = 0; seed < 50; seed++) {
      const path = generatePath(6, 9, seeded(seed));
      for (let i = 1; i < path.length; i++) {
        expect(isAdjacent(path[i - 1], path[i])).toBe(true);
      }
    }
  });

  it('keeps every cell inside the grid', () => {
    const size = 4;
    const path = generatePath(size, 5, seeded(9));
    for (const { r, c } of path) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(size);
      expect(c).toBeLessThan(size);
    }
  });

  it('caps the length at the number of cells in the grid', () => {
    expect(generatePath(2, 99, seeded(3))).toHaveLength(4);
  });

  it('produces a valid path for every difficulty preset', () => {
    for (const cfg of Object.values(PATH_DIFFICULTY)) {
      expect(generatePath(cfg.size, cfg.pathLength)).toHaveLength(cfg.pathLength);
    }
  });
});

describe('comparePaths', () => {
  const path: Cell[] = [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 1 },
    { r: 2, c: 1 },
  ];

  it('scores an exact trace as 100%', () => {
    const res = comparePaths(path, path);
    expect(res).toMatchObject({ correct: 4, mistakes: 0, accuracy: 100 });
    expect(res.marks).toEqual([true, true, true, true]);
  });

  it('marks the position where the trace diverges', () => {
    const traced = [path[0], path[1], { r: 1, c: 0 }, path[3]];
    const res = comparePaths(path, traced);
    expect(res.marks).toEqual([true, true, false, true]);
    expect(res.correct).toBe(3);
    expect(res.mistakes).toBe(1);
    expect(res.accuracy).toBe(75);
  });

  it('counts cells the player never reached as mistakes', () => {
    const res = comparePaths(path, [path[0], path[1]]);
    expect(res.correct).toBe(2);
    expect(res.mistakes).toBe(2); // two path cells missing
    expect(res.accuracy).toBe(50);
  });

  it('counts cells traced past the end of the path as mistakes', () => {
    const res = comparePaths(path, [...path, { r: 3, c: 1 }]);
    expect(res.correct).toBe(4);
    expect(res.mistakes).toBe(1);
    expect(res.accuracy).toBe(100);
    expect(res.marks[4]).toBe(false);
  });

  it('gives an empty trace 0%', () => {
    expect(comparePaths(path, [])).toMatchObject({ correct: 0, mistakes: 4, accuracy: 0 });
  });

  it('rounds accuracy to one decimal place', () => {
    const long = Array.from({ length: 3 }, (_, i) => ({ r: 0, c: i }));
    expect(comparePaths(long, [long[0]]).accuracy).toBe(33.3);
  });
});

describe('getPathRating', () => {
  it('needs a flawless trace for Perfect', () => {
    expect(getPathRating(100, 0)).toBe('Perfect');
    // Full recall but an extra cell traced past the end isn't Perfect
    expect(getPathRating(100, 1)).toBe('Great');
  });

  it('rates by how much of the path came back', () => {
    expect(getPathRating(80, 1)).toBe('Great');
    expect(getPathRating(79.9, 1)).toBe('Good');
    expect(getPathRating(60, 2)).toBe('Good');
    expect(getPathRating(59.9, 2)).toBe('Try Again');
    expect(getPathRating(0, 5)).toBe('Try Again');
  });
});
