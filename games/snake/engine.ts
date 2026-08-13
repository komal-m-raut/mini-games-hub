/**
 * Pure Snake engine — grid, movement, collision and food placement. No
 * React, no timers: `step()` advances exactly one tick and `placeFood()`
 * draws one food cell, both as functions of their inputs only, so every
 * tick and every seed replays identically (tests/snake.test.ts exercises
 * this directly, and the seeded challenge mode depends on it — see
 * challenge.ts).
 */

export const GRID_COLS = 17;
export const GRID_ROWS = 15;

export interface Point {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface SnakeState {
  /** Head first. */
  snake: Point[];
  direction: Direction;
  /** Segments still owed to the tail — incremented by one on eat, consumed
   *  one per tick by skipping the tail's retraction (see step()). Eating
   *  therefore lengthens the snake on the *next* tick, not the one it was
   *  eaten on — the tail still moves out of the way this tick as usual. */
  pendingGrowth: number;
  foodPos: Point;
  /** Running count of food eaten this run — also the solo/sprint score. */
  foodEaten: number;
  alive: boolean;
}

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Fresh 3-segment snake, centred, heading right, with one food cell placed
 *  via `rand` (Math.random for solo, a seeded stream for a challenge round
 *  — see challenge.ts). */
export function createInitialSnakeState(rand: () => number): SnakeState {
  const y = Math.floor(GRID_ROWS / 2);
  const headX = 5;
  const snake: Point[] = [
    { x: headX, y },
    { x: headX - 1, y },
    { x: headX - 2, y },
  ];
  const base: SnakeState = {
    snake,
    direction: 'right',
    pendingGrowth: 0,
    foodPos: { x: 0, y: 0 },
    foodEaten: 0,
    alive: true,
  };
  return { ...base, foodPos: placeFood(base, rand) };
}

/**
 * Advances the game by exactly one tick. `queuedDirection` is at most one
 * pending turn — the hook dequeues its own 2-deep input buffer one entry
 * per call to this function, so a fast double-turn resolves as two
 * consecutive `step()` calls rather than this function ever seeing more
 * than one direction at once. A 180° reversal or a repeat of the current
 * heading is ignored, exactly as if nothing had been queued.
 *
 * Collision uses the standard "tail vacates the same tick the head enters
 * it" rule: the cell the tail currently occupies is legal to move into
 * *unless* the snake is growing this tick (`pendingGrowth > 0`), in which
 * case the tail stays put and that cell is occupied like any other body
 * segment.
 *
 * A fatal move (wall or self) leaves `snake` untouched — the head never
 * visibly moves through the wall or through the body, only `alive` flips to
 * false. Calling `step` again on an already-dead state is a no-op.
 */
export function step(state: SnakeState, queuedDirection: Direction | null): SnakeState {
  if (!state.alive) return state;

  const direction =
    queuedDirection &&
    queuedDirection !== state.direction &&
    queuedDirection !== OPPOSITE[state.direction]
      ? queuedDirection
      : state.direction;

  const head = state.snake[0];
  const delta = DELTA[direction];
  const newHead: Point = { x: head.x + delta.x, y: head.y + delta.y };

  if (newHead.x < 0 || newHead.x >= GRID_COLS || newHead.y < 0 || newHead.y >= GRID_ROWS) {
    return { ...state, direction, alive: false };
  }

  const growingThisTick = state.pendingGrowth > 0;
  // Cells that remain occupied after this move: the whole body if growing
  // (nothing vacates this tick), otherwise everything but the tail (which
  // moves away the same tick the head arrives, so it's free to enter).
  const keptBody = growingThisTick ? state.snake : state.snake.slice(0, -1);

  if (keptBody.some((p) => samePoint(p, newHead))) {
    return { ...state, direction, alive: false };
  }

  const ateFood = samePoint(newHead, state.foodPos);

  return {
    ...state,
    snake: [newHead, ...keptBody],
    direction,
    pendingGrowth: (growingThisTick ? state.pendingGrowth - 1 : state.pendingGrowth) + (ateFood ? 1 : 0),
    foodEaten: state.foodEaten + (ateFood ? 1 : 0),
    alive: true,
  };
}

/**
 * Uniform-random free cell for the next food, deterministic under a seeded
 * `rand`: every free cell is enumerated once in a fixed row-major order and
 * `rand()` is called exactly once to index into that list — never rejection
 * sampling, so a seeded stream's call count never depends on how crowded
 * the board happens to be (which would desync a challenge round's food
 * sequence from how long the snake had grown by that point).
 */
export function placeFood(state: SnakeState, rand: () => number): Point {
  const occupied = new Set(state.snake.map((p) => `${p.x},${p.y}`));
  const free: Point[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  const idx = Math.floor(rand() * free.length);
  return free[Math.min(free.length - 1, Math.max(0, idx))] ?? { x: 0, y: 0 };
}
