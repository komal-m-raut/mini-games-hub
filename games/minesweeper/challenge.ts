import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { MINESWEEPER_DIFFICULTY } from './constants';
import { Board, adjacentCounts, createBoard, placeMines, reveal } from './engine';

const GAME_ID = 'minesweeper';

/** Bounded regeneration attempts if a mine placement happens to leave no
 *  zero-adjacency cell to open from — astronomically rare at these
 *  densities, but a bound keeps this provably terminating either way. */
const MAX_ZERO_CELL_ATTEMPTS = 20;

export interface MinesweeperChallengeRound {
  difficulty: Difficulty;
  width: number;
  height: number;
  mineCount: number;
  /** Fixed mine field — identical for every player on this code, so there
   *  is no first-click exclusion zone here (unlike solo). */
  mines: boolean[];
  counts: number[];
  /** The flood-filled zero region pre-revealed at board start, so every
   *  player opens the round on an identical, already-partly-revealed
   *  board. All `false` in the (bounded-retries-exhausted) fallback case
   *  where no zero cell exists — the round then simply opens fully hidden. */
  preRevealed: boolean[];
}

/**
 * Scans cell indices in a seeded shuffle order and returns the first *safe*
 * one with an adjacent-mine count of 0, or `null` if the board has none.
 * `mines` must be checked alongside `counts`: `adjacentCounts` leaves a
 * mine cell's own entry at its default 0 (it's never read as an adjacency
 * count elsewhere), which would otherwise be indistinguishable from a
 * genuine zero-adjacency safe cell here. The shuffle (rather than a plain
 * left-to-right scan) keeps the chosen opening cell from always landing
 * near index 0 — still fully deterministic for a given `rand` stream.
 */
export function pickZeroCell(
  counts: number[],
  mines: boolean[],
  rand: () => number
): number | null {
  const order = counts.map((_, i) => i);
  for (let i = 0; i < order.length; i++) {
    const j = i + Math.floor(rand() * (order.length - i));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const idx of order) {
    if (counts[idx] === 0 && !mines[idx]) return idx;
  }
  return null;
}

/**
 * Same 3 boards (easy → medium → hard) for a code on every device. One RNG
 * stream feeds mine placement, the opening-cell scan, and any regeneration
 * across all three rounds in order, so every player's boards — mines *and*
 * pre-revealed opening region — are pixel-identical for a given code.
 */
export function getMinesweeperChallengeRounds(code: string): MinesweeperChallengeRound[] {
  const rand = makeChallengeRand(code, GAME_ID);

  return CHALLENGE_DIFFICULTIES.map((difficulty) => {
    const cfg = MINESWEEPER_DIFFICULTY[difficulty];
    let mines: boolean[] = [];
    let counts: number[] = [];
    let zeroIndex: number | null = null;

    for (let attempt = 0; attempt < MAX_ZERO_CELL_ATTEMPTS; attempt++) {
      mines = placeMines(cfg.width, cfg.height, cfg.mineCount, rand);
      counts = adjacentCounts(mines, cfg.width, cfg.height);
      zeroIndex = pickZeroCell(counts, mines, rand);
      if (zeroIndex !== null) break;
    }

    let preRevealed = new Array<boolean>(cfg.width * cfg.height).fill(false);
    if (zeroIndex !== null) {
      const board: Board = createBoard(cfg.width, cfg.height, cfg.mineCount, mines, counts);
      preRevealed = reveal(board, zeroIndex).board.revealed;
    }

    return {
      difficulty,
      width: cfg.width,
      height: cfg.height,
      mineCount: cfg.mineCount,
      mines,
      counts,
      preRevealed,
    };
  });
}
