import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { getPairChaseChallengeRounds } from '@/games/pair-chase/challenge';
import {
  PAIR_CHASE_DIFFICULTY,
  PAIR_CHASE_EMOJI,
  makeLayout,
  scoreRound,
} from '@/games/pair-chase/constants';

/** Deterministic RNG so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('makeLayout', () => {
  it('produces a board of exactly 2 * pairs cards for every difficulty', () => {
    expect(makeLayout('easy', seeded(1))).toHaveLength(2 * PAIR_CHASE_DIFFICULTY.easy.pairs);
    expect(makeLayout('medium', seeded(1))).toHaveLength(2 * PAIR_CHASE_DIFFICULTY.medium.pairs);
    expect(makeLayout('hard', seeded(1))).toHaveLength(2 * PAIR_CHASE_DIFFICULTY.hard.pairs);
  });

  it('matches the 4×3 / 4×4 / 5×4 board sizes', () => {
    expect(PAIR_CHASE_DIFFICULTY.easy.cols * PAIR_CHASE_DIFFICULTY.easy.rows).toBe(12);
    expect(PAIR_CHASE_DIFFICULTY.medium.cols * PAIR_CHASE_DIFFICULTY.medium.rows).toBe(16);
    expect(PAIR_CHASE_DIFFICULTY.hard.cols * PAIR_CHASE_DIFFICULTY.hard.rows).toBe(20);
    expect(PAIR_CHASE_DIFFICULTY.easy.pairs).toBe(6);
    expect(PAIR_CHASE_DIFFICULTY.medium.pairs).toBe(8);
    expect(PAIR_CHASE_DIFFICULTY.hard.pairs).toBe(10);
  });

  it('has every emoji appear exactly twice', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      for (let seed = 0; seed < 20; seed++) {
        const board = makeLayout(difficulty, seeded(seed));
        const counts = new Map<string, number>();
        for (const emoji of board) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
        for (const count of counts.values()) expect(count).toBe(2);
        expect(counts.size).toBe(PAIR_CHASE_DIFFICULTY[difficulty].pairs);
      }
    }
  });

  it('only draws faces from the fixed emoji set', () => {
    const board = makeLayout('hard', seeded(3));
    for (const emoji of board) expect(PAIR_CHASE_EMOJI).toContain(emoji);
  });

  it('is deterministic for a given rand stream', () => {
    expect(makeLayout('medium', seeded(7))).toEqual(makeLayout('medium', seeded(7)));
  });

  it('differs across seeds', () => {
    expect(makeLayout('hard', seeded(1))).not.toEqual(makeLayout('hard', seeded(2)));
  });

  it('has at least 24 distinct emoji available — enough headroom for Hard\'s 10 pairs', () => {
    expect(PAIR_CHASE_EMOJI.length).toBeGreaterThanOrEqual(24);
    expect(new Set(PAIR_CHASE_EMOJI).size).toBe(PAIR_CHASE_EMOJI.length);
  });
});

describe('getPairChaseChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getPairChaseChallengeRounds('abc123')).toEqual(getPairChaseChallengeRounds('abc123'));
    expect(getPairChaseChallengeRounds('ABC123')).toEqual(getPairChaseChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getPairChaseChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('differentiates codes', () => {
    expect(getPairChaseChallengeRounds('aaaaaa')).not.toEqual(
      getPairChaseChallengeRounds('bbbbbb')
    );
  });

  it('gives each round a board matching its difficulty size, with every face appearing twice', () => {
    for (const round of getPairChaseChallengeRounds('same-code')) {
      const cfg = PAIR_CHASE_DIFFICULTY[round.difficulty];
      expect(round.board).toHaveLength(cfg.pairs * 2);
      const counts = new Map<string, number>();
      for (const emoji of round.board) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
      for (const count of counts.values()) expect(count).toBe(2);
    }
  });

  it('gives every player the same board per round, independent of other rounds', () => {
    const a = getPairChaseChallengeRounds('same-code');
    const b = getPairChaseChallengeRounds('same-code');
    for (let round = 0; round < a.length; round++) {
      expect(a[round].board).toEqual(b[round].board);
    }
  });
});

describe('scoreRound', () => {
  it('scores a full 10 at the minimum flips, finishing well within par', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const minFlips = 2 * PAIR_CHASE_DIFFICULTY[difficulty].pairs;
      expect(scoreRound(minFlips, 0, difficulty)).toBe(10);
    }
  });

  it('clamps at 10 even finishing exactly at par with minimum flips', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const cfg = PAIR_CHASE_DIFFICULTY[difficulty];
      const minFlips = 2 * cfg.pairs;
      // At par the time bonus is 0, but flip efficiency alone already caps at 8;
      // never above 10 regardless.
      expect(scoreRound(minFlips, cfg.timeParSeconds, difficulty)).toBeLessThanOrEqual(10);
    }
  });

  it('never scores below 0', () => {
    expect(scoreRound(1000, 1000, 'easy')).toBeGreaterThanOrEqual(0);
    expect(scoreRound(0, 0, 'easy')).toBe(0);
  });

  it('decreases monotonically as flips increase, elapsed held constant', () => {
    const difficulty = 'medium';
    const minFlips = 2 * PAIR_CHASE_DIFFICULTY[difficulty].pairs;
    let prev = scoreRound(minFlips, 10, difficulty);
    for (let flips = minFlips + 1; flips <= minFlips + 30; flips++) {
      const score = scoreRound(flips, 10, difficulty);
      expect(score).toBeLessThanOrEqual(prev);
      prev = score;
    }
  });

  it('decreases monotonically as elapsed time increases, flips held constant', () => {
    const difficulty = 'hard';
    const cfg = PAIR_CHASE_DIFFICULTY[difficulty];
    const flips = 2 * cfg.pairs + 5;
    let prev = scoreRound(flips, 0, difficulty);
    for (let elapsed = 5; elapsed <= cfg.timeParSeconds * 2; elapsed += 5) {
      const score = scoreRound(flips, elapsed, difficulty);
      expect(score).toBeLessThanOrEqual(prev);
      prev = score;
    }
  });

  it('rounds to 2 decimal places', () => {
    // Easy: minFlips 12, 15 flips, elapsed 0 → (12/15)*8 + 2 = 6.4 + 2 = 8.4
    expect(scoreRound(15, 0, 'easy')).toBe(8.4);
    // Medium: minFlips 16, 20 flips, elapsed = par (55) → (16/20)*8 + 0 = 6.4
    expect(scoreRound(20, 55, 'medium')).toBe(6.4);
    // Hard: minFlips 20, 27 flips, elapsed 40 (par 80) →
    // (20/27)*8 + ((80-40)/80)*2 = 5.925925... + 1 = 6.925925... → 6.93
    expect(scoreRound(27, 40, 'hard')).toBe(6.93);
  });

  it('gives no time bonus beyond par but does not penalise running over it', () => {
    const difficulty = 'easy';
    const cfg = PAIR_CHASE_DIFFICULTY[difficulty];
    const minFlips = 2 * cfg.pairs;
    const atPar = scoreRound(minFlips, cfg.timeParSeconds, difficulty);
    const overPar = scoreRound(minFlips, cfg.timeParSeconds * 3, difficulty);
    expect(atPar).toBe(overPar);
  });
});
