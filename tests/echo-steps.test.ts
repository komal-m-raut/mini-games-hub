import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { getEchoStepsChallengeRounds } from '@/games/echo-steps/challenge';
import {
  ECHO_STEPS_DIFFICULTY,
  MASTER_SEQUENCE_LENGTH,
  PAD_COUNT,
  makeSequence,
  scoreRound,
  sequenceForLevel,
} from '@/games/echo-steps/constants';

/** Deterministic RNG so a failing case is reproducible. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('makeSequence', () => {
  it('returns exactly `length` steps', () => {
    expect(makeSequence(5, seeded(1))).toHaveLength(5);
    expect(makeSequence(24, seeded(2))).toHaveLength(24);
  });

  it('every step is a valid pad index (0–3)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const sequence = makeSequence(30, seeded(seed));
      for (const step of sequence) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(PAD_COUNT);
      }
    }
  });

  it('is deterministic for a given rand stream', () => {
    expect(makeSequence(12, seeded(7))).toEqual(makeSequence(12, seeded(7)));
  });

  it('differs across seeds', () => {
    expect(makeSequence(20, seeded(1))).not.toEqual(makeSequence(20, seeded(2)));
  });

  it('allows repeats — no constraint against the same pad twice in a row', () => {
    // A long enough sequence from a fixed seed is overwhelmingly likely to
    // contain at least one immediate repeat if repeats are truly allowed.
    const sequence = makeSequence(200, seeded(42));
    const hasRepeat = sequence.some((step, i) => i > 0 && step === sequence[i - 1]);
    expect(hasRepeat).toBe(true);
  });
});

describe('sequenceForLevel', () => {
  it('returns the first N steps of the master sequence', () => {
    const master = makeSequence(MASTER_SEQUENCE_LENGTH, seeded(3));
    expect(sequenceForLevel(master, 5)).toEqual(master.slice(0, 5));
    expect(sequenceForLevel(master, 12)).toEqual(master.slice(0, 12));
  });

  it('a shorter level is always a prefix of a longer level from the same master', () => {
    const master = makeSequence(MASTER_SEQUENCE_LENGTH, seeded(9));
    const short = sequenceForLevel(master, 4);
    const long = sequenceForLevel(master, 10);
    expect(long.slice(0, short.length)).toEqual(short);
  });
});

describe('ECHO_STEPS_DIFFICULTY', () => {
  it('starts at 2 notes on Easy and 3 on Medium/Hard', () => {
    expect(ECHO_STEPS_DIFFICULTY.easy.start).toBe(2);
    expect(ECHO_STEPS_DIFFICULTY.medium.start).toBe(3);
    expect(ECHO_STEPS_DIFFICULTY.hard.start).toBe(3);
  });

  it('raises par with difficulty', () => {
    expect(ECHO_STEPS_DIFFICULTY.easy.par).toBe(8);
    expect(ECHO_STEPS_DIFFICULTY.medium.par).toBe(10);
    expect(ECHO_STEPS_DIFFICULTY.hard.par).toBe(12);
  });

  it('plays Easy and Medium at 600ms/step and Hard at 420ms/step', () => {
    expect(ECHO_STEPS_DIFFICULTY.easy.stepMs).toBe(600);
    expect(ECHO_STEPS_DIFFICULTY.medium.stepMs).toBe(600);
    expect(ECHO_STEPS_DIFFICULTY.hard.stepMs).toBe(420);
  });
});

describe('getEchoStepsChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getEchoStepsChallengeRounds('abc123')).toEqual(getEchoStepsChallengeRounds('abc123'));
    expect(getEchoStepsChallengeRounds('ABC123')).toEqual(getEchoStepsChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getEchoStepsChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('gives each round a master sequence of the expected length', () => {
    for (const round of getEchoStepsChallengeRounds('any-code')) {
      expect(round.master).toHaveLength(MASTER_SEQUENCE_LENGTH);
      for (const step of round.master) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(PAD_COUNT);
      }
    }
  });

  it('differentiates codes', () => {
    expect(getEchoStepsChallengeRounds('aaaaaa')).not.toEqual(
      getEchoStepsChallengeRounds('bbbbbb')
    );
  });

  it('every level a player might reach is a prefix of the round master, independent of how far anyone climbed', () => {
    // Since a level's sequence is always `master.slice(0, length)`, this is
    // true by construction — assert it explicitly against the ladder's own
    // start/par bounds for every difficulty, so a future refactor that
    // breaks the invariant fails loudly here.
    const rounds = getEchoStepsChallengeRounds('same-code');
    for (const round of rounds) {
      const cfg = ECHO_STEPS_DIFFICULTY[round.difficulty];
      for (let length = cfg.start; length <= cfg.par; length++) {
        expect(sequenceForLevel(round.master, length)).toEqual(round.master.slice(0, length));
        expect(sequenceForLevel(round.master, length)).toHaveLength(length);
      }
    }
  });

  it('gives every player the identical master sequence for the same code', () => {
    const a = getEchoStepsChallengeRounds('repeat-code');
    const b = getEchoStepsChallengeRounds('repeat-code');
    for (let i = 0; i < a.length; i++) {
      expect(a[i].master).toEqual(b[i].master);
    }
  });
});

describe('scoreRound', () => {
  it('scores 0 when the very first playback is never matched (len = start - 1)', () => {
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.easy.start - 1, 'easy')).toBe(0);
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.medium.start - 1, 'medium')).toBe(0);
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.hard.start - 1, 'hard')).toBe(0);
  });

  it('scores a full 10 at exactly par, for every difficulty', () => {
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.easy.par, 'easy')).toBe(10);
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.medium.par, 'medium')).toBe(10);
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.hard.par, 'hard')).toBe(10);
  });

  it('clamps at 10 for a len above par', () => {
    expect(scoreRound(ECHO_STEPS_DIFFICULTY.easy.par + 5, 'easy')).toBe(10);
    expect(scoreRound(MASTER_SEQUENCE_LENGTH, 'hard')).toBe(10);
  });

  it('never drops below 0 for a len below start - 1', () => {
    expect(scoreRound(0, 'easy')).toBe(0);
    expect(scoreRound(1, 'medium')).toBe(0);
  });

  it('rounds to 2 decimal places for a len that lands off a clean fraction', () => {
    // Easy: floor 1, par 8 → (3 - 1) / (8 - 1) * 10 = 2.857142… → 2.86
    expect(scoreRound(3, 'easy')).toBe(2.86);
    // Hard: floor 2, par 12 → (5 - 2) / (12 - 2) * 10 = 3 → 3
    expect(scoreRound(5, 'hard')).toBe(3);
  });

  it('increases monotonically with len', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const cfg = ECHO_STEPS_DIFFICULTY[difficulty];
      let prev = scoreRound(cfg.start - 1, difficulty);
      for (let len = cfg.start; len <= cfg.par + 2; len++) {
        const score = scoreRound(len, difficulty);
        expect(score).toBeGreaterThanOrEqual(prev);
        prev = score;
      }
    }
  });
});
