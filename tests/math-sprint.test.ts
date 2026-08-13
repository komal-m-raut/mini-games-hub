import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import { formatScore, ratingFromScore, round2 } from '@/utils/scoring';
import {
  MATH_DIFFICULTY,
  MathQuestion,
  ROUND_SECONDS,
  TOTAL_ROUNDS,
  calculateMathNet,
  calculateMathScore,
  makeMathQuestion,
} from '@/games/math-sprint/constants';
import { CHALLENGE_QUESTIONS_PER_ROUND, getMathChallengeRounds } from '@/games/math-sprint/challenge';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

describe('makeMathQuestion — easy', () => {
  it('only uses + or − and is never negative', () => {
    const rand = seededRand(1);
    for (let i = 0; i < 2000; i++) {
      const q = makeMathQuestion('easy', rand);
      expect(['+', '−']).toContain(q.op);
      expect(q.answer).toBeGreaterThanOrEqual(0);
    }
  });

  it('draws both operands from 2–20', () => {
    const rand = seededRand(2);
    for (let i = 0; i < 2000; i++) {
      const q = makeMathQuestion('easy', rand);
      expect(q.a).toBeGreaterThanOrEqual(2);
      expect(q.a).toBeLessThanOrEqual(20);
      expect(q.b).toBeGreaterThanOrEqual(2);
      expect(q.b).toBeLessThanOrEqual(20);
    }
  });

  it('the answer matches the operation', () => {
    const rand = seededRand(3);
    for (let i = 0; i < 2000; i++) {
      const q = makeMathQuestion('easy', rand);
      expect(q.answer).toBe(q.op === '+' ? q.a + q.b : q.a - q.b);
    }
  });
});

describe('makeMathQuestion — medium', () => {
  it('only uses +, − or ×', () => {
    const rand = seededRand(4);
    for (let i = 0; i < 3000; i++) {
      expect(['+', '−', '×']).toContain(makeMathQuestion('medium', rand).op);
    }
  });

  it('offers every operator across enough draws', () => {
    const rand = seededRand(5);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) seen.add(makeMathQuestion('medium', rand).op);
    expect(seen).toEqual(new Set(['+', '−', '×']));
  });

  it('+/− operands are 10–50; × operands are 2–10', () => {
    const rand = seededRand(6);
    for (let i = 0; i < 4000; i++) {
      const q = makeMathQuestion('medium', rand);
      if (q.op === '×') {
        expect(q.a).toBeGreaterThanOrEqual(2);
        expect(q.a).toBeLessThanOrEqual(10);
        expect(q.b).toBeGreaterThanOrEqual(2);
        expect(q.b).toBeLessThanOrEqual(10);
      } else {
        expect(q.a).toBeGreaterThanOrEqual(10);
        expect(q.a).toBeLessThanOrEqual(50);
        expect(q.b).toBeGreaterThanOrEqual(10);
        expect(q.b).toBeLessThanOrEqual(50);
      }
    }
  });

  it('subtraction is never negative and every answer matches its operator', () => {
    const rand = seededRand(7);
    for (let i = 0; i < 3000; i++) {
      const q = makeMathQuestion('medium', rand);
      if (q.op === '−') expect(q.answer).toBeGreaterThanOrEqual(0);
      const expected = q.op === '+' ? q.a + q.b : q.op === '−' ? q.a - q.b : q.a * q.b;
      expect(q.answer).toBe(expected);
    }
  });
});

describe('makeMathQuestion — hard', () => {
  it('only uses +, −, × or ÷', () => {
    const rand = seededRand(8);
    for (let i = 0; i < 4000; i++) {
      expect(['+', '−', '×', '÷']).toContain(makeMathQuestion('hard', rand).op);
    }
  });

  it('offers every operator across enough draws', () => {
    const rand = seededRand(9);
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) seen.add(makeMathQuestion('hard', rand).op);
    expect(seen).toEqual(new Set(['+', '−', '×', '÷']));
  });

  it('+/− operands are 20–99, subtraction never negative', () => {
    const rand = seededRand(10);
    for (let i = 0; i < 4000; i++) {
      const q = makeMathQuestion('hard', rand);
      if (q.op === '+' || q.op === '−') {
        expect(q.a).toBeGreaterThanOrEqual(20);
        expect(q.a).toBeLessThanOrEqual(99);
        expect(q.b).toBeGreaterThanOrEqual(20);
        expect(q.b).toBeLessThanOrEqual(99);
        if (q.op === '−') expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('× operands are 3–12 each', () => {
    const rand = seededRand(11);
    for (let i = 0; i < 4000; i++) {
      const q = makeMathQuestion('hard', rand);
      if (q.op === '×') {
        expect(q.a).toBeGreaterThanOrEqual(3);
        expect(q.a).toBeLessThanOrEqual(12);
        expect(q.b).toBeGreaterThanOrEqual(3);
        expect(q.b).toBeLessThanOrEqual(12);
        expect(q.answer).toBe(q.a * q.b);
      }
    }
  });

  it('÷ is always exact, with divisor and quotient both 3–12', () => {
    const rand = seededRand(12);
    let sawDivision = false;
    for (let i = 0; i < 4000; i++) {
      const q = makeMathQuestion('hard', rand);
      if (q.op !== '÷') continue;
      sawDivision = true;
      expect(q.b).toBeGreaterThanOrEqual(3);
      expect(q.b).toBeLessThanOrEqual(12);
      expect(q.answer).toBeGreaterThanOrEqual(3);
      expect(q.answer).toBeLessThanOrEqual(12);
      // Exact division: the dividend is constructed as b × answer, so it
      // must divide out cleanly with no remainder.
      expect(q.a % q.b).toBe(0);
      expect(q.a / q.b).toBe(q.answer);
    }
    expect(sawDivision).toBe(true);
  });
});

describe('makeMathQuestion — determinism', () => {
  it('is a pure function of the RNG it is given', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeMathQuestion(difficulty, seededRand(2026))).toEqual(
        makeMathQuestion(difficulty, seededRand(2026))
      );
    }
  });

  it('produces integer operands and answers only', () => {
    const rand = seededRand(13);
    for (let i = 0; i < 1000; i++) {
      for (const difficulty of DIFFICULTIES) {
        const q = makeMathQuestion(difficulty, rand);
        expect(Number.isInteger(q.a)).toBe(true);
        expect(Number.isInteger(q.b)).toBe(true);
        expect(Number.isInteger(q.answer)).toBe(true);
      }
    }
  });
});

describe('difficulty configuration', () => {
  it('lowers par as the arithmetic gets harder', () => {
    const { easy, medium, hard } = MATH_DIFFICULTY;
    expect(easy.par).toBeGreaterThan(medium.par);
    expect(medium.par).toBeGreaterThan(hard.par);
    for (const cfg of [easy, medium, hard]) expect(cfg.par).toBeGreaterThan(0);
  });

  it('runs 3 rounds of 30 seconds for both solo and challenge', () => {
    expect(ROUND_SECONDS).toBe(30);
    expect(TOTAL_ROUNDS).toBe(3);
    expect(CHALLENGE_DIFFICULTIES.length).toBe(TOTAL_ROUNDS);
  });
});

describe('calculateMathNet', () => {
  it('is correct minus half a point per wrong (including skips)', () => {
    expect(calculateMathNet(10, 0)).toBe(10);
    expect(calculateMathNet(10, 4)).toBe(8);
    expect(calculateMathNet(0, 0)).toBe(0);
  });

  it('never drops below zero, however lopsided the round', () => {
    expect(calculateMathNet(0, 10)).toBe(0);
    expect(calculateMathNet(1, 100)).toBe(0);
  });
});

describe('calculateMathScore', () => {
  it('scores 0 for zero net', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(calculateMathScore(0, 0, difficulty)).toBe(0);
      expect(calculateMathScore(0, 6, difficulty)).toBe(0);
    }
  });

  it('scores exactly 10 when net matches par', () => {
    for (const difficulty of DIFFICULTIES) {
      const par = MATH_DIFFICULTY[difficulty].par;
      expect(calculateMathScore(par, 0, difficulty)).toBe(10);
    }
  });

  it('clamps at 10 once net runs past par', () => {
    for (const difficulty of DIFFICULTIES) {
      const par = MATH_DIFFICULTY[difficulty].par;
      expect(calculateMathScore(par * 3, 0, difficulty)).toBe(10);
    }
  });

  it('rises monotonically with net, for a fixed difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      let previous = -1;
      for (let correct = 0; correct <= MATH_DIFFICULTY[difficulty].par; correct++) {
        const score = calculateMathScore(correct, 0, difficulty);
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }
  });

  it('matches a hand-computed 2dp value', () => {
    // medium par = 16; net = 7 - 0.5*0 = 7 → 7/16*10 = 4.375 → round2 → 4.38
    expect(calculateMathScore(7, 0, 'medium')).toBe(4.38);
    // hard par = 12; correct=10, wrong=3 → net = 10 - 1.5 = 8.5 → 8.5/12*10 = 7.0833… → 7.08
    expect(calculateMathScore(10, 3, 'hard')).toBe(7.08);
  });

  it('always returns an already-2dp value', () => {
    const rand = seededRand(14);
    for (let i = 0; i < 500; i++) {
      const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
      const correct = Math.floor(rand() * 40);
      const wrong = Math.floor(rand() * 40);
      const score = calculateMathScore(correct, wrong, difficulty);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
      expect(round2(score)).toBe(score);
      expect(formatScore(score)).toMatch(/^\d+(\.\d{2})?$/);
    }
  });

  it('agrees with the shared rating curve (H3): higher score never rates lower', () => {
    const order = ['Try Again', 'Good', 'Great', 'Perfect'];
    let previousScore = -1;
    let previousRank = -1;
    for (let correct = 0; correct <= 20; correct++) {
      const score = calculateMathScore(correct, 0, 'easy');
      const rank = order.indexOf(ratingFromScore(score));
      if (score > previousScore) {
        expect(rank).toBeGreaterThanOrEqual(previousRank);
      }
      previousScore = score;
      previousRank = rank;
    }
  });
});

describe('getMathChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getMathChallengeRounds('abc123')).toEqual(getMathChallengeRounds('abc123'));
    expect(getMathChallengeRounds('ABC123')).toEqual(getMathChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getMathChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('gives different codes different question sequences', () => {
    expect(getMathChallengeRounds('aaaaaa')).not.toEqual(getMathChallengeRounds('bbbbbb'));
  });

  it('pre-generates a full question sequence per round, long enough that a 30s round can never exhaust it', () => {
    const rounds = getMathChallengeRounds('fuzz-code');
    for (const round of rounds) {
      expect(round.questions).toHaveLength(CHALLENGE_QUESTIONS_PER_ROUND);
    }
  });

  it('keeps every seeded question valid for its round difficulty', () => {
    function isValidForDifficulty(q: MathQuestion, difficulty: Difficulty): boolean {
      if (difficulty === 'easy') {
        if (!['+', '−'].includes(q.op)) return false;
        if (q.a < 2 || q.a > 20 || q.b < 2 || q.b > 20) return false;
      } else if (difficulty === 'medium') {
        if (!['+', '−', '×'].includes(q.op)) return false;
        if (q.op === '×') {
          if (q.a < 2 || q.a > 10 || q.b < 2 || q.b > 10) return false;
        } else if (q.a < 10 || q.a > 50 || q.b < 10 || q.b > 50) {
          return false;
        }
      } else {
        if (!['+', '−', '×', '÷'].includes(q.op)) return false;
        if (q.op === '×') {
          if (q.a < 3 || q.a > 12 || q.b < 3 || q.b > 12) return false;
        } else if (q.op === '÷') {
          if (q.b < 3 || q.b > 12 || q.answer < 3 || q.answer > 12 || q.a !== q.b * q.answer) {
            return false;
          }
        } else if (q.a < 20 || q.a > 99 || q.b < 20 || q.b > 99) {
          return false;
        }
      }
      if (q.op === '−') return q.answer >= 0 && q.answer === q.a - q.b;
      if (q.op === '+') return q.answer === q.a + q.b;
      if (q.op === '×') return q.answer === q.a * q.b;
      return true; // ÷ already checked above
    }

    for (let i = 0; i < 100; i++) {
      for (const round of getMathChallengeRounds(`seed-${i}`)) {
        for (const q of round.questions) {
          expect(isValidForDifficulty(q, round.difficulty)).toBe(true);
        }
      }
    }
  });
});

describe('a full round simulation', () => {
  it('keeps a 3-round challenge total in range and at 2dp', () => {
    const rand = seededRand(20260813);
    for (const difficulty of DIFFICULTIES) {
      let totalScore = 0;
      const roundScores: number[] = [];
      for (let r = 0; r < 3; r++) {
        const correct = Math.floor(rand() * (MATH_DIFFICULTY[difficulty].par + 5));
        const wrong = Math.floor(rand() * 10);
        const score = calculateMathScore(correct, wrong, difficulty);
        roundScores.push(score);
        totalScore = round2(totalScore + score);
      }
      expect(roundScores).toHaveLength(3);
      expect(totalScore).toBeGreaterThanOrEqual(0);
      expect(totalScore).toBeLessThanOrEqual(30);
      expect(round2(totalScore)).toBe(totalScore);
    }
  });
});
