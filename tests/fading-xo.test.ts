import { describe, expect, it } from 'vitest';
import { round2 } from '@/utils/scoring';
import { botMove } from '@/games/fading-xo/bot';
import { GAMES_PER_ROUND, score10 } from '@/games/fading-xo/constants';
import {
  FadingXoMove,
  FadingXoState,
  MAX_ACTIONS,
  Player,
  applyMove,
  createInitialState,
  getOldest,
  isMovementPhase,
  legalMoves,
} from '@/games/fading-xo/engine';
import { Difficulty } from '@/types/game';

/** Deterministic 0–1 sequence, so bot tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

function movesEqual(a: FadingXoMove, b: FadingXoMove): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'place' && b.type === 'place') return a.cell === b.cell;
  if (a.type === 'move' && b.type === 'move') return a.from === b.from && a.to === b.to;
  return false;
}

/** Whether `player` has an immediate winning move available right now,
 *  regardless of whose actual turn it is — used the same way the bot itself
 *  reasons about threats, kept independent here so the tests don't just
 *  re-assert the implementation against itself. */
function hasImmediateWin(state: FadingXoState, player: Player): boolean {
  const hypothetical = state.turn === player ? state : { ...state, turn: player };
  return legalMoves(hypothetical).some((m) => applyMove(hypothetical, m).winner === player);
}

// ── Engine: FIFO queues through placement AND movement ──────────────────

describe('engine — FIFO oldest tracking', () => {
  it('placement fills queues in play order, oldest first', () => {
    let state = createInitialState('X');
    state = applyMove(state, { type: 'place', cell: 0 }); // X
    state = applyMove(state, { type: 'place', cell: 2 }); // O
    state = applyMove(state, { type: 'place', cell: 1 }); // X
    state = applyMove(state, { type: 'place', cell: 5 }); // O
    state = applyMove(state, { type: 'place', cell: 3 }); // X
    state = applyMove(state, { type: 'place', cell: 6 }); // O

    expect(state.winner).toBeNull();
    expect(state.actionCount).toBe(6);
    expect(state.queues.X).toEqual([0, 1, 3]);
    expect(state.queues.O).toEqual([2, 5, 6]);
    expect(getOldest(state, 'X')).toBe(0);
    expect(getOldest(state, 'O')).toBe(2);
    expect(isMovementPhase(state, 'X')).toBe(true);
    expect(isMovementPhase(state, 'O')).toBe(true);
  });

  it('a movement shifts the oldest out and pushes the moved piece on as newest', () => {
    let state = createInitialState('X');
    for (const cell of [0, 2, 1, 5, 3, 6]) {
      state = applyMove(state, { type: 'place', cell });
    }
    // X's turn, forced to move its oldest (0) to any empty cell (4, 7 or 8).
    state = applyMove(state, { type: 'move', from: 0, to: 4 });

    expect(state.board[0]).toBeNull();
    expect(state.board[4]).toBe('X');
    expect(state.queues.X).toEqual([1, 3, 4]);
    // 4 is the freshly-moved piece — it must be newest, not oldest.
    expect(getOldest(state, 'X')).toBe(1);

    // O's turn now, forced to move ITS oldest (2).
    state = applyMove(state, { type: 'move', from: 2, to: 7 });
    expect(state.board[2]).toBeNull();
    expect(state.board[7]).toBe('O');
    expect(state.queues.O).toEqual([5, 6, 7]);
    expect(getOldest(state, 'O')).toBe(5);
  });
});

describe('engine — forced-move legality', () => {
  it('legalMoves offers every empty cell during placement', () => {
    const state = createInitialState('X');
    const moves = legalMoves(state);
    expect(moves).toHaveLength(9);
    expect(moves.every((m) => m.type === 'place')).toBe(true);
  });

  it('legalMoves offers ONLY the oldest piece as `from` once movement begins', () => {
    let state = createInitialState('X');
    for (const cell of [0, 2, 1, 5, 3, 6]) {
      state = applyMove(state, { type: 'place', cell });
    }
    const moves = legalMoves(state);
    // Empty cells are 4, 7, 8.
    expect(moves).toHaveLength(3);
    for (const move of moves) {
      expect(move.type).toBe('move');
      if (move.type === 'move') {
        expect(move.from).toBe(0); // X's oldest — no other piece is ever offered
        expect([4, 7, 8]).toContain(move.to);
      }
    }
  });
});

describe('engine — winning', () => {
  it('three in a row during placement wins immediately, before the board fills', () => {
    let state = createInitialState('X');
    for (const cell of [0, 3, 1, 4, 2]) {
      state = applyMove(state, { type: 'place', cell });
    }
    // X placed 0, 1, 2 — a completed row — on its 3rd placement.
    expect(state.winner).toBe('X');
    expect(state.actionCount).toBe(5);
  });

  it('moving the forced oldest piece into the third cell of a line wins', () => {
    let state = createInitialState('X');
    // X: 8 (oldest), 0, 1 — two of line [0,1,2], cell 2 still empty.
    // O: 3, 4, 6 — no line.
    for (const cell of [8, 3, 0, 4, 1, 6]) {
      state = applyMove(state, { type: 'place', cell });
    }
    expect(state.winner).toBeNull();
    expect(getOldest(state, 'X')).toBe(8);

    state = applyMove(state, { type: 'move', from: 8, to: 2 });
    expect(state.board.slice(0, 3)).toEqual(['X', 'X', 'X']);
    expect(state.winner).toBe('X');
    expect(state.actionCount).toBe(7);
  });

  it("a departure can't win for the mover, but re-checks the board so the opponent's very next move into that cell does", () => {
    let state = createInitialState('X');
    // X: 2 (oldest, blocking line [0,1,2]), 5, 7 — no line of its own.
    // O: 8 (oldest), 0, 1 — two of line [0,1,2], blocked only by X at 2.
    for (const cell of [2, 8, 5, 0, 7, 1]) {
      state = applyMove(state, { type: 'place', cell });
    }
    expect(state.winner).toBeNull();
    expect(getOldest(state, 'X')).toBe(2);
    expect(getOldest(state, 'O')).toBe(8);

    // X is forced to move its oldest off cell 2 — this can't be a win for X
    // (2 wasn't part of any X line), and it must NOT be mistaken for one.
    state = applyMove(state, { type: 'move', from: 2, to: 3 });
    expect(state.winner).toBeNull();
    expect(state.board[2]).toBeNull();

    // O's departure opens exactly what O needed: moving its oldest (8) into
    // the now-empty cell 2 completes [0, 1, 2] for O.
    state = applyMove(state, { type: 'move', from: 8, to: 2 });
    expect(state.winner).toBe('O');
    expect(state.actionCount).toBe(8);
  });

  it('60 actions with no line completed is a draw, not a stall', () => {
    // Hand-built state one action short of the cap: X = {0,1,3} (no line),
    // O = {2,5,6} (no line), 4/7/8 empty — the same safe layout the FIFO
    // test above reaches after 6 real placements, just fast-forwarded to
    // action 59 instead of rebuilding it move by move.
    const state: FadingXoState = {
      board: ['X', 'X', 'O', 'X', null, 'O', 'O', null, null],
      queues: { X: [0, 1, 3], O: [2, 5, 6] },
      turn: 'X',
      actionCount: MAX_ACTIONS - 1,
      winner: null,
    };
    expect(legalMoves(state).every((m) => m.type === 'move')).toBe(true);

    // {1,3,4} is not a winning line, so this move can't end the game early
    // on its own merits — only the action cap should decide the outcome.
    const next = applyMove(state, { type: 'move', from: 0, to: 4 });
    expect(next.actionCount).toBe(MAX_ACTIONS);
    expect(next.winner).toBe('draw');
  });
});

// ── Bot: legality and termination ────────────────────────────────────────

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const GAMES_PER_DIFFICULTY = 200;
/** Generous safety valve — MAX_ACTIONS already guarantees termination by
 *  60, this just turns a hang into a fast, readable test failure. */
const ITERATION_SAFETY_CAP = 100;

describe('bot — legality and termination', () => {
  for (const difficulty of DIFFICULTIES) {
    it(`${difficulty}: never plays an illegal move and every game terminates (${GAMES_PER_DIFFICULTY} seeded games)`, () => {
      for (let g = 0; g < GAMES_PER_DIFFICULTY; g++) {
        const rand = seededRand(difficulty.length * 1000 + g + 1);
        let state = createInitialState(g % 2 === 0 ? 'X' : 'O');
        let iterations = 0;

        while (!state.winner) {
          iterations++;
          expect(iterations).toBeLessThan(ITERATION_SAFETY_CAP);

          const legal = legalMoves(state);
          expect(legal.length).toBeGreaterThan(0);

          const move = botMove(state, difficulty, rand);
          expect(legal.some((m) => movesEqual(m, move))).toBe(true);

          state = applyMove(state, move);
        }

        expect(['X', 'O', 'draw']).toContain(state.winner);
        expect(state.actionCount).toBeLessThanOrEqual(MAX_ACTIONS);
      }
    });
  }
});

// ── Bot: hard takes wins and blocks losses ───────────────────────────────

/**
 * Builds a position where O — already on its own forced-movement turn — must
 * block a LIVE threat from X.
 *
 * With only 3 marks a side, a "2 stationary marks + empty 3rd cell" threat
 * only survives if the two stationary marks are BOTH newer than the current
 * oldest (otherwise the older of the pair is itself about to be forced away,
 * self-destructing the threat before it can be cashed in). So X's threat
 * here isn't set up by placement alone — X's own first forced move (its
 * oldest, from cell 8, teleporting to cell 4) is what creates it: cells 3
 * and 4 become X's two newest, 2/3 of line [3,4,5], and X's new oldest
 * (cell 2) is free to complete it next turn by teleporting to cell 5. O,
 * with 3 marks already down, must use ITS forced move to occupy cell 5
 * first — a placement-shaped block is not an option here.
 */
function scriptedBlockPosition(): FadingXoState {
  let state = createInitialState('X');
  for (const cell of [8, 0, 2, 1, 3, 6]) {
    state = applyMove(state, { type: 'place', cell });
  }
  // X's turn (7th action): reposition its oldest (8) to 4 — not a win by
  // itself ({2,3,4} isn't a line), but it leaves {3,4} needing only cell 5.
  state = applyMove(state, { type: 'move', from: 8, to: 4 });
  return state;
}

describe('bot — hard difficulty tactics', () => {
  it('takes an immediate win over anything else', () => {
    let state = createInitialState('X');
    // X: 3, 4 — two of line [3,4,5], cell 5 empty. It's X's turn next.
    // O: 0, 1 — unrelated, no threat of its own.
    for (const cell of [3, 0, 4, 1]) {
      state = applyMove(state, { type: 'place', cell });
    }
    expect(state.turn).toBe('X');
    const move = botMove(state, 'hard', seededRand(11));
    expect(move).toEqual({ type: 'place', cell: 5 });
    expect(applyMove(state, move).winner).toBe('X');
  });

  it('blocks an immediate loss with a MOVEMENT move — the block requires teleporting into the threat cell, not just placing there, so it only works if the full post-move board (including the vacated cell) is what gets evaluated', () => {
    const state = scriptedBlockPosition();
    expect(state.turn).toBe('O');
    expect(getOldest(state, 'O')).toBe(0);
    expect(hasImmediateWin(state, 'X')).toBe(true);

    // O's oldest (0) can teleport to any of the empty cells (2, 5, 8) — only
    // landing on 5 removes X's threat.
    const move = botMove(state, 'hard', seededRand(22));
    expect(move).toEqual({ type: 'move', from: 0, to: 5 });

    const next = applyMove(state, move);
    expect(hasImmediateWin(next, 'X')).toBe(false);
  });

  it('is deterministic under a fixed seed', () => {
    let state = createInitialState('X');
    for (const cell of [0, 2, 1, 5, 3, 6]) {
      state = applyMove(state, { type: 'place', cell });
    }
    const moveA = botMove(state, 'hard', seededRand(77));
    const moveB = botMove(state, 'hard', seededRand(77));
    expect(moveA).toEqual(moveB);
  });
});

describe('bot — medium difficulty tactics', () => {
  it('takes an immediate win over anything else', () => {
    let state = createInitialState('X');
    for (const cell of [3, 0, 4, 1]) {
      state = applyMove(state, { type: 'place', cell });
    }
    const move = botMove(state, 'medium', seededRand(44));
    expect(move).toEqual({ type: 'place', cell: 5 });
  });

  it('blocks an immediate loss when a safe move exists, via a movement', () => {
    const state = scriptedBlockPosition();
    const move = botMove(state, 'medium', seededRand(55));
    expect(move).toEqual({ type: 'move', from: 0, to: 5 });
    expect(hasImmediateWin(applyMove(state, move), 'X')).toBe(false);
  });
});

describe('bot — easy difficulty', () => {
  it('only ever returns legal moves across many seeded draws', () => {
    let state = createInitialState('X');
    for (const cell of [0, 2, 1, 5, 3, 6]) {
      state = applyMove(state, { type: 'place', cell });
    }
    const legal = legalMoves(state);
    for (let i = 0; i < 100; i++) {
      const move = botMove(state, 'easy', seededRand(100 + i));
      expect(legal.some((m) => movesEqual(m, move))).toBe(true);
    }
  });
});

// ── Scorer ────────────────────────────────────────────────────────────

describe('score10', () => {
  it('a clean sweep scores a perfect 10', () => {
    expect(score10(3, 0)).toBe(10);
  });

  it('three draws average to exactly 5', () => {
    expect(score10(0, 3)).toBe(5);
  });

  it('three losses score 0', () => {
    expect(score10(0, 0)).toBe(0);
  });

  it('rounds to 2dp for a non-terminating fraction', () => {
    // (2*10 + 0*5) / 3 = 6.6666...
    expect(score10(2, 0)).toBe(round2(20 / 3));
    expect(score10(2, 0)).toBe(6.67);
  });

  it('a win + a draw + a loss rounds the same way', () => {
    // (1*10 + 1*5) / 3 = 5 exactly
    expect(score10(1, 1)).toBe(5);
  });

  it('clamps defensively even outside the normal 3-game range', () => {
    expect(score10(3, 1)).toBe(10);
    expect(score10(-1, 0)).toBe(0);
  });

  it('GAMES_PER_ROUND is the fixed best-of-3 every round score is averaged over', () => {
    expect(GAMES_PER_ROUND).toBe(3);
  });
});
