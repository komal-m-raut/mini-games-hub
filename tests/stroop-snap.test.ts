import { describe, expect, it } from 'vitest';
import { Difficulty } from '@/types/game';
import { CHALLENGE_DIFFICULTIES, makeChallengeRand } from '@/lib/challenge';
import { getStroopChallengeRounds } from '@/games/stroop-snap/challenge';
import {
  COLORS,
  COLOR_POOL,
  CONGRUENT_RATE,
  PAR_NET,
  getNetScore,
  getStroopScore,
  isCongruent,
  makeTrials,
} from '@/games/stroop-snap/constants';
import { StroopColorName, Trial } from '@/games/stroop-snap/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** A tiny scripted RNG for pinning exact rand() call sequences. Cycles once
 *  exhausted so a stray extra call doesn't crash the test. */
function makeQueueRand(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('COLORS — hex values match the spec exactly', () => {
  it('every colour has its documented hex', () => {
    const expected: Record<StroopColorName, string> = {
      RED: '#EF4444',
      BLUE: '#3B82F6',
      GREEN: '#22C55E',
      YELLOW: '#EAB308',
      PURPLE: '#A855F7',
      ORANGE: '#F97316',
    };
    for (const name of Object.keys(expected) as StroopColorName[]) {
      expect(COLORS[name].hex).toBe(expected[name]);
    }
  });
});

describe('COLOR_POOL — grows with difficulty as specified', () => {
  it('easy is Red/Blue/Green', () => {
    expect(COLOR_POOL.easy).toEqual(['RED', 'BLUE', 'GREEN']);
  });
  it('medium adds Yellow', () => {
    expect(COLOR_POOL.medium).toEqual(['RED', 'BLUE', 'GREEN', 'YELLOW']);
  });
  it('hard adds Purple and Orange', () => {
    expect(COLOR_POOL.hard).toEqual(['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE']);
  });
});

describe('makeTrials', () => {
  it('is deterministic for the same seed', () => {
    for (const difficulty of DIFFICULTIES) {
      const a = makeTrials(difficulty, makeChallengeRand('seed-alpha', 'stroop-snap-test'));
      const b = makeTrials(difficulty, makeChallengeRand('seed-alpha', 'stroop-snap-test'));
      expect(a).toEqual(b);
    }
  });

  it('differentiates seeds', () => {
    const a = makeTrials('easy', makeChallengeRand('seed-a', 'stroop-snap-test'));
    const b = makeTrials('easy', makeChallengeRand('seed-b', 'stroop-snap-test'));
    expect(a).not.toEqual(b);
  });

  it('respects the colour pool for every difficulty', () => {
    for (const difficulty of DIFFICULTIES) {
      const pool = new Set(COLOR_POOL[difficulty]);
      const rand = makeChallengeRand(`fuzz-pool-${difficulty}`, 'stroop-snap-test');
      const trials = makeTrials(difficulty, rand, 300);
      for (const trial of trials) {
        expect(pool.has(trial.word)).toBe(true);
        expect(pool.has(trial.ink)).toBe(true);
      }
    }
  });

  it('congruency rate lands within ±10% of the spec over 500 trials', () => {
    for (const difficulty of DIFFICULTIES) {
      const rand = makeChallengeRand(`fuzz-rate-${difficulty}`, 'stroop-snap-test');
      const trials = makeTrials(difficulty, rand, 500);
      const congruentCount = trials.filter(isCongruent).length;
      const rate = congruentCount / trials.length;
      const target = CONGRUENT_RATE[difficulty];
      expect(rate).toBeGreaterThan(target - 0.1);
      expect(rate).toBeLessThan(target + 0.1);
    }
  });

  it('never leaves an incongruent trial with ink === word (forced redraw case)', () => {
    // Scripted so the FIRST ink draw always collides with the word, forcing
    // the "draw until different" loop to actually redraw at least once.
    // Call order per trial: word index, congruent check, then ink index
    // draw(s) until one differs from the word.
    // word index 0 → 'RED'; congruent check 0.99 (>= any rate) → incongruent;
    // ink attempt 1: index 0 → 'RED' (collides, must redraw);
    // ink attempt 2: index 2 → 'GREEN' (differs, loop exits).
    const rand = makeQueueRand([0, 0.99, 0, 0.9]);
    const [trial] = makeTrials('easy', rand, 1);
    expect(trial.word).toBe('RED');
    expect(trial.ink).toBe('GREEN');
    expect(trial.ink).not.toBe(trial.word);
  });

  it('every incongruent trial in a large sample has ink !== word', () => {
    for (const difficulty of DIFFICULTIES) {
      const rand = makeChallengeRand(`fuzz-incongruent-${difficulty}`, 'stroop-snap-test');
      const trials = makeTrials(difficulty, rand, 500);
      const incongruent = trials.filter((t) => !isCongruent(t));
      expect(incongruent.length).toBeGreaterThan(0);
      for (const trial of incongruent) {
        expect(trial.ink).not.toBe(trial.word);
      }
    }
  });

  it('never repeats the exact same word+ink pair on consecutive trials', () => {
    for (const difficulty of DIFFICULTIES) {
      const rand = makeChallengeRand(`fuzz-repeat-${difficulty}`, 'stroop-snap-test');
      const trials = makeTrials(difficulty, rand, 500);
      for (let i = 1; i < trials.length; i++) {
        const prev = trials[i - 1];
        const cur = trials[i];
        expect(prev.word === cur.word && prev.ink === cur.ink).toBe(false);
      }
    }
  });

  it('produces the requested count, defaulting to ~80 per round', () => {
    const rand = makeChallengeRand('count-check', 'stroop-snap-test');
    expect(makeTrials('easy', rand).length).toBe(80);
    const rand2 = makeChallengeRand('count-check-2', 'stroop-snap-test');
    expect(makeTrials('easy', rand2, 12).length).toBe(12);
  });
});

describe('getStroopChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getStroopChallengeRounds('abc123')).toEqual(getStroopChallengeRounds('abc123'));
    expect(getStroopChallengeRounds('ABC123')).toEqual(getStroopChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getStroopChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('differentiates codes', () => {
    expect(getStroopChallengeRounds('aaaaaa')).not.toEqual(getStroopChallengeRounds('bbbbbb'));
  });

  it('gives every round a full trial batch respecting its own pool', () => {
    for (const round of getStroopChallengeRounds('fuzz-challenge')) {
      const pool = new Set(COLOR_POOL[round.difficulty]);
      expect(round.trials.length).toBe(80);
      for (const trial of round.trials as Trial[]) {
        expect(pool.has(trial.word)).toBe(true);
        expect(pool.has(trial.ink)).toBe(true);
      }
    }
  });
});

describe('getNetScore', () => {
  it('is correct minus wrong', () => {
    expect(getNetScore(12, 3)).toBe(9);
  });

  it('never goes below zero', () => {
    expect(getNetScore(2, 5)).toBe(0);
    expect(getNetScore(0, 0)).toBe(0);
  });
});

describe('getStroopScore', () => {
  it('scores 0 net as 0', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getStroopScore(0, difficulty)).toBe(0);
    }
  });

  it('scores exactly par as a full 10', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getStroopScore(PAR_NET[difficulty], difficulty)).toBe(10);
    }
  });

  it('clamps above par at 10', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getStroopScore(PAR_NET[difficulty] * 3, difficulty)).toBe(10);
    }
  });

  it('rounds to 2 decimal places', () => {
    // 10 / 18 * 10 = 5.5555... → 5.56
    expect(getStroopScore(10, 'easy')).toBe(5.56);
    // 8 / 16 * 10 = 5 exactly
    expect(getStroopScore(8, 'medium')).toBe(5);
    // 5 / 14 * 10 = 3.5714... → 3.57
    expect(getStroopScore(5, 'hard')).toBe(3.57);
  });

  it('never returns a negative score', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(getStroopScore(getNetScore(0, 999), difficulty)).toBe(0);
    }
  });
});
