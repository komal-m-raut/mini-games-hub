import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { formatScore, round2 } from '@/utils/scoring';
import { getSnakeChallengeRounds } from '@/games/snake/challenge';
import { GAME_ID, SNAKE_DIFFICULTY, scoreRound, tickMs } from '@/games/snake/constants';
import {
  Direction,
  GRID_COLS,
  GRID_ROWS,
  Point,
  SnakeState,
  createInitialSnakeState,
  placeFood,
  step,
} from '@/games/snake/engine';

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

function makeState(overrides: Partial<SnakeState> = {}): SnakeState {
  return {
    snake: [
      { x: 5, y: 5 },
      { x: 4, y: 5 },
      { x: 3, y: 5 },
    ],
    direction: 'right',
    pendingGrowth: 0,
    foodPos: { x: 10, y: 10 },
    foodEaten: 0,
    alive: true,
    ...overrides,
  };
}

describe('step — basic movement', () => {
  it('moves the head one cell in the current direction and drops the tail when not growing', () => {
    const state = makeState();
    const next = step(state, null);
    expect(next.snake[0]).toEqual({ x: 6, y: 5 });
    expect(next.snake).toHaveLength(3);
    expect(next.snake).toEqual([
      { x: 6, y: 5 },
      { x: 5, y: 5 },
      { x: 4, y: 5 },
    ]);
    expect(next.alive).toBe(true);
  });

  it('applies a queued direction change and keeps moving from there', () => {
    const state = makeState();
    const next = step(state, 'down');
    expect(next.direction).toBe('down');
    expect(next.snake[0]).toEqual({ x: 5, y: 6 });
  });

  it('is a no-op on an already-dead state', () => {
    const dead = makeState({ alive: false });
    expect(step(dead, 'up')).toBe(dead);
  });
});

describe('step — same-direction and 180° reversal are ignored', () => {
  it('ignores a queued direction identical to the current heading', () => {
    const state = makeState({ direction: 'right' });
    const next = step(state, 'right');
    expect(next.direction).toBe('right');
    expect(next.snake[0]).toEqual({ x: 6, y: 5 });
  });

  it('ignores a queued 180° reversal, continuing in the current direction', () => {
    const state = makeState({ direction: 'right' });
    const next = step(state, 'left');
    expect(next.direction).toBe('right');
    expect(next.snake[0]).toEqual({ x: 6, y: 5 }); // moved right, not left
  });

  it('allows a perpendicular turn from any heading', () => {
    for (const [dir, perp] of [
      ['up', 'left'],
      ['down', 'right'],
      ['left', 'down'],
      ['right', 'up'],
    ] as [Direction, Direction][]) {
      const state = makeState({ direction: dir });
      const next = step(state, perp);
      expect(next.direction).toBe(perp);
    }
  });
});

describe('step — queue processes one turn per tick', () => {
  it('applies a fast double-turn (e.g. right -> down -> left) as two sequential single-turn steps', () => {
    let state = makeState({ direction: 'right' });
    state = step(state, 'down');
    expect(state.direction).toBe('down');
    state = step(state, 'left');
    expect(state.direction).toBe('left');
  });
});

describe('step — growth is exact and delayed to the tick after eating', () => {
  it('does not grow, but queues growth, on the tick that eats food', () => {
    const state = makeState({
      snake: [
        { x: 2, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
      direction: 'right',
      foodPos: { x: 3, y: 0 },
      pendingGrowth: 0,
      foodEaten: 0,
    });
    const next = step(state, null);
    expect(next.foodEaten).toBe(1);
    expect(next.snake).toHaveLength(3); // unchanged length this tick
    expect(next.snake[0]).toEqual({ x: 3, y: 0 });
    expect(next.pendingGrowth).toBe(1); // growth owed to the next tick
  });

  it('grows by exactly one segment on the tick after eating, consuming the pending growth', () => {
    const afterEat = makeState({
      snake: [
        { x: 3, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 0 },
      ],
      direction: 'right',
      foodPos: { x: 99, y: 99 }, // relocated elsewhere, unreachable this tick
      pendingGrowth: 1,
      foodEaten: 1,
    });
    const next = step(afterEat, null);
    expect(next.snake).toHaveLength(4);
    expect(next.snake).toEqual([
      { x: 4, y: 0 },
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
    ]);
    expect(next.pendingGrowth).toBe(0);
    expect(next.foodEaten).toBe(1); // unchanged — no new food eaten this tick
  });

  it('eating two foods back-to-back (via injected pendingGrowth) grows over the following two ticks', () => {
    // Simulates food eaten twice in quick succession before growth caught up.
    let state = makeState({
      snake: [
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
      ],
      pendingGrowth: 2,
      foodPos: { x: 99, y: 99 },
    });
    const lengths: number[] = [state.snake.length];
    state = step(state, null);
    lengths.push(state.snake.length);
    state = step(state, null);
    lengths.push(state.snake.length);
    state = step(state, null);
    lengths.push(state.snake.length);
    expect(lengths).toEqual([3, 4, 5, 5]); // grows twice, then stops
    expect(state.pendingGrowth).toBe(0);
  });
});

describe('step — tail-vacate legality', () => {
  // A 4-segment snake curled so the tail sits directly adjacent to the
  // head: head (3,3) -> (3,2) -> (2,2) -> tail (2,3). Turning 'left' moves
  // the head onto the tail's cell.
  const curled: Point[] = [
    { x: 3, y: 3 },
    { x: 3, y: 2 },
    { x: 2, y: 2 },
    { x: 2, y: 3 },
  ];

  it('moving into the tail cell is legal when not growing', () => {
    const state = makeState({ snake: curled, direction: 'down', pendingGrowth: 0 });
    const next = step(state, 'left');
    expect(next.alive).toBe(true);
    expect(next.snake[0]).toEqual({ x: 2, y: 3 });
    expect(next.snake).toHaveLength(4);
  });

  it('moving into the tail cell is fatal when growing this tick', () => {
    const state = makeState({ snake: curled, direction: 'down', pendingGrowth: 1 });
    const next = step(state, 'left');
    expect(next.alive).toBe(false);
    expect(next.snake).toEqual(curled); // unchanged — never moved through
  });
});

describe('step — wall death', () => {
  it('dies without moving when the head would leave the grid to the right', () => {
    const state = makeState({
      snake: [
        { x: GRID_COLS - 1, y: 4 },
        { x: GRID_COLS - 2, y: 4 },
      ],
      direction: 'right',
    });
    const next = step(state, null);
    expect(next.alive).toBe(false);
    expect(next.snake).toEqual(state.snake);
  });

  it('dies at every one of the four grid edges', () => {
    const cases: { snake: Point[]; direction: Direction }[] = [
      { snake: [{ x: 0, y: 4 }, { x: 1, y: 4 }], direction: 'left' },
      { snake: [{ x: GRID_COLS - 1, y: 4 }, { x: GRID_COLS - 2, y: 4 }], direction: 'right' },
      { snake: [{ x: 4, y: 0 }, { x: 4, y: 1 }], direction: 'up' },
      { snake: [{ x: 4, y: GRID_ROWS - 1 }, { x: 4, y: GRID_ROWS - 2 }], direction: 'down' },
    ];
    for (const { snake, direction } of cases) {
      const state = makeState({ snake, direction });
      const next = step(state, null);
      expect(next.alive).toBe(false);
      expect(next.snake).toEqual(snake);
    }
  });
});

describe('step — self death', () => {
  it('dies when moving into a body segment that is not the tail', () => {
    // A U-shape where turning 'up' drives the head straight into the neck.
    const state = makeState({
      snake: [
        { x: 4, y: 5 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
        { x: 5, y: 5 },
        { x: 5, y: 6 },
      ],
      direction: 'left',
    });
    const next = step(state, 'up');
    expect(next.alive).toBe(false);
    expect(next.snake).toEqual(state.snake);
  });
});

describe('placeFood', () => {
  it('never places food on an occupied cell, across many snake shapes and seeds', () => {
    const rand = seededRand(42);
    for (let i = 0; i < 500; i++) {
      const len = 3 + Math.floor(rand() * 20);
      const snake: Point[] = [];
      let x = 2;
      const y = 2;
      for (let s = 0; s < len; s++) {
        snake.push({ x, y });
        x = (x + 1) % GRID_COLS;
      }
      const state = makeState({ snake, foodPos: { x: 0, y: 0 } });
      const food = placeFood(state, rand);
      expect(snake.some((p) => p.x === food.x && p.y === food.y)).toBe(false);
      expect(food.x).toBeGreaterThanOrEqual(0);
      expect(food.x).toBeLessThan(GRID_COLS);
      expect(food.y).toBeGreaterThanOrEqual(0);
      expect(food.y).toBeLessThan(GRID_ROWS);
    }
  });

  it('is deterministic for the same state and seed', () => {
    const state = makeState();
    expect(placeFood(state, seededRand(7))).toEqual(placeFood(state, seededRand(7)));
  });

  it('consumes exactly one rand() call regardless of how crowded the board is', () => {
    const counts: number[] = [];
    for (const len of [3, 10, 50, 150]) {
      const snake: Point[] = [];
      for (let i = 0; i < len; i++) snake.push({ x: i % GRID_COLS, y: Math.floor(i / GRID_COLS) });
      const state = makeState({ snake });
      let calls = 0;
      const countingRand = () => {
        calls++;
        return 0.42;
      };
      placeFood(state, countingRand);
      counts.push(calls);
    }
    expect(counts).toEqual([1, 1, 1, 1]);
  });
});

describe('createInitialSnakeState', () => {
  it('spawns a 3-segment snake heading right, centred, with food placed off its body', () => {
    const state = createInitialSnakeState(seededRand(1));
    expect(state.snake).toHaveLength(3);
    expect(state.direction).toBe('right');
    expect(state.alive).toBe(true);
    expect(state.foodEaten).toBe(0);
    expect(state.pendingGrowth).toBe(0);
    expect(state.snake.some((p) => p.x === state.foodPos.x && p.y === state.foodPos.y)).toBe(false);
  });
});

describe('tickMs — speed curve', () => {
  it('matches the exact documented start values', () => {
    expect(tickMs('easy', 0)).toBe(140);
    expect(tickMs('medium', 0)).toBe(120);
    expect(tickMs('hard', 0)).toBe(105);
  });

  it('decreases by the documented amount per food, before the floor', () => {
    expect(tickMs('easy', 1)).toBeCloseTo(140 - 1.5, 10);
    expect(tickMs('medium', 1)).toBeCloseTo(120 - 1.6, 10);
    expect(tickMs('hard', 1)).toBeCloseTo(105 - 1.6, 10);
  });

  it('is monotonically non-increasing as foodEaten rises', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      let previous = tickMs(difficulty, 0);
      for (let food = 1; food <= 200; food++) {
        const current = tickMs(difficulty, food);
        expect(current).toBeLessThanOrEqual(previous);
        previous = current;
      }
    }
  });

  it('never drops below each difficulty\'s documented floor, however much food is eaten', () => {
    expect(tickMs('easy', 1000)).toBe(95);
    expect(tickMs('medium', 1000)).toBe(80);
    expect(tickMs('hard', 1000)).toBe(65);
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      expect(tickMs(difficulty, 100000)).toBe(SNAKE_DIFFICULTY[difficulty].minTickMs);
    }
  });
});

describe('scoreRound — sprint scorer', () => {
  it('scores 0 food as 0', () => {
    expect(scoreRound(0)).toBe(0);
  });

  it('scores 25 food as a perfect 10 — the documented "25 food = perfect" threshold', () => {
    expect(scoreRound(25)).toBe(10);
  });

  it('clamps at 10 for anything above the perfect threshold', () => {
    expect(scoreRound(26)).toBe(10);
    expect(scoreRound(100)).toBe(10);
  });

  it('is always an exact 2dp value in [0, 10]', () => {
    const rand = seededRand(2026);
    for (let i = 0; i < 2000; i++) {
      const foodEaten = Math.floor(rand() * 60);
      const score = scoreRound(foodEaten);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
      expect(round2(score)).toBe(score);
      expect(formatScore(score)).toMatch(/^\d+(\.\d{1,2})?$/);
    }
  });

  it('increases monotonically with food eaten up to the cap', () => {
    let previous = scoreRound(0);
    for (let food = 1; food <= 25; food++) {
      const score = scoreRound(food);
      expect(score).toBeGreaterThanOrEqual(previous);
      previous = score;
    }
  });
});

describe('getSnakeChallengeRounds', () => {
  it('follows the easy -> medium -> hard sequence', () => {
    expect(getSnakeChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('is deterministic and case-insensitive for a code', () => {
    const a = getSnakeChallengeRounds('abc123');
    const b = getSnakeChallengeRounds('ABC123');
    for (let i = 0; i < a.length; i++) {
      const seqA = Array.from({ length: 5 }, () => a[i].rand());
      const seqB = Array.from({ length: 5 }, () => b[i].rand());
      expect(seqA).toEqual(seqB);
    }
  });

  it('gives different codes different food-driving sequences', () => {
    const a = getSnakeChallengeRounds('aaaaaa');
    const b = getSnakeChallengeRounds('bbbbbb');
    expect(a[0].rand()).not.toBe(b[0].rand());
  });

  it('keeps each round\'s stream independent — replaying round 1 differently never perturbs round 2', () => {
    const codeA = getSnakeChallengeRounds('independent-code');
    const codeB = getSnakeChallengeRounds('independent-code');
    // Consume a different number of round-1 values between the two copies...
    codeA[0].rand();
    codeA[0].rand();
    codeA[0].rand();
    codeB[0].rand();
    // ...round 2's sequence must still line up identically either way.
    const seqA = Array.from({ length: 5 }, () => codeA[1].rand());
    const seqB = Array.from({ length: 5 }, () => codeB[1].rand());
    expect(seqA).toEqual(seqB);
  });

  it('produces a food sequence identical across two plays given identical moves', () => {
    // Simulate "identical play": same starting state, same queued directions,
    // driven by two independently-derived rand streams for the same code.
    const roundsA = getSnakeChallengeRounds('replay-code');
    const roundsB = getSnakeChallengeRounds('replay-code');
    const directions: (Direction | null)[] = [null, 'down', null, null, 'left', null, null, null];

    function play(rand: () => number): Point[] {
      let state = createInitialSnakeState(rand);
      const foodTrail: Point[] = [state.foodPos];
      for (const dir of directions) {
        const prevFoodEaten = state.foodEaten;
        state = step(state, dir);
        if (!state.alive) break;
        if (state.foodEaten > prevFoodEaten) {
          state = { ...state, foodPos: placeFood(state, rand) };
          foodTrail.push(state.foodPos);
        }
      }
      return foodTrail;
    }

    expect(play(roundsA[0].rand)).toEqual(play(roundsB[0].rand));
  });
});

describe('GAME_ID and registry', () => {
  it('keeps the legacy engine addressable without publishing the clone', () => {
    expect(GAME_ID).toBe('snake');
    const entry = GAME_REGISTRY.find((g) => g.id === GAME_ID);
    expect(entry).toBeUndefined();
  });
});
