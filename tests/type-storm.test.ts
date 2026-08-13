import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import { round2 } from '@/utils/scoring';
import {
  TYPE_DIFFICULTY,
  WORD_POOLS,
  WORD_STREAM_LENGTH,
  makeWordStream,
  scoreRound,
} from '@/games/type-storm/constants';
import { getTypeStormChallengeRounds } from '@/games/type-storm/challenge';
import { WORDS } from '@/games/type-storm/words';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

describe('WORDS corpus', () => {
  it('has at least 300 words', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(300);
  });

  it('is all lowercase a–z only', () => {
    for (const w of WORDS) {
      expect(w).toMatch(/^[a-z]+$/);
    }
  });

  it('is all 3–9 letters long', () => {
    for (const w of WORDS) {
      expect(w.length).toBeGreaterThanOrEqual(3);
      expect(w.length).toBeLessThanOrEqual(9);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });
});

describe('WORD_POOLS', () => {
  it('is non-empty for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(WORD_POOLS[difficulty].length).toBeGreaterThan(0);
    }
  });

  it('respects each difficulty\'s length window', () => {
    for (const difficulty of DIFFICULTIES) {
      const { minLen, maxLen } = TYPE_DIFFICULTY[difficulty];
      for (const w of WORD_POOLS[difficulty]) {
        expect(w.length).toBeGreaterThanOrEqual(minLen);
        expect(w.length).toBeLessThanOrEqual(maxLen);
      }
    }
  });

  it('easy is 3–5, medium is 4–7, hard is 5–9', () => {
    expect(TYPE_DIFFICULTY.easy).toMatchObject({ minLen: 3, maxLen: 5 });
    expect(TYPE_DIFFICULTY.medium).toMatchObject({ minLen: 4, maxLen: 7 });
    expect(TYPE_DIFFICULTY.hard).toMatchObject({ minLen: 5, maxLen: 9 });
  });
});

describe('makeWordStream', () => {
  it('is deterministic for a given seed', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeWordStream(difficulty, seededRand(42))).toEqual(makeWordStream(difficulty, seededRand(42)));
    }
  });

  it('differs across seeds', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeWordStream(difficulty, seededRand(1))).not.toEqual(makeWordStream(difficulty, seededRand(2)));
    }
  });

  it('pre-generates the expected stream length', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeWordStream(difficulty, seededRand(7))).toHaveLength(WORD_STREAM_LENGTH);
    }
  });

  it('never repeats a word immediately, including across a reshuffle seam', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const difficulty of DIFFICULTIES) {
        const stream = makeWordStream(difficulty, seededRand(seed));
        for (let i = 1; i < stream.length; i++) {
          expect(stream[i]).not.toBe(stream[i - 1]);
        }
      }
    }
  });

  it('draws every word from the right difficulty pool', () => {
    for (const difficulty of DIFFICULTIES) {
      const pool = new Set(WORD_POOLS[difficulty]);
      const stream = makeWordStream(difficulty, seededRand(99));
      for (const w of stream) {
        expect(pool.has(w)).toBe(true);
      }
    }
  });
});

describe('scoreRound', () => {
  it('scores 0 when nothing was typed', () => {
    const { wpm, accuracy, score } = scoreRound({ correctChars: 0, typedChars: 0 });
    expect(wpm).toBe(0);
    expect(accuracy).toBe(0);
    expect(score).toBe(0);
  });

  it('scores exactly 10 at 60 effective WPM with perfect accuracy', () => {
    // wpm = (correctChars / 5) / 0.5 = 60  ⇒  correctChars = 150
    const { wpm, accuracy, score } = scoreRound({ correctChars: 150, typedChars: 150 });
    expect(wpm).toBe(60);
    expect(accuracy).toBe(1);
    expect(score).toBe(10);
  });

  it('halves the score when accuracy halves, at the same WPM', () => {
    const full = scoreRound({ correctChars: 150, typedChars: 150 });
    const half = scoreRound({ correctChars: 150, typedChars: 300 });
    expect(half.wpm).toBe(full.wpm);
    expect(half.accuracy).toBe(0.5);
    expect(half.score).toBe(round2(full.score / 2));
  });

  it('clamps accuracy at 1 even if correctChars exceeds typedChars', () => {
    const { accuracy } = scoreRound({ correctChars: 200, typedChars: 100 });
    expect(accuracy).toBe(1);
  });

  it('clamps score at 10 well past 60 effective WPM', () => {
    const { score } = scoreRound({ correctChars: 1000, typedChars: 1000 });
    expect(score).toBe(10);
  });

  it('never returns a negative score', () => {
    const { score } = scoreRound({ correctChars: 0, typedChars: 500 });
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('always returns an already-2dp score', () => {
    const rand = seededRand(11);
    for (let i = 0; i < 500; i++) {
      const correctChars = Math.floor(rand() * 400);
      const typedChars = Math.floor(rand() * 400);
      const { score } = scoreRound({ correctChars, typedChars });
      expect(round2(score)).toBe(score);
    }
  });

  it('handles the zero-division edge (typed 0, but somehow correct > 0) without NaN', () => {
    const { accuracy, score } = scoreRound({ correctChars: 5, typedChars: 0 });
    expect(Number.isNaN(accuracy)).toBe(false);
    expect(Number.isNaN(score)).toBe(false);
    expect(accuracy).toBe(1);
  });
});

describe('getTypeStormChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getTypeStormChallengeRounds('abc123')).toEqual(getTypeStormChallengeRounds('abc123'));
    expect(getTypeStormChallengeRounds('ABC123')).toEqual(getTypeStormChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getTypeStormChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(CHALLENGE_DIFFICULTIES);
  });

  it('gives different codes different word sequences', () => {
    expect(getTypeStormChallengeRounds('aaaaaa')).not.toEqual(getTypeStormChallengeRounds('bbbbbb'));
  });

  it('pre-generates a full word stream per round', () => {
    const rounds = getTypeStormChallengeRounds('fuzz-code');
    for (const round of rounds) {
      expect(round.words).toHaveLength(WORD_STREAM_LENGTH);
    }
  });

  it('keeps every seeded word valid for its round difficulty', () => {
    for (let i = 0; i < 50; i++) {
      for (const round of getTypeStormChallengeRounds(`seed-${i}`)) {
        const pool = new Set(WORD_POOLS[round.difficulty]);
        for (const w of round.words) {
          expect(pool.has(w)).toBe(true);
        }
      }
    }
  });
});
