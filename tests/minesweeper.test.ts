import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { getMinesweeperChallengeRounds, pickZeroCell } from '@/games/minesweeper/challenge';
import { MINESWEEPER_DIFFICULTY, PAR_SECONDS, scoreBoard } from '@/games/minesweeper/constants';
import {
  Board,
  adjacentCounts,
  chord,
  createBoard,
  isWon,
  neighborsOf,
  placeMines,
  reveal,
  safeRevealedCount,
  safeTotal,
  toggleFlag,
} from '@/games/minesweeper/engine';

/** Deterministic RNG so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

// ── placeMines ──────────────────────────────────────────────────────

describe('placeMines', () => {
  it('places exactly `mineCount` mines', () => {
    for (const [w, h, count] of [
      [9, 9, 10],
      [12, 12, 26],
      [12, 16, 45],
    ] as const) {
      const mines = placeMines(w, h, count, seeded(1));
      expect(mines.filter(Boolean)).toHaveLength(count);
      expect(mines).toHaveLength(w * h);
    }
  });

  it('honours the exclusion zone — the excluded cell and its neighbours are never mines', () => {
    for (let seed = 0; seed < 30; seed++) {
      const width = 9;
      const height = 9;
      const excludeIndex = 40; // (4,4) — a fully interior cell, 8 neighbours
      const mines = placeMines(width, height, 10, seeded(seed), excludeIndex);
      expect(mines[excludeIndex]).toBe(false);
      for (const n of neighborsOf(excludeIndex, width, height)) {
        expect(mines[n]).toBe(false);
      }
    }
  });

  it('honours an exclusion zone at a corner (fewer than 8 neighbours)', () => {
    const mines = placeMines(9, 9, 10, seeded(3), 0);
    expect(mines[0]).toBe(false);
    for (const n of neighborsOf(0, 9, 9)) expect(mines[n]).toBe(false);
  });

  it('is deterministic for a given rand stream', () => {
    expect(placeMines(12, 12, 26, seeded(7))).toEqual(placeMines(12, 12, 26, seeded(7)));
    expect(placeMines(9, 9, 10, seeded(5), 20)).toEqual(placeMines(9, 9, 10, seeded(5), 20));
  });

  it('differs across seeds', () => {
    expect(placeMines(12, 12, 26, seeded(1))).not.toEqual(placeMines(12, 12, 26, seeded(2)));
  });

  it('is roughly uniform over the board across many draws', () => {
    const width = 4;
    const height = 4;
    const mineCount = 4;
    const total = width * height;
    const draws = 500;
    const frequency = new Array<number>(total).fill(0);

    for (let seed = 0; seed < draws; seed++) {
      const mines = placeMines(width, height, mineCount, seeded(seed * 97 + 13));
      for (let i = 0; i < total; i++) if (mines[i]) frequency[i]++;
    }

    // Expected mean per cell = draws * (mineCount/total) = 125; a generous
    // band around it catches a systematically biased shuffle without being
    // flaky over legitimate sampling variance.
    const expected = draws * (mineCount / total);
    for (const f of frequency) {
      expect(f).toBeGreaterThan(expected * 0.5);
      expect(f).toBeLessThan(expected * 1.5);
    }
  });

  it('clamps mine count to the number of eligible cells', () => {
    const mines = placeMines(3, 3, 99, seeded(1));
    expect(mines.filter(Boolean)).toHaveLength(9);
  });
});

// ── adjacentCounts ──────────────────────────────────────────────────

describe('adjacentCounts', () => {
  it('matches a hand-built 3×3 fixture with two mines (corners)', () => {
    // 0 1 2
    // 3 4 5
    // 6 7 8
    const mines = [true, false, false, false, false, false, false, false, true];
    const counts = adjacentCounts(mines, 3, 3);
    expect(counts).toEqual([0, 1, 0, 1, 2, 1, 0, 1, 0]);
  });

  it('matches a hand-built 3×3 fixture with a single mine at the top-left', () => {
    const mines = [true, false, false, false, false, false, false, false, false];
    const counts = adjacentCounts(mines, 3, 3);
    expect(counts).toEqual([0, 1, 0, 1, 1, 0, 0, 0, 0]);
  });

  it('is all zero on a board with no mines', () => {
    const mines = new Array(16).fill(false);
    expect(adjacentCounts(mines, 4, 4)).toEqual(new Array(16).fill(0));
  });
});

// ── reveal (flood fill) ─────────────────────────────────────────────

describe('reveal', () => {
  it('opens a connected zero region transitively', () => {
    // Single mine at index 0 of a 3×3 board — see the adjacentCounts fixture.
    const mines = [true, false, false, false, false, false, false, false, false];
    const counts = adjacentCounts(mines, 3, 3);
    const board = createBoard(3, 3, 1, mines, counts);
    const result = reveal(board, 8); // a zero cell, opposite corner from the mine

    expect(result.outcome).toBe('win'); // every non-mine cell reachable from here
    for (let i = 1; i < 9; i++) expect(result.board.revealed[i]).toBe(true);
    expect(result.board.revealed[0]).toBe(false); // the mine itself stays hidden
  });

  it('stops the flood at numbered cells instead of crossing them', () => {
    // 5-in-a-row, mine in the middle: 0 1 [2] 3 4
    const mines = [false, false, true, false, false];
    const counts = adjacentCounts(mines, 5, 1);
    const board = createBoard(5, 1, 1, mines, counts);

    const result = reveal(board, 0);
    expect(result.outcome).toBe('ok');
    expect(result.board.revealed).toEqual([true, true, false, false, false]);
  });

  it('reveals a mine as an immediate loss and reveals every mine on the board', () => {
    const mines = [true, false, false, false, false, false, false, false, true];
    const counts = adjacentCounts(mines, 3, 3);
    const board = createBoard(3, 3, 2, mines, counts);

    const result = reveal(board, 0);
    expect(result.outcome).toBe('loss');
    expect(result.triggeredIndex).toBe(0);
    expect(result.board.revealed[0]).toBe(true);
    expect(result.board.revealed[8]).toBe(true); // the other mine is revealed too
  });

  it('is a no-op on an already-revealed or flagged cell', () => {
    const mines = new Array(9).fill(false);
    const counts = adjacentCounts(mines, 3, 3);
    let board = createBoard(3, 3, 0, mines, counts);
    board = reveal(board, 4).board;
    const revealedBefore = board.revealed.slice();
    const again = reveal(board, 4);
    expect(again.board.revealed).toEqual(revealedBefore);

    const flaggedBoard = toggleFlag(createBoard(3, 3, 0, mines, counts), 0);
    const onFlagged = reveal(flaggedBoard, 0);
    expect(onFlagged.board.revealed[0]).toBe(false);
  });

  it('floods an entirely mine-free board iteratively without a stack overflow', () => {
    // A long 1D board is the worst case for a recursive flood fill — this
    // would blow the call stack well before 20,000 cells if reveal() ever
    // recursed instead of using an explicit queue.
    const width = 20000;
    const mines = new Array(width).fill(false);
    const counts = adjacentCounts(mines, width, 1);
    const board = createBoard(width, 1, 0, mines, counts);

    expect(() => {
      const result = reveal(board, 0);
      expect(result.outcome).toBe('win');
      expect(result.board.revealed.every(Boolean)).toBe(true);
    }).not.toThrow();
  });
});

// ── toggleFlag ──────────────────────────────────────────────────────

describe('toggleFlag', () => {
  it('flags and unflags a hidden cell', () => {
    const mines = new Array(9).fill(false);
    const counts = adjacentCounts(mines, 3, 3);
    let board = createBoard(3, 3, 0, mines, counts);
    board = toggleFlag(board, 2);
    expect(board.flagged[2]).toBe(true);
    board = toggleFlag(board, 2);
    expect(board.flagged[2]).toBe(false);
  });

  it('is a no-op on a revealed cell', () => {
    const mines = new Array(9).fill(false);
    const counts = adjacentCounts(mines, 3, 3);
    let board = createBoard(3, 3, 0, mines, counts);
    board = reveal(board, 4).board;
    board = toggleFlag(board, 4);
    expect(board.flagged[4]).toBe(false);
  });
});

// ── chord ───────────────────────────────────────────────────────────

function boardWithRevealed(base: Board, indices: number[]): Board {
  const revealed = base.revealed.slice();
  for (const i of indices) revealed[i] = true;
  return { ...base, revealed };
}

describe('chord', () => {
  // Single mine at index 0 of a 3×3 board — counts: [0,1,0,1,1,0,0,0,0].
  const mines = [true, false, false, false, false, false, false, false, false];
  const counts = adjacentCounts(mines, 3, 3);

  it('reveals the remaining neighbours when the flags are correct', () => {
    let board = createBoard(3, 3, 1, mines, counts);
    board = boardWithRevealed(board, [1]); // count 1, neighbours {0,2,3,4,5}
    board = toggleFlag(board, 0); // the real mine, correctly flagged

    const result = chord(board, 1);
    expect(result.outcome).not.toBe('loss');
    // Cell 2 is a zero cell, so revealing it floods the rest of the safe board.
    for (let i = 1; i < 9; i++) expect(result.board.revealed[i]).toBe(true);
  });

  it('loses the round when a wrong flag lets chording open a real mine', () => {
    let board = createBoard(3, 3, 1, mines, counts);
    board = boardWithRevealed(board, [1]); // count 1, neighbours {0,2,3,4,5}
    board = toggleFlag(board, 2); // wrong — 2 is not a mine, 0 is

    const result = chord(board, 1);
    expect(result.outcome).toBe('loss');
    expect(result.triggeredIndex).toBe(0);
  });

  it('is a no-op when the flagged-neighbour count does not match', () => {
    let board = createBoard(3, 3, 1, mines, counts);
    board = boardWithRevealed(board, [1]); // count 1, no flags yet
    const result = chord(board, 1);
    expect(result.outcome).toBe('ok');
    expect(result.board.revealed).toEqual(board.revealed);
  });

  it('is a no-op on a hidden cell', () => {
    const board = createBoard(3, 3, 1, mines, counts);
    const result = chord(board, 1);
    expect(result.board).toBe(board);
  });
});

// ── isWon / safeTotal / safeRevealedCount ──────────────────────────

describe('isWon', () => {
  it('is false until every non-mine cell is revealed, then true', () => {
    const mines = [true, false, false, false, false, false, false, false, true];
    const counts = adjacentCounts(mines, 3, 3);
    let board = createBoard(3, 3, 2, mines, counts);
    expect(isWon(board)).toBe(false);

    for (let i = 0; i < 9; i++) {
      if (!mines[i]) board = reveal(board, i).board;
    }
    expect(isWon(board)).toBe(true);
  });
});

describe('safeTotal / safeRevealedCount', () => {
  it('counts non-mine cells and how many are revealed', () => {
    const mines = [true, false, false, false, false, false, false, false, true];
    const counts = adjacentCounts(mines, 3, 3);
    let board = createBoard(3, 3, 2, mines, counts);
    expect(safeTotal(board)).toBe(7);
    expect(safeRevealedCount(board)).toBe(0);

    board = reveal(board, 1).board;
    expect(safeRevealedCount(board)).toBeGreaterThan(0);
    expect(safeRevealedCount(board)).toBeLessThanOrEqual(7);
  });
});

// ── scoreBoard ──────────────────────────────────────────────────────

describe('scoreBoard', () => {
  it('scores a win at exactly par as a perfect 10', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const par = PAR_SECONDS[difficulty];
      expect(scoreBoard(true, par, 1, 1, difficulty)).toBe(10);
    }
  });

  it('caps the time bonus at 10 for a win faster than par', () => {
    expect(scoreBoard(true, PAR_SECONDS.easy / 2, 1, 1, 'easy')).toBe(10);
  });

  it('keeps a slower win above the 6-point floor, trending toward it', () => {
    const par = PAR_SECONDS.easy;
    const at2x = scoreBoard(true, par * 2, 1, 1, 'easy');
    const at10x = scoreBoard(true, par * 10, 1, 1, 'easy');
    expect(at2x).toBeCloseTo(8, 2); // 6 + 4 * (par / (2*par)) = 6 + 2 = 8
    expect(at2x).toBeGreaterThan(6);
    expect(at2x).toBeLessThan(10);
    expect(at10x).toBeGreaterThan(6);
    expect(at10x).toBeLessThan(at2x);
  });

  it('never drops a win below the 6-point floor, even for a very slow clear', () => {
    expect(scoreBoard(true, 1_000_000, 1, 1, 'hard')).toBeCloseTo(6, 2);
  });

  it('scores a loss as partial credit — half the safe cells found is 2.5', () => {
    expect(scoreBoard(false, 30, 5, 10, 'easy')).toBe(2.5);
  });

  it('scores a loss with nothing revealed as 0', () => {
    expect(scoreBoard(false, 5, 0, 81, 'easy')).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const score = scoreBoard(true, 77, 1, 1, 'easy'); // par 60/77 is not a round number
    expect(score).toBe(Math.round(score * 100) / 100);
  });
});

// ── Challenge boards ────────────────────────────────────────────────

describe('getMinesweeperChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    const a = getMinesweeperChallengeRounds('abc123');
    const b = getMinesweeperChallengeRounds('abc123');
    const upper = getMinesweeperChallengeRounds('ABC123');
    expect(a).toEqual(b);
    expect(a).toEqual(upper);
  });

  it('produces identical mine fields and pre-revealed regions for the same code', () => {
    const rounds1 = getMinesweeperChallengeRounds('sharedcode');
    const rounds2 = getMinesweeperChallengeRounds('sharedcode');
    rounds1.forEach((round, i) => {
      expect(round.mines).toEqual(rounds2[i].mines);
      expect(round.preRevealed).toEqual(rounds2[i].preRevealed);
    });
  });

  it('follows the easy → medium → hard sequence', () => {
    const rounds = getMinesweeperChallengeRounds('sequence');
    expect(rounds.map((r) => r.difficulty)).toEqual(['easy', 'medium', 'hard']);
  });

  it('matches each round to its difficulty config (size + mine count)', () => {
    const rounds = getMinesweeperChallengeRounds('sizes');
    for (const round of rounds) {
      const cfg = MINESWEEPER_DIFFICULTY[round.difficulty];
      expect(round.width).toBe(cfg.width);
      expect(round.height).toBe(cfg.height);
      expect(round.mineCount).toBe(cfg.mineCount);
      expect(round.mines.filter(Boolean)).toHaveLength(cfg.mineCount);
    }
  });

  it('differs across codes', () => {
    const a = getMinesweeperChallengeRounds('codeone');
    const b = getMinesweeperChallengeRounds('codetwo');
    expect(a.map((r) => r.mines)).not.toEqual(b.map((r) => r.mines));
  });

  it('never pre-reveals a mine cell', () => {
    const rounds = getMinesweeperChallengeRounds('safety-check');
    for (const round of rounds) {
      round.preRevealed.forEach((isRevealed, i) => {
        if (isRevealed) expect(round.mines[i]).toBe(false);
      });
    }
  });

  it('pre-reveals a non-empty region for real difficulty densities', () => {
    const rounds = getMinesweeperChallengeRounds('nonempty');
    for (const round of rounds) {
      expect(round.preRevealed.some(Boolean)).toBe(true);
    }
  });
});

describe('pickZeroCell', () => {
  it('returns null when the board has no zero-adjacency cell (bounded, no infinite loop)', () => {
    const counts = [1, 2, 3, 1, 2, 3, 1, 2, 3];
    const mines = new Array(9).fill(false);
    expect(pickZeroCell(counts, mines, seeded(1))).toBeNull();
  });

  it('finds a zero cell when one exists, deterministically for a seed', () => {
    const counts = [1, 0, 1, 1, 1, 0, 1, 1, 1];
    const mines = new Array(9).fill(false);
    const a = pickZeroCell(counts, mines, seeded(9));
    const b = pickZeroCell(counts, mines, seeded(9));
    expect(a).toBe(b);
    expect(a).not.toBeNull();
    expect(counts[a as number]).toBe(0);
  });

  it('never returns a mine cell, even though its default count entry is 0', () => {
    // counts[0] is a leftover default (mine cells are skipped, not computed)
    // and must not be mistaken for a genuine zero-adjacency safe cell.
    const counts = [0, 1, 1];
    const mines = [true, false, false];
    for (let seed = 0; seed < 20; seed++) {
      const result = pickZeroCell(counts, mines, seeded(seed));
      expect(result).toBeNull();
    }
  });
});
