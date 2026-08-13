import { describe, expect, it } from 'vitest';
import { get2048ChallengeRounds, makeRoundRand } from '@/games/2048/challenge';
import { calculateSprintScore, getTileStyle } from '@/games/2048/constants';
import {
  BOARD_SIZE,
  CELL_COUNT,
  Direction,
  collapseRow,
  createEmptyBoard,
  emptyCells,
  hasWon,
  highestTile,
  isGameOver,
  moveBoard,
  spawnTile,
} from '@/games/2048/engine';

/** Deterministic RNG so a failing case is reproducible, same shape used by
 *  other games' tests (grid-flash, math-sprint). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── collapseRow ─────────────────────────────────────────────────────

describe('collapseRow', () => {
  it('merges every equal adjacent pair once: [2,2,2,2] -> [4,4,0,0]', () => {
    expect(collapseRow([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8 });
  });

  it('slides before merging, toward the edge: [4,2,2,0] -> [4,4,0,0]', () => {
    expect(collapseRow([4, 2, 2, 0])).toEqual({ row: [4, 4, 0, 0], gained: 4 });
  });

  it('merges the nearest pair first, leaving the odd tile out: [2,2,4,0] -> [4,4,0,0]', () => {
    expect(collapseRow([2, 2, 4, 0])).toEqual({ row: [4, 4, 0, 0], gained: 4 });
  });

  it('never double-merges a produced tile: [4,4,8,0] -> [8,8,0,0], not [16,0,0,0]', () => {
    expect(collapseRow([4, 4, 8, 0])).toEqual({ row: [8, 8, 0, 0], gained: 8 });
  });

  it('slides across gaps before merging: [2,0,2,0] -> [4,0,0,0]', () => {
    expect(collapseRow([2, 0, 2, 0])).toEqual({ row: [4, 0, 0, 0], gained: 4 });
  });

  it('leaves an empty row empty', () => {
    expect(collapseRow([0, 0, 0, 0])).toEqual({ row: [0, 0, 0, 0], gained: 0 });
  });

  it('leaves unequal tiles untouched, just slid', () => {
    expect(collapseRow([0, 2, 0, 4])).toEqual({ row: [2, 4, 0, 0], gained: 0 });
  });

  it('does not merge three-in-a-row into one double merge: [2,2,2,0] -> [4,2,0,0]', () => {
    // The first two 2s merge into a 4; the third 2 is now adjacent to that
    // 4 (not another 2), so it just slides in behind it.
    expect(collapseRow([2, 2, 2, 0])).toEqual({ row: [4, 2, 0, 0], gained: 4 });
  });

  it('already-collapsed rows are a no-op', () => {
    expect(collapseRow([2, 4, 8, 16])).toEqual({ row: [2, 4, 8, 16], gained: 0 });
  });
});

// ── moveBoard ───────────────────────────────────────────────────────

describe('moveBoard', () => {
  it('collapses every row left for a left move', () => {
    // prettier-ignore
    const board = [
      2, 2, 0, 0,
      0, 4, 4, 0,
      2, 0, 2, 0,
      0, 0, 0, 0,
    ];
    const { board: next, gained, moved } = moveBoard(board, 'left');
    // prettier-ignore
    expect(next).toEqual([
      4, 0, 0, 0,
      8, 0, 0, 0,
      4, 0, 0, 0,
      0, 0, 0, 0,
    ]);
    expect(gained).toBe(16);
    expect(moved).toBe(true);
  });

  it('collapses every row right for a right move (mirrors left)', () => {
    // prettier-ignore
    const board = [
      2, 2, 0, 0,
      0, 4, 4, 0,
      2, 0, 2, 0,
      0, 0, 0, 0,
    ];
    const { board: next, gained } = moveBoard(board, 'right');
    // prettier-ignore
    expect(next).toEqual([
      0, 0, 0, 4,
      0, 0, 0, 8,
      0, 0, 0, 4,
      0, 0, 0, 0,
    ]);
    expect(gained).toBe(16);
  });

  // Columns (top-to-bottom): col0=[2,2,0,0], col1=[0,4,4,0], col2=[2,0,2,0],
  // col3=[0,0,0,0] — the same 4 lines as the 'left'/'right' row tests above,
  // just laid out vertically, so the expected merges (gained 4+8+4=16) match.
  const verticalBoard = [
    2, 0, 2, 0,
    2, 4, 0, 0,
    0, 4, 2, 0,
    0, 0, 0, 0,
  ];

  it('collapses every column up for an up move', () => {
    const { board: next, gained } = moveBoard(verticalBoard, 'up');
    // prettier-ignore
    expect(next).toEqual([
      4, 8, 4, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]);
    expect(gained).toBe(16);
  });

  it('collapses every column down for a down move (mirrors up)', () => {
    const { board: next, gained } = moveBoard(verticalBoard, 'down');
    // prettier-ignore
    expect(next).toEqual([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      4, 8, 4, 0,
    ]);
    expect(gained).toBe(16);
  });

  it('is symmetric across all 4 directions via rotation: transposing the board maps up <-> left and down <-> right', () => {
    // prettier-ignore
    const board = [
      2, 4, 8, 16,
      2, 0, 8, 0,
      0, 4, 0, 16,
      2, 4, 8, 0,
    ];
    const transpose = (b: number[]): number[] => {
      const t = createEmptyBoard();
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) t[c * 4 + r] = b[r * 4 + c];
      }
      return t;
    };
    const left = moveBoard(board, 'left');
    const upOfTranspose = moveBoard(transpose(board), 'up');
    expect(upOfTranspose.board).toEqual(transpose(left.board));
    expect(upOfTranspose.gained).toBe(left.gained);
    expect(upOfTranspose.moved).toBe(left.moved);
  });

  it('a move that changes nothing returns moved:false, gained:0, and an unchanged board', () => {
    // prettier-ignore
    const board = [
      2, 4, 8, 16,
      4, 8, 16, 2,
      8, 16, 2, 4,
      16, 2, 4, 8,
    ];
    const result = moveBoard(board, 'left');
    expect(result.moved).toBe(false);
    expect(result.gained).toBe(0);
    expect(result.board).toEqual(board);
  });

  it('a no-op move never spawns anything, because moveBoard never calls spawnTile itself', () => {
    // prettier-ignore
    const board = [
      2, 4, 8, 16,
      4, 8, 16, 2,
      8, 16, 2, 4,
      16, 2, 4, 8,
    ];
    const before = emptyCells(board);
    const { board: after, moved } = moveBoard(board, 'up');
    expect(moved).toBe(false);
    expect(emptyCells(after)).toEqual(before);
    expect(after).toEqual(board);
  });

  it('reports moved:true for a move that only slides, without any merge', () => {
    // prettier-ignore
    const board = [
      0, 0, 0, 2,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ];
    const result = moveBoard(board, 'left');
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(0);
    expect(result.board[0]).toBe(2);
  });

  it('every direction is consistent with collapseRow on the same line', () => {
    const row = [2, 2, 4, 4];
    const { row: expected } = collapseRow(row);
    // prettier-ignore
    const board = [
      row[0], 0, 0, 0,
      row[1], 0, 0, 0,
      row[2], 0, 0, 0,
      row[3], 0, 0, 0,
    ];
    const { board: next } = moveBoard(board, 'up');
    expect([next[0], next[4], next[8], next[12]]).toEqual(expected);
  });
});

// ── spawnTile ───────────────────────────────────────────────────────

describe('spawnTile', () => {
  it('only ever places a tile on a cell that was empty', () => {
    for (let seed = 0; seed < 30; seed++) {
      const rand = seeded(seed);
      // prettier-ignore
      const board = [
        2, 4, 0, 8,
        0, 16, 0, 0,
        32, 0, 64, 0,
        0, 0, 0, 128,
      ];
      const before = new Set(emptyCells(board));
      const after = spawnTile(board, rand);
      let changedIndex = -1;
      for (let i = 0; i < after.length; i++) {
        if (after[i] !== board[i]) changedIndex = i;
      }
      expect(changedIndex).toBeGreaterThanOrEqual(0);
      expect(before.has(changedIndex)).toBe(true);
    }
  });

  it('leaves the board untouched (a copy) when there is no empty cell', () => {
    const full = Array.from({ length: CELL_COUNT }, (_, i) => (i % 2 === 0 ? 2 : 4));
    const result = spawnTile(full, seeded(1));
    expect(result).toEqual(full);
    expect(result).not.toBe(full);
  });

  it('spawns 2 about 90% of the time and 4 about 10% of the time, over 1000 draws', () => {
    const rand = seeded(42);
    let twos = 0;
    let fours = 0;
    for (let i = 0; i < 1000; i++) {
      const board = createEmptyBoard();
      const after = spawnTile(board, rand);
      const value = after.find((v) => v !== 0)!;
      if (value === 2) twos++;
      else if (value === 4) fours++;
      else throw new Error(`unexpected spawn value ${value}`);
    }
    expect(twos + fours).toBe(1000);
    expect(twos).toBeGreaterThan(850); // 90% - 5%
    expect(twos).toBeLessThan(950); // 90% + 5%
    expect(fours).toBeGreaterThan(50); // 10% - 5%
    expect(fours).toBeLessThan(150); // 10% + 5%
  });

  it('is fully deterministic for a given seed', () => {
    const board = createEmptyBoard();
    const a = spawnTile(board, seeded(7));
    const b = spawnTile(board, seeded(7));
    expect(a).toEqual(b);
  });

  it('differs across seeds (overwhelmingly likely for a 16-cell board)', () => {
    const board = createEmptyBoard();
    const results = new Set<string>();
    for (let seed = 0; seed < 8; seed++) {
      results.add(JSON.stringify(spawnTile(board, seeded(seed))));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

// ── isGameOver ──────────────────────────────────────────────────────

describe('isGameOver', () => {
  it('is false whenever any cell is still empty', () => {
    const board = createEmptyBoard();
    board[0] = 2;
    expect(isGameOver(board)).toBe(false);
  });

  it('is true for a full board with no adjacent equal pairs at all', () => {
    // prettier-ignore
    const board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    expect(isGameOver(board)).toBe(true);
  });

  it('is false for a full board that still has a horizontal merge available', () => {
    // prettier-ignore
    const board = [
      2, 2, 4, 8,
      4, 8, 2, 4,
      2, 4, 8, 2,
      4, 2, 4, 8,
    ];
    expect(isGameOver(board)).toBe(false);
  });

  it('is false for a full board that still has a vertical merge available', () => {
    // prettier-ignore
    const board = [
      2, 4, 8, 16,
      2, 8, 4, 2,
      4, 2, 8, 4,
      8, 4, 2, 8,
    ];
    // column 0 has 2,2 adjacent at rows 0-1
    expect(isGameOver(board)).toBe(false);
  });
});

// ── hasWon ──────────────────────────────────────────────────────────

describe('hasWon', () => {
  it('is false below 2048', () => {
    const board = createEmptyBoard();
    board[0] = 1024;
    expect(hasWon(board)).toBe(false);
  });

  it('is true once a tile reaches exactly 2048', () => {
    const board = createEmptyBoard();
    board[5] = 2048;
    expect(hasWon(board)).toBe(true);
  });

  it('stays true past 2048', () => {
    const board = createEmptyBoard();
    board[5] = 4096;
    expect(hasWon(board)).toBe(true);
  });
});

// ── highestTile ─────────────────────────────────────────────────────

describe('highestTile', () => {
  it('finds the max value on the board, 0 for an empty board', () => {
    expect(highestTile(createEmptyBoard())).toBe(0);
    const board = createEmptyBoard();
    board[3] = 8;
    board[9] = 64;
    expect(highestTile(board)).toBe(64);
  });
});

// ── calculateSprintScore ────────────────────────────────────────────

describe('calculateSprintScore', () => {
  it('scores 0 for 0 points', () => {
    expect(calculateSprintScore(0)).toBe(0);
  });

  it('scores a perfect 10 at exactly 2500 points', () => {
    expect(calculateSprintScore(2500)).toBe(10);
  });

  it('clamps above 2500 points to 10', () => {
    expect(calculateSprintScore(9001)).toBe(10);
  });

  it('never goes negative', () => {
    expect(calculateSprintScore(-100)).toBe(0);
  });

  it('rounds to 2 decimal places for a non-clean fraction', () => {
    // 1000 / 250 = 4 exactly, so use a value off a clean boundary
    expect(calculateSprintScore(333)).toBe(1.33);
  });

  it('scales linearly with points below the cap', () => {
    expect(calculateSprintScore(1250)).toBe(5);
    expect(calculateSprintScore(625)).toBe(2.5);
  });
});

// ── getTileStyle ────────────────────────────────────────────────────

describe('getTileStyle', () => {
  it('has an entry for every one of the 11 powers of two from 2 to 2048', () => {
    const values = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];
    for (const v of values) {
      const style = getTileStyle(v);
      expect(style.background).toBeTruthy();
      expect(style.color).toBeTruthy();
    }
  });

  it('keeps returning a valid style past 2048', () => {
    const style = getTileStyle(4096);
    expect(style.background).toBeTruthy();
    expect(style.color).toBeTruthy();
  });
});

// ── Challenge seeding ───────────────────────────────────────────────

describe('makeRoundRand / get2048ChallengeRounds', () => {
  function drawN(rand: () => number, n: number): number[] {
    return Array.from({ length: n }, () => rand());
  }

  it('is deterministic for the same code', () => {
    const a = drawN(makeRoundRand('abc123', 0), 20);
    const b = drawN(makeRoundRand('abc123', 0), 20);
    expect(a).toEqual(b);
  });

  it('is case-insensitive', () => {
    const a = drawN(makeRoundRand('ABC123', 0), 20);
    const b = drawN(makeRoundRand('abc123', 0), 20);
    expect(a).toEqual(b);
  });

  it('differs across codes', () => {
    const a = drawN(makeRoundRand('aaaaaa', 0), 20);
    const b = drawN(makeRoundRand('bbbbbb', 0), 20);
    expect(a).not.toEqual(b);
  });

  it('differs across rounds for the same code (independent per-round streams)', () => {
    const r0 = drawN(makeRoundRand('same-code', 0), 20);
    const r1 = drawN(makeRoundRand('same-code', 1), 20);
    const r2 = drawN(makeRoundRand('same-code', 2), 20);
    expect(r0).not.toEqual(r1);
    expect(r1).not.toEqual(r2);
    expect(r0).not.toEqual(r2);
  });

  it('produces 3 rounds, each independently reproducible from the same code', () => {
    const a = get2048ChallengeRounds('friend-code');
    const b = get2048ChallengeRounds('friend-code');
    expect(a).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      expect(drawN(a[i].rand, 15)).toEqual(drawN(b[i].rand, 15));
    }
  });

  it('using the seeded stream to actually spawn tiles is reproducible board-for-board', () => {
    const rounds = get2048ChallengeRounds('deterministic-play');
    const randA = rounds[0].rand;
    const randB = get2048ChallengeRounds('deterministic-play')[0].rand;

    let boardA = createEmptyBoard();
    let boardB = createEmptyBoard();
    const moves: Direction[] = ['left', 'up', 'left', 'up', 'left'];
    for (const dir of moves) {
      boardA = spawnTile(moveBoard(boardA, dir).board, randA);
      boardB = spawnTile(moveBoard(boardB, dir).board, randB);
    }
    expect(boardA).toEqual(boardB);
  });
});
