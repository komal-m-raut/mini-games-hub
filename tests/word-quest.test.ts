import { describe, expect, it } from 'vitest';
import { makeChallengeRand } from '@/lib/challenge';
import { getWordQuestChallengeWords } from '@/games/word-quest/challenge';
import { COMMON_SLICE_SIZE } from '@/games/word-quest/constants';
import {
  BestRowStats,
  FAIL_SCORE_CAP,
  SOLVE_SCORE,
  TileState,
  aggregateKeyboardState,
  bestRowStats,
  evaluateGuess,
  isValidWord,
  scoreRound,
} from '@/games/word-quest/engine';
import { ANSWERS, VALID_GUESSES } from '@/games/word-quest/words';

describe('evaluateGuess — double-letter matrix', () => {
  // guess "geese" vs answer "eerie":
  //   answer counts: e:3, r:1, i:1
  //   pass 1 (exact position): index1 g[1]='e' vs a[1]='e' -> correct;
  //                            index4 g[4]='e' vs a[4]='e' -> correct
  //     remaining after pass 1: e:1, r:1, i:1
  //   pass 2: index0 'g' -> absent; index2 'e' -> present (remaining e:1->0);
  //           index3 's' -> absent
  it('geese vs eerie', () => {
    expect(evaluateGuess('geese', 'eerie')).toEqual<TileState[]>([
      'absent',
      'correct',
      'present',
      'absent',
      'correct',
    ]);
  });

  // guess "speed" vs answer "abide": no position matches at all.
  //   answer counts: a:1, b:1, i:1, d:1, e:1
  //   pass 2: index0 's' -> absent; index1 'p' -> absent;
  //           index2 'e' -> present (e:1->0); index3 'e' -> absent (e:0 left);
  //           index4 'd' -> present (d:1->0)
  it('speed vs abide — only one e can be marked, no greens', () => {
    expect(evaluateGuess('speed', 'abide')).toEqual<TileState[]>([
      'absent',
      'absent',
      'present',
      'absent',
      'present',
    ]);
  });

  // guess "level" vs answer "hello":
  //   answer counts: h:1, e:1, l:2, o:1
  //   pass 1: index1 'e' vs 'e' -> correct; remaining e:0, l:2, h:1, o:1
  //   pass 2: index0 'l' -> present (l:2->1); index2 'v' -> absent;
  //           index3 'e' -> absent (e:0 left); index4 'l' -> present (l:1->0)
  it('level vs hello — two guess-Ls against two answer-Ls, neither aligned', () => {
    expect(evaluateGuess('level', 'hello')).toEqual<TileState[]>([
      'present',
      'correct',
      'absent',
      'absent',
      'present',
    ]);
  });

  it('all-green when the guess equals the answer', () => {
    expect(evaluateGuess('crane', 'crane')).toEqual<TileState[]>([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });

  it('all-absent when no letters overlap at all', () => {
    expect(evaluateGuess('bumpy', 'chair')).toEqual<TileState[]>([
      'absent',
      'absent',
      'absent',
      'absent',
      'absent',
    ]);
  });

  // guess "eexyz" vs answer "eabcd": guess has 2 copies of 'e', answer has
  // only 1. Pass 1 matches index0 ('e' vs 'e'), consuming the answer's only
  // 'e' — so index1's guess-'e' has nothing left to claim and comes back
  // absent, not present.
  it('more guess-copies than answer-copies caps the extra copy at absent', () => {
    expect(evaluateGuess('eexyz', 'eabcd')).toEqual<TileState[]>([
      'correct',
      'absent',
      'absent',
      'absent',
      'absent',
    ]);
  });

  // guess "efghi" vs answer "jeeek": the answer has three copies of 'e',
  // but the guess only has one — so only one yellow can ever be produced,
  // regardless of how many extra copies the answer holds.
  it('fewer guess-copies than answer-copies only marks as many as the guess has', () => {
    expect(evaluateGuess('efghi', 'jeeek')).toEqual<TileState[]>([
      'present',
      'absent',
      'absent',
      'absent',
      'absent',
    ]);
  });

  it('is case-insensitive', () => {
    expect(evaluateGuess('CRANE', 'crane')).toEqual<TileState[]>([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
    expect(evaluateGuess('crane', 'CRANE')).toEqual<TileState[]>([
      'correct',
      'correct',
      'correct',
      'correct',
      'correct',
    ]);
  });
});

describe('aggregateKeyboardState', () => {
  it('green beats yellow beats absent, and never downgrades', () => {
    // Row 1: 'a' comes back present. Row 2: 'a' comes back correct at a
    // different position. Row 3: 'a' comes back absent at yet another
    // position. The keyboard must remember 'a' as correct throughout.
    const rows = [
      { guess: 'apple', result: evaluateGuess('apple', 'zzzza') },
      { guess: 'aabbz', result: evaluateGuess('aabbz', 'azzzz') },
      { guess: 'zzzza', result: evaluateGuess('zzzza', 'azzzz') },
    ];
    const state = aggregateKeyboardState(rows);
    expect(state.a).toBe('correct');
  });

  it('upgrades absent to present to correct across separate rows', () => {
    const rows = [
      { guess: 'bbbbb', result: evaluateGuess('bbbbb', 'aaaaa') }, // b absent
      { guess: 'baaaa', result: evaluateGuess('baaaa', 'aaaab') }, // b present
    ];
    let state = aggregateKeyboardState([rows[0]]);
    expect(state.b).toBe('absent');
    state = aggregateKeyboardState(rows);
    expect(state.b).toBe('present');

    const withGreen = [...rows, { guess: 'baaaa', result: evaluateGuess('baaaa', 'baaaa') }];
    state = aggregateKeyboardState(withGreen);
    expect(state.b).toBe('correct');
  });

  it('returns an empty map for no guesses', () => {
    expect(aggregateKeyboardState([])).toEqual({});
  });
});

describe('word lists', () => {
  it('ANSWERS has at least 400 curated words', () => {
    expect(ANSWERS.length).toBeGreaterThanOrEqual(400);
  });

  it('VALID_GUESSES has at least 2500 words', () => {
    expect(VALID_GUESSES.size).toBeGreaterThanOrEqual(2500);
  });

  it('every ANSWERS entry is five lowercase letters', () => {
    for (const word of ANSWERS) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });

  it('every VALID_GUESSES entry is five lowercase letters', () => {
    for (const word of VALID_GUESSES) {
      expect(word).toMatch(/^[a-z]{5}$/);
    }
  });

  it('ANSWERS has no duplicates', () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
  });

  it('ANSWERS is a subset of VALID_GUESSES', () => {
    for (const word of ANSWERS) {
      expect(VALID_GUESSES.has(word)).toBe(true);
    }
  });

  it('isValidWord is case-insensitive and rejects non-words', () => {
    const word = ANSWERS[0];
    expect(isValidWord(word)).toBe(true);
    expect(isValidWord(word.toUpperCase())).toBe(true);
    expect(isValidWord('zzzzz')).toBe(false);
    expect(isValidWord('qqqqq')).toBe(false);
  });
});

describe('challenge seeding', () => {
  it('the same code always yields the same 3 words', () => {
    const a = getWordQuestChallengeWords('daily-20260813');
    const b = getWordQuestChallengeWords('daily-20260813');
    expect(a).toEqual(b);
  });

  it('is case-insensitive (matches makeChallengeRand semantics)', () => {
    const lower = getWordQuestChallengeWords('abcdef');
    const upper = getWordQuestChallengeWords('ABCDEF');
    expect(lower).toEqual(upper);
  });

  it('differs across codes', () => {
    const a = getWordQuestChallengeWords('code01');
    const b = getWordQuestChallengeWords('code02');
    expect(a).not.toEqual(b);
  });

  it('always returns exactly 3 distinct words', () => {
    const codes = ['daily-20260101', 'daily-20260601', 'friend1', 'zz9988', 'aa1122'];
    for (const code of codes) {
      const words = getWordQuestChallengeWords(code);
      expect(words).toHaveLength(3);
      expect(new Set(words).size).toBe(3);
      for (const word of words) {
        expect(ANSWERS).toContain(word);
      }
    }
  });

  it('round 1 is always drawn from the common (first-150) slice of ANSWERS', () => {
    const commonSlice = new Set(ANSWERS.slice(0, COMMON_SLICE_SIZE));
    const codes = ['daily-20260101', 'daily-20260228', 'friend1', 'zz9988', 'qq1122', 'mm5566'];
    for (const code of codes) {
      const [round1] = getWordQuestChallengeWords(code);
      expect(commonSlice.has(round1)).toBe(true);
    }
  });

  it('matches the shared makeChallengeRand seeding convention (gameId-salted)', () => {
    // Sanity check that the rand stream really is salted with the game id,
    // by confirming it diverges from the bare-code stream used elsewhere.
    const salted = makeChallengeRand('shared-code', 'word-quest');
    const bare = makeChallengeRand('shared-code');
    expect(salted()).not.toBe(bare());
  });
});

describe('scoreRound', () => {
  it('scores a solve using the SOLVE_SCORE table, indexed by guesses used', () => {
    const zeroRow: BestRowStats = { greens: 0, yellows: 0 };
    for (let guesses = 1; guesses <= 6; guesses++) {
      expect(scoreRound(guesses, zeroRow)).toBe(SOLVE_SCORE[guesses - 1]);
    }
  });

  it('gives partial credit for a failed round, from the best row', () => {
    // 2 greens + 1 yellow -> 0.3*2 + 0.15*1 = 0.75
    expect(scoreRound(null, { greens: 2, yellows: 1 })).toBeCloseTo(0.75, 5);
    // 0 greens, 0 yellows -> 0
    expect(scoreRound(null, { greens: 0, yellows: 0 })).toBe(0);
  });

  it('caps a failed round at FAIL_SCORE_CAP even with a near-perfect best row', () => {
    // 4 greens + 1 yellow -> 0.3*4 + 0.15*1 = 1.35, well under the cap
    expect(scoreRound(null, { greens: 4, yellows: 1 })).toBeCloseTo(1.35, 5);
    // A hypothetical 5 greens (shouldn't happen for a genuine failure, but
    // the clamp must hold regardless): 0.3*5 = 1.5, still under the cap.
    expect(scoreRound(null, { greens: 5, yellows: 0 })).toBeLessThanOrEqual(FAIL_SCORE_CAP);
    // An extreme input well past what real gameplay could produce still
    // clamps to the cap, proving the clamp — not the arithmetic — is what
    // holds the ceiling.
    expect(scoreRound(null, { greens: 20, yellows: 20 })).toBe(FAIL_SCORE_CAP);
  });

  it('a failed round can never out-score an actual solve', () => {
    const maxFail = scoreRound(null, { greens: 20, yellows: 20 });
    const worstSolve = SOLVE_SCORE[SOLVE_SCORE.length - 1];
    expect(maxFail).toBeLessThan(worstSolve);
  });
});

describe('bestRowStats', () => {
  it('picks the row with the most greens (weighted above yellows)', () => {
    const rows: TileState[][] = [
      ['present', 'present', 'present', 'absent', 'absent'], // 0 green, 3 yellow
      ['correct', 'correct', 'absent', 'absent', 'absent'], // 2 green, 0 yellow
    ];
    expect(bestRowStats(rows)).toEqual({ greens: 2, yellows: 0 });
  });

  it('returns zeros for no rows', () => {
    expect(bestRowStats([])).toEqual({ greens: 0, yellows: 0 });
  });
});
