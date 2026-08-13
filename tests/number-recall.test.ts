import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import { formatScore, round2 } from '@/utils/scoring';
import {
  CHALLENGE_LADDER_DEPTH,
  RECALL_DIFFICULTY,
  firstMismatchIndex,
  getDisplayMs,
  makeDigits,
  scoreRound,
} from '@/games/number-recall/constants';
import { getRecallChallengeRounds } from '@/games/number-recall/challenge';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

describe('makeDigits', () => {
  it('returns a string of exactly the requested length', () => {
    for (const length of [1, 3, 4, 5, 7, 11, 20]) {
      expect(makeDigits(length, seededRand(1))).toHaveLength(length);
    }
  });

  it('never opens with a leading zero', () => {
    const rand = seededRand(42);
    for (let i = 0; i < 500; i++) {
      const digits = makeDigits(3 + (i % 10), rand);
      expect(digits[0]).not.toBe('0');
      expect(digits[0]).toMatch(/[1-9]/);
    }
  });

  it('only ever produces digit characters', () => {
    const rand = seededRand(7);
    for (let i = 0; i < 300; i++) {
      const digits = makeDigits(8, rand);
      expect(digits).toMatch(/^[0-9]+$/);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(makeDigits(6, seededRand(99))).toBe(makeDigits(6, seededRand(99)));
    expect(makeDigits(12, seededRand(2024))).toBe(makeDigits(12, seededRand(2024)));
  });

  it('produces different digits for different seeds', () => {
    // Not a mathematical guarantee for any single pair, but true for these
    // fixed seeds — a regression here means the RNG stream stopped mattering.
    expect(makeDigits(8, seededRand(1))).not.toBe(makeDigits(8, seededRand(2)));
    expect(makeDigits(8, seededRand(10))).not.toBe(makeDigits(8, seededRand(20)));
  });

  it('produces a single in-range digit for length 1', () => {
    const rand = seededRand(555);
    for (let i = 0; i < 50; i++) {
      const digits = makeDigits(1, rand);
      expect(digits).toHaveLength(1);
      expect(digits).toMatch(/[1-9]/);
    }
  });
});

describe('RECALL_DIFFICULTY', () => {
  it('starts the ladder later and asks for a longer par as difficulty rises', () => {
    const { easy, medium, hard } = RECALL_DIFFICULTY;
    expect(easy.start).toBeLessThan(medium.start);
    expect(medium.start).toBeLessThan(hard.start);
    expect(easy.par).toBeLessThan(medium.par);
    expect(medium.par).toBeLessThan(hard.par);
  });

  it('pins the exact start/par values from the spec', () => {
    expect(RECALL_DIFFICULTY.easy).toMatchObject({ start: 3, par: 7 });
    expect(RECALL_DIFFICULTY.medium).toMatchObject({ start: 4, par: 9 });
    expect(RECALL_DIFFICULTY.hard).toMatchObject({ start: 5, par: 11 });
  });

  it('always leaves room to climb from start to par', () => {
    for (const cfg of Object.values(RECALL_DIFFICULTY)) {
      expect(cfg.par).toBeGreaterThan(cfg.start);
    }
  });
});

describe('getDisplayMs', () => {
  it('matches the 900ms + 220ms/digit formula for easy and medium', () => {
    expect(getDisplayMs(3, 'easy')).toBe(900 + 220 * 3);
    expect(getDisplayMs(4, 'medium')).toBe(900 + 220 * 4);
    expect(getDisplayMs(10, 'easy')).toBe(900 + 220 * 10);
  });

  it('matches the 700ms + 160ms/digit formula for hard', () => {
    expect(getDisplayMs(5, 'hard')).toBe(700 + 160 * 5);
    expect(getDisplayMs(11, 'hard')).toBe(700 + 160 * 11);
  });

  it('grows with digit length on every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getDisplayMs(6, difficulty)).toBeGreaterThan(getDisplayMs(3, difficulty));
    }
  });

  it('gives hard a shorter window than easy/medium at the same length', () => {
    expect(getDisplayMs(5, 'hard')).toBeLessThan(getDisplayMs(5, 'easy'));
    expect(getDisplayMs(5, 'hard')).toBeLessThan(getDisplayMs(5, 'medium'));
  });
});

describe('firstMismatchIndex', () => {
  it('returns the shared length for an exact match', () => {
    expect(firstMismatchIndex('4821', '4821')).toBe(4);
  });

  it('returns the index of the first differing digit', () => {
    expect(firstMismatchIndex('4821', '4831')).toBe(2);
    expect(firstMismatchIndex('918273', '018273')).toBe(0);
    expect(firstMismatchIndex('12345', '12340')).toBe(4);
  });

  it('returns 0 for a fully empty entry', () => {
    expect(firstMismatchIndex('583', '')).toBe(0);
  });

  it('is not fooled by a later digit that happens to coincide again', () => {
    // First mismatch at index 1; the trailing '3' matching back up doesn't
    // move the cutoff — everything from the first miss onward reads as wrong.
    expect(firstMismatchIndex('123', '173')).toBe(1);
  });

  it('handles entries shorter or longer than the target as the shared-prefix length', () => {
    expect(firstMismatchIndex('4821', '482')).toBe(3);
    expect(firstMismatchIndex('482', '4821')).toBe(3);
  });
});

describe('scoreRound', () => {
  it('scores 0 for failing the very first number, on every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const floor = RECALL_DIFFICULTY[difficulty].start - 1;
      expect(scoreRound(floor, difficulty)).toBe(0);
    }
  });

  it('scores a perfect 10 for reaching par, on every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(scoreRound(RECALL_DIFFICULTY[difficulty].par, difficulty)).toBe(10);
    }
  });

  it('clamps at 10 for reaching past par', () => {
    for (const difficulty of DIFFICULTIES) {
      const { par } = RECALL_DIFFICULTY[difficulty];
      expect(scoreRound(par + 5, difficulty)).toBe(10);
      expect(scoreRound(par + 20, difficulty)).toBe(10);
    }
  });

  it('never scores below 0, even for an out-of-range reached', () => {
    for (const difficulty of DIFFICULTIES) {
      const floor = RECALL_DIFFICULTY[difficulty].start - 1;
      expect(scoreRound(floor - 3, difficulty)).toBe(0);
    }
  });

  it('scales evenly between the floor and par', () => {
    // Easy: floor 2, par 7 — each digit climbed is worth 2 points.
    expect(scoreRound(3, 'easy')).toBe(2);
    expect(scoreRound(4, 'easy')).toBe(4);
    expect(scoreRound(5, 'easy')).toBe(6);
    expect(scoreRound(6, 'easy')).toBe(8);
  });

  it('rises monotonically with reached, on every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const { start, par } = RECALL_DIFFICULTY[difficulty];
      let previous = -1;
      for (let reached = start - 1; reached <= par + 2; reached++) {
        const score = scoreRound(reached, difficulty);
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }
  });

  it('always returns a value rounded to at most 2 decimal places', () => {
    for (const difficulty of DIFFICULTIES) {
      const { start, par } = RECALL_DIFFICULTY[difficulty];
      for (let reached = start - 1; reached <= par; reached++) {
        const score = scoreRound(reached, difficulty);
        expect(round2(score)).toBe(score);
        expect(formatScore(score)).toMatch(/^\d+(\.\d{2})?$/);
      }
    }
  });

  it('keeps every score within [0, 10]', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let reached = -5; reached <= 30; reached++) {
        const score = scoreRound(reached, difficulty);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe('getRecallChallengeRounds', () => {
  it('is deterministic for a given code', () => {
    expect(getRecallChallengeRounds('abc123')).toEqual(getRecallChallengeRounds('abc123'));
  });

  it('is case-insensitive', () => {
    expect(getRecallChallengeRounds('ABC123')).toEqual(getRecallChallengeRounds('abc123'));
    expect(getRecallChallengeRounds('DaIlY-code')).toEqual(getRecallChallengeRounds('daily-code'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getRecallChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('starts each round\'s ladder at that difficulty\'s start length: 3, 4, 5', () => {
    const rounds = getRecallChallengeRounds('length-check');
    expect(rounds[0].ladder[0]).toHaveLength(3);
    expect(rounds[1].ladder[0]).toHaveLength(4);
    expect(rounds[2].ladder[0]).toHaveLength(5);
  });

  it('pre-generates the full ladder depth for every round', () => {
    const rounds = getRecallChallengeRounds('depth-check');
    for (const round of rounds) {
      expect(round.ladder).toHaveLength(CHALLENGE_LADDER_DEPTH);
    }
  });

  it('climbs the ladder one digit at a time, in order, within a round', () => {
    const rounds = getRecallChallengeRounds('climb-check');
    for (const round of rounds) {
      for (let i = 0; i < round.ladder.length; i++) {
        expect(round.ladder[i]).toHaveLength(RECALL_DIFFICULTY[round.difficulty].start + i);
      }
    }
  });

  it('gives different codes different ladders', () => {
    expect(getRecallChallengeRounds('aaaaaa')).not.toEqual(getRecallChallengeRounds('bbbbbb'));
  });

  it('never produces a leading zero anywhere in a seeded ladder', () => {
    for (let i = 0; i < 100; i++) {
      const rounds = getRecallChallengeRounds(`fuzz-${i}`);
      for (const round of rounds) {
        for (const digits of round.ladder) {
          expect(digits[0]).not.toBe('0');
        }
      }
    }
  });

  it('keeps every seeded digit string composed only of digits', () => {
    const rounds = getRecallChallengeRounds('digits-only');
    for (const round of rounds) {
      for (const digits of round.ladder) {
        expect(digits).toMatch(/^[0-9]+$/);
      }
    }
  });
});

describe('a played-out round, end to end', () => {
  /** Mirrors how the hook drives a round: climb the ladder until a miss,
   *  then score from the longest length correctly recalled. */
  function playRound(difficulty: Difficulty, failAt: number): { reached: number; score: number } {
    const { start } = RECALL_DIFFICULTY[difficulty];
    const level = failAt; // the length the player gets wrong
    const reached = level - 1;
    return { reached: Math.max(reached, start - 1), score: scoreRound(reached, difficulty) };
  }

  it('scores 0 when the very first number is missed', () => {
    for (const difficulty of DIFFICULTIES) {
      const { start } = RECALL_DIFFICULTY[difficulty];
      const { reached, score } = playRound(difficulty, start);
      expect(reached).toBe(start - 1);
      expect(score).toBe(0);
    }
  });

  it('scores 10 when the miss lands exactly one past par', () => {
    for (const difficulty of DIFFICULTIES) {
      const { par } = RECALL_DIFFICULTY[difficulty];
      const { reached, score } = playRound(difficulty, par + 1);
      expect(reached).toBe(par);
      expect(score).toBe(10);
    }
  });

  it('a session total across three rounds stays a clean 2dp value', () => {
    const roundScores = [
      scoreRound(5, 'easy'),
      scoreRound(6, 'medium'),
      scoreRound(9, 'hard'),
    ];
    const total = round2(roundScores.reduce((a, b) => a + b, 0));
    expect(round2(total)).toBe(total);
    expect(formatScore(total)).toMatch(/^\d+(\.\d{2})?$/);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(30);
  });
});
