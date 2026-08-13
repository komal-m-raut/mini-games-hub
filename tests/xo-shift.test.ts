import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import {
  ADJACENCY,
  BOARD_SIZE,
  BoardState,
  CellValue,
  LINES,
  MAX_PLIES,
  Move,
  applyMove,
  createInitialBoard,
  isDraw,
  isGameOver,
  legalMoves,
  winner,
} from '@/games/xo-shift/engine';
import { botMove } from '@/games/xo-shift/bot';
import { calculateRoundScore } from '@/games/xo-shift/constants';
import { getXOChallengeRounds } from '@/games/xo-shift/challenge';

/** Deterministic 0–1 sequence, so bot/generation tests don't depend on
 *  Math.random (same LCG pattern used by tests/math-sprint.test.ts). */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

function place(state: BoardState, cell: number): BoardState {
  return applyMove(state, { type: 'place', to: cell });
}

function movesEqual(a: Move, b: Move): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'place' && b.type === 'place') return a.to === b.to;
  if (a.type === 'move' && b.type === 'move') return a.from === b.from && a.to === b.to;
  return false;
}

// ── Engine: adjacency ────────────────────────────────────────────────

describe('engine — adjacency (8-neighbourhood)', () => {
  it('corners (0, 2, 6, 8) have exactly 3 neighbours', () => {
    for (const corner of [0, 2, 6, 8]) {
      expect(ADJACENCY[corner]).toHaveLength(3);
    }
  });

  it('edges (1, 3, 5, 7) have exactly 5 neighbours', () => {
    for (const edge of [1, 3, 5, 7]) {
      expect(ADJACENCY[edge]).toHaveLength(5);
    }
  });

  it('the centre (4) has exactly 8 neighbours', () => {
    expect(ADJACENCY[4]).toHaveLength(8);
  });

  it('is symmetric: if j is a neighbour of i, i is a neighbour of j', () => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      for (const j of ADJACENCY[i]) {
        expect(ADJACENCY[j]).toContain(i);
      }
    }
  });

  it('never lists a cell as its own neighbour', () => {
    for (let i = 0; i < BOARD_SIZE; i++) {
      expect(ADJACENCY[i]).not.toContain(i);
    }
  });
});

// ── Engine: placement phase ─────────────────────────────────────────

describe('engine — placement phase', () => {
  it('detects a 3-in-line win immediately, before all 6 pieces are down', () => {
    let s = createInitialBoard('X');
    s = place(s, 0); // X
    expect(winner(s)).toBeNull();
    s = place(s, 3); // O
    s = place(s, 1); // X
    s = place(s, 4); // O
    expect(winner(s)).toBeNull();
    s = place(s, 2); // X completes the top row (0,1,2)
    expect(winner(s)).toBe('X');
    expect(s.phase).toBe('placement'); // O never got its 3rd piece down
    expect(s.placedCount).toEqual({ X: 3, O: 2 });
  });

  it('winner() finds a win on every one of the 8 lines', () => {
    for (const line of LINES) {
      const cells: CellValue[] = Array(BOARD_SIZE).fill(null);
      for (const i of line) cells[i] = 'X';
      const s: BoardState = {
        cells,
        turn: 'O',
        phase: 'movement',
        placedCount: { X: 3, O: 0 },
        ply: 3,
        blockedReturn: {},
      };
      expect(winner(s)).toBe('X');
    }
  });

  it('transitions to movement only once both players have placed all 3', () => {
    let s = createInitialBoard('X');
    for (const cell of [0, 3, 1, 4, 6, 7]) s = place(s, cell); // no line completes
    expect(winner(s)).toBeNull();
    expect(s.phase).toBe('movement');
    expect(s.placedCount).toEqual({ X: 3, O: 3 });
  });

  it('legal moves in placement are exactly the empty cells', () => {
    let s = createInitialBoard('X');
    s = place(s, 0);
    s = place(s, 4);
    const moves = legalMoves(s);
    expect(moves).toHaveLength(7);
    expect(moves.every((m) => m.type === 'place')).toBe(true);
    expect(new Set(moves.map((m) => (m as { to: number }).to))).toEqual(new Set([1, 2, 3, 5, 6, 7, 8]));
  });

  it('offers no legal moves once the game is already won', () => {
    let s = createInitialBoard('X');
    for (const cell of [0, 3, 1, 4]) s = place(s, cell);
    s = place(s, 2); // X wins
    expect(legalMoves(s)).toEqual([]);
  });
});

// ── Engine: movement phase & the per-piece no-backtrack rule ────────

describe('engine — movement phase & no-backtrack rule', () => {
  const emptyCells = (): CellValue[] => Array(BOARD_SIZE).fill(null);

  it('never offers a move onto an occupied cell', () => {
    const cells = emptyCells();
    cells[4] = 'X';
    cells[1] = 'O';
    cells[3] = 'O';
    const s: BoardState = {
      cells,
      turn: 'X',
      phase: 'movement',
      placedCount: { X: 3, O: 3 },
      ply: 10,
      blockedReturn: {},
    };
    const moves = legalMoves(s);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.type !== 'move' || cells[m.to] === null)).toBe(true);
  });

  it('a piece cannot immediately slide back to the cell it just left', () => {
    const cells = emptyCells();
    cells[4] = 'X';
    // This piece just arrived at 4 from 0.
    const s: BoardState = {
      cells,
      turn: 'X',
      phase: 'movement',
      placedCount: { X: 3, O: 3 },
      ply: 10,
      blockedReturn: { 4: 0 },
    };
    const moves = legalMoves(s);
    expect(moves.some((m) => m.type === 'move' && m.from === 4 && m.to === 0)).toBe(false);
    // Every other empty neighbour of the centre stays reachable.
    for (const to of [1, 2, 3, 5, 6, 7, 8]) {
      expect(moves).toContainEqual({ type: 'move', from: 4, to });
    }
  });

  it('the lock lifts the moment that piece moves again, even to a third cell', () => {
    const cells = emptyCells();
    cells[4] = 'X';
    const s: BoardState = {
      cells,
      turn: 'X',
      phase: 'movement',
      placedCount: { X: 3, O: 3 },
      ply: 10,
      blockedReturn: { 4: 0 },
    };
    const moved = applyMove(s, { type: 'move', from: 4, to: 1 });
    expect(moved.blockedReturn[4]).toBeUndefined();
    expect(moved.blockedReturn[1]).toBe(4);

    const nextMoves = legalMoves({ ...moved, turn: 'X' });
    // The original lock target (0) is no longer forbidden for this piece.
    expect(nextMoves.some((m) => m.type === 'move' && m.from === 1 && m.to === 0)).toBe(true);
    // Its newest departure point (4) is what's locked now.
    expect(nextMoves.some((m) => m.type === 'move' && m.from === 1 && m.to === 4)).toBe(false);
  });

  it("moving a different piece leaves another piece's lock untouched", () => {
    const cells = emptyCells();
    cells[4] = 'X'; // locked: can't return to 0
    cells[8] = 'X'; // free piece
    const s: BoardState = {
      cells,
      turn: 'X',
      phase: 'movement',
      placedCount: { X: 3, O: 3 },
      ply: 10,
      blockedReturn: { 4: 0 },
    };
    const moved = applyMove(s, { type: 'move', from: 8, to: 5 });
    expect(moved.blockedReturn[4]).toBe(0); // untouched
    expect(moved.blockedReturn[8]).toBeUndefined();
    expect(moved.blockedReturn[5]).toBe(8);
    // The still-locked piece at 4 is still barred from 0, and only from 0.
    const moves = legalMoves({ ...moved, turn: 'X' });
    expect(moves.some((m) => m.type === 'move' && m.from === 4 && m.to === 0)).toBe(false);
    expect(moves.some((m) => m.type === 'move' && m.from === 4 && m.to === 1)).toBe(true);
  });
});

// ── Engine: draws ────────────────────────────────────────────────────

describe('engine — draw', () => {
  it('is a draw once the ply cap is hit with no winner', () => {
    const s: BoardState = {
      cells: Array(BOARD_SIZE).fill(null),
      turn: 'X',
      phase: 'movement',
      placedCount: { X: 3, O: 3 },
      ply: MAX_PLIES,
      blockedReturn: {},
    };
    expect(winner(s)).toBeNull();
    expect(isDraw(s)).toBe(true);
    expect(isGameOver(s)).toBe(true);
  });

  it('is not a draw before the ply cap while moves remain', () => {
    const cells = Array<CellValue>(BOARD_SIZE).fill(null);
    cells[4] = 'X';
    cells[0] = 'O';
    const s: BoardState = {
      cells,
      turn: 'X',
      phase: 'movement',
      placedCount: { X: 3, O: 3 },
      ply: MAX_PLIES - 1,
      blockedReturn: {},
    };
    expect(isDraw(s)).toBe(false);
    expect(isGameOver(s)).toBe(false);
  });

  it('a won board is never a draw, even past the ply cap', () => {
    let s = createInitialBoard('X');
    for (const cell of [0, 3, 1, 4]) s = place(s, cell);
    s = place(s, 2); // X wins
    expect(winner(s)).toBe('X');
    expect(isDraw({ ...s, ply: MAX_PLIES })).toBe(false);
  });
});

// ── Bots: legality & termination ────────────────────────────────────

function playSelfPlayGame(difficulty: Difficulty, rand: () => number): { plies: number; outcome: 'win' | 'draw' } {
  let s = createInitialBoard(rand() < 0.5 ? 'X' : 'O');
  for (let guard = 0; guard <= MAX_PLIES + 1; guard++) {
    const w = winner(s);
    if (w) return { plies: s.ply, outcome: 'win' };
    if (isDraw(s)) return { plies: s.ply, outcome: 'draw' };

    const legal = legalMoves(s);
    const move = botMove(s, difficulty, rand);
    if (!legal.some((m) => movesEqual(m, move))) {
      throw new Error(`${difficulty} bot produced an illegal move: ${JSON.stringify(move)}`);
    }
    s = applyMove(s, move);
  }
  throw new Error('game did not terminate within the ply cap');
}

describe('bot — legality & termination', () => {
  const DIFFICULTIES: { name: Difficulty; seed: number }[] = [
    { name: 'easy', seed: 101 },
    { name: 'medium', seed: 202 },
    { name: 'hard', seed: 303 },
  ];

  for (const { name, seed } of DIFFICULTIES) {
    it(`${name}: 200 seeded self-play games never produce an illegal move and always terminate`, () => {
      const rand = seededRand(seed);
      for (let i = 0; i < 200; i++) {
        const result = playSelfPlayGame(name, rand);
        expect(['win', 'draw']).toContain(result.outcome);
        expect(result.plies).toBeLessThanOrEqual(MAX_PLIES);
      }
    });
  }
});

// ── Bot: win/block override (medium and hard both apply it) ─────────

describe('bot — takes an immediate win over anything else', () => {
  // O has two of column 0 (0,3,6) down; placing at 0 wins instantly and is
  // the only line one placement away from completing for O.
  const placementWin: BoardState = {
    cells: [null, 'X', null, 'O', 'X', null, 'O', null, null],
    turn: 'O',
    phase: 'placement',
    placedCount: { X: 2, O: 2 },
    ply: 4,
    blockedReturn: {},
  };

  // O has 1, 2 down (needs 0 for row (0,1,2)) plus a free piece at 4, which
  // is adjacent to 0 and can slide in without disturbing 1 or 2.
  const movementWin: BoardState = {
    cells: (() => {
      const cells: CellValue[] = Array(BOARD_SIZE).fill(null);
      cells[1] = 'O';
      cells[2] = 'O';
      cells[4] = 'O';
      return cells;
    })(),
    turn: 'O',
    phase: 'movement',
    placedCount: { X: 3, O: 3 },
    ply: 12,
    blockedReturn: {},
  };

  it.each<Difficulty>(['medium', 'hard'])('%s: placement phase win', (difficulty) => {
    expect(botMove(placementWin, difficulty, seededRand(1))).toEqual({ type: 'place', to: 0 });
  });

  it.each<Difficulty>(['medium', 'hard'])('%s: movement phase win (slides into the winning cell)', (difficulty) => {
    expect(botMove(movementWin, difficulty, seededRand(2))).toEqual({ type: 'move', from: 4, to: 0 });
  });
});

describe('bot — blocks the opponent’s immediate win when it has none of its own', () => {
  // X has two of column 0 (0,3,6) down; O has no win of its own available.
  const placementBlock: BoardState = {
    cells: ['X', null, null, 'X', 'O', null, null, null, 'O'],
    turn: 'O',
    phase: 'placement',
    placedCount: { X: 2, O: 2 },
    ply: 4,
    blockedReturn: {},
  };

  // X threatens row (0,1,2): 0 and 1 are X, and its free piece at 4 can
  // slide into 2 without disturbing 0 or 1. O's only piece able to reach 2
  // (the only free neighbour of 2, since 1 and 4 are X) is at 5.
  const movementBlock: BoardState = {
    cells: (() => {
      const cells: CellValue[] = Array(BOARD_SIZE).fill(null);
      cells[0] = 'X';
      cells[1] = 'X';
      cells[4] = 'X';
      cells[5] = 'O';
      cells[8] = 'O';
      return cells;
    })(),
    turn: 'O',
    phase: 'movement',
    placedCount: { X: 3, O: 3 },
    ply: 12,
    blockedReturn: {},
  };

  it.each<Difficulty>(['medium', 'hard'])('%s: placement phase block', (difficulty) => {
    expect(botMove(placementBlock, difficulty, seededRand(3))).toEqual({ type: 'place', to: 6 });
  });

  it.each<Difficulty>(['medium', 'hard'])('%s: movement phase block', (difficulty) => {
    expect(botMove(movementBlock, difficulty, seededRand(4))).toEqual({ type: 'move', from: 5, to: 2 });
  });
});

// ── Bot: determinism under a seed ────────────────────────────────────

describe('bot — determinism', () => {
  it('the same seed picks the same move from the same state', () => {
    const s = createInitialBoard('X');
    const a = botMove(s, 'hard', seededRand(7));
    const b = botMove(s, 'hard', seededRand(7));
    expect(a).toEqual(b);
  });

  it('a full seeded game replays to the exact same sequence of moves', () => {
    const play = (seed: number): Move[] => {
      const rand = seededRand(seed);
      let s = createInitialBoard('X');
      const moves: Move[] = [];
      while (!winner(s) && !isDraw(s)) {
        const move = botMove(s, 'hard', rand);
        moves.push(move);
        s = applyMove(s, move);
      }
      return moves;
    };
    expect(play(2024)).toEqual(play(2024));
  });

  it('different seeds can pick different moves from an open board', () => {
    const s = createInitialBoard('X');
    // Widely-spaced seeds — consecutive small seeds are highly correlated
    // after a single LCG step, so this spreads them across the range.
    const picks = new Set(
      Array.from({ length: 10 }, (_, i) => JSON.stringify(botMove(s, 'easy', seededRand((i + 1) * 104729))))
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});

// ── Scoring ──────────────────────────────────────────────────────────

describe('calculateRoundScore', () => {
  it('3 wins, 0 draws → 10', () => {
    expect(calculateRoundScore(3, 0)).toBe(10);
  });

  it('1 win, 2 draws → 6.67', () => {
    expect(calculateRoundScore(1, 2)).toBe(6.67);
  });

  it('0 wins, 0 draws (3 losses) → 0', () => {
    expect(calculateRoundScore(0, 0)).toBe(0);
  });

  it('1 win, 1 draw, 1 loss → 5', () => {
    expect(calculateRoundScore(1, 1)).toBe(5);
  });

  it('2 wins, 0 draws → 6.67', () => {
    expect(calculateRoundScore(2, 0)).toBe(6.67);
  });

  it('clamps out-of-range inputs to [0, 10]', () => {
    expect(calculateRoundScore(5, 5)).toBe(10);
    expect(calculateRoundScore(-2, 0)).toBe(0);
  });

  it('always rounds to 2 decimal places', () => {
    expect(calculateRoundScore(1, 2)).toBe(Math.round(calculateRoundScore(1, 2) * 100) / 100);
  });
});

// ── Challenge seeding ────────────────────────────────────────────────

describe('getXOChallengeRounds', () => {
  it('covers easy, medium, hard in order, 3 games each', () => {
    const rounds = getXOChallengeRounds('test01');
    expect(rounds.map((r) => r.difficulty)).toEqual(['easy', 'medium', 'hard']);
    for (const round of rounds) {
      expect(round.games).toHaveLength(3);
      for (const game of round.games) {
        expect(['X', 'O']).toContain(game.starter);
        const v = game.botRand();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('is deterministic for the same code', () => {
    const a = getXOChallengeRounds('abc123');
    const b = getXOChallengeRounds('abc123');
    expect(a.map((r) => r.games.map((g) => g.starter))).toEqual(b.map((r) => r.games.map((g) => g.starter)));
    // Each per-game bot RNG is independently seeded the same way too.
    const aFirst = a.map((r) => r.games.map((g) => g.botRand()));
    const bFirst = b.map((r) => r.games.map((g) => g.botRand()));
    expect(aFirst).toEqual(bFirst);
  });

  it('is case-insensitive, like every other game’s challenge seed', () => {
    const a = getXOChallengeRounds('ABC123');
    const b = getXOChallengeRounds('abc123');
    expect(a.map((r) => r.games.map((g) => g.starter))).toEqual(b.map((r) => r.games.map((g) => g.starter)));
  });

  it('differs across codes', () => {
    const a = getXOChallengeRounds('codeone');
    const b = getXOChallengeRounds('codetwo');
    const startersA = a.flatMap((r) => r.games.map((g) => g.starter));
    const startersB = b.flatMap((r) => r.games.map((g) => g.starter));
    expect(startersA).not.toEqual(startersB);
  });
});
