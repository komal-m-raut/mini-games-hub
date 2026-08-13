import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { GAME_REGISTRY } from '@/lib/gameRegistry';
import { Difficulty } from '@/types/game';
import { formatScore, round2 } from '@/utils/scoring';
import { BLOCK_DIFFICULTY, GAME_ID, TARGET_COLOR, scoreGuess } from '@/games/block-count/constants';
import { SWEEP_GRACE, blockXAt, makeSweep, sweepCompletionMs } from '@/games/block-count/sweep';
import { getBlockChallengeRounds } from '@/games/block-count/challenge';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Deterministic 0–1 sequence, so generation tests don't depend on Math.random. */
function seededRand(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

describe('BLOCK_DIFFICULTY matches the spec exactly', () => {
  it('escalates red count, decoy pressure and sweep speed across difficulties', () => {
    const { easy, medium, hard } = BLOCK_DIFFICULTY;
    expect(easy.minRed).toBe(6);
    expect(easy.maxRed).toBe(10);
    expect(medium.minRed).toBe(8);
    expect(medium.maxRed).toBe(14);
    expect(hard.minRed).toBe(10);
    expect(hard.maxRed).toBe(18);

    expect(easy.decoyMultiplier).toBe(1.5);
    expect(medium.decoyMultiplier).toBe(2);
    expect(hard.decoyMultiplier).toBe(2.5);

    expect(easy.sweepMs).toBe(5200);
    expect(medium.sweepMs).toBe(4600);
    expect(hard.sweepMs).toBe(3800);
    expect(easy.sweepMs).toBeGreaterThan(medium.sweepMs);
    expect(medium.sweepMs).toBeGreaterThan(hard.sweepMs);

    expect([easy.minSize, easy.maxSize]).toEqual([22, 34]);
    expect([medium.minSize, medium.maxSize]).toEqual([18, 30]);
    expect([hard.minSize, hard.maxSize]).toEqual([16, 26]);
  });

  it('never lets a decoy palette contain the target red hex', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(BLOCK_DIFFICULTY[difficulty].decoyColors).not.toContain(TARGET_COLOR);
    }
    expect(TARGET_COLOR).toBe('#EF4444');
  });

  it('escalates the decoy palette rather than swapping it out', () => {
    const { easy, medium, hard } = BLOCK_DIFFICULTY;
    for (const color of easy.decoyColors) expect(medium.decoyColors).toContain(color);
    for (const color of medium.decoyColors) expect(hard.decoyColors).toContain(color);
    expect(hard.decoyColors.length).toBeGreaterThan(medium.decoyColors.length);
    expect(medium.decoyColors.length).toBeGreaterThan(easy.decoyColors.length);
  });

  it('only Hard allows clustering/overlap and uses the tightest vertical band', () => {
    const { easy, medium, hard } = BLOCK_DIFFICULTY;
    expect(easy.allowOverlap).toBe(false);
    expect(medium.allowOverlap).toBe(false);
    expect(hard.allowOverlap).toBe(true);

    const bandWidth = (cfg: { ySpread: [number, number] }) => cfg.ySpread[1] - cfg.ySpread[0];
    expect(bandWidth(hard)).toBeLessThan(bandWidth(medium));
    expect(bandWidth(medium)).toBeLessThan(bandWidth(easy));
  });
});

describe('makeSweep', () => {
  it('is a pure, deterministic function of the RNG it is given', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(makeSweep(difficulty, seededRand(99))).toEqual(makeSweep(difficulty, seededRand(99)));
    }
  });

  it('keeps the red count within the difficulty range and matching actualCount', () => {
    const rand = seededRand(1234);
    for (let i = 0; i < 300; i++) {
      for (const difficulty of DIFFICULTIES) {
        const cfg = BLOCK_DIFFICULTY[difficulty];
        const sweep = makeSweep(difficulty, rand);
        const redBlocks = sweep.blocks.filter((b) => b.isTarget);

        expect(redBlocks.length).toBe(sweep.actualCount);
        expect(sweep.actualCount).toBeGreaterThanOrEqual(cfg.minRed);
        expect(sweep.actualCount).toBeLessThanOrEqual(cfg.maxRed);

        // Every target is drawn in the target red; every decoy is drawn
        // from that difficulty's decoy palette, never the target red.
        for (const block of redBlocks) expect(block.color).toBe(TARGET_COLOR);
        for (const block of sweep.blocks.filter((b) => !b.isTarget)) {
          expect(cfg.decoyColors).toContain(block.color);
        }
      }
    }
  });

  it('sizes every block within the difficulty range', () => {
    const rand = seededRand(555);
    for (const difficulty of DIFFICULTIES) {
      const cfg = BLOCK_DIFFICULTY[difficulty];
      const sweep = makeSweep(difficulty, rand);
      for (const block of sweep.blocks) {
        expect(block.size).toBeGreaterThanOrEqual(cfg.minSize);
        expect(block.size).toBeLessThanOrEqual(cfg.maxSize);
        expect(block.y).toBeGreaterThanOrEqual(cfg.ySpread[0]);
        expect(block.y).toBeLessThanOrEqual(cfg.ySpread[1]);
      }
    }
  });

  it('stages entries over the first 40% of the sweep', () => {
    const rand = seededRand(2468);
    for (const difficulty of DIFFICULTIES) {
      const sweep = makeSweep(difficulty, rand);
      for (const block of sweep.blocks) {
        expect(block.startOffset).toBeGreaterThanOrEqual(0);
        expect(block.startOffset).toBeLessThan(sweep.sweepMs * 0.4);
      }
    }
  });

  it('lets every block fully cross within sweepMs + 15% grace', () => {
    const rand = seededRand(31337);
    for (let i = 0; i < 200; i++) {
      for (const difficulty of DIFFICULTIES) {
        const sweep = makeSweep(difficulty, rand);
        const budget = sweep.sweepMs * SWEEP_GRACE;
        for (const block of sweep.blocks) {
          expect(sweepCompletionMs(block)).toBeLessThanOrEqual(budget);
        }
      }
    }
  });

  it('respects reduced motion: +40% sweepMs, -25% decoy pressure, same red count', () => {
    for (const difficulty of DIFFICULTIES) {
      const cfg = BLOCK_DIFFICULTY[difficulty];
      const normal = makeSweep(difficulty, seededRand(7));
      const reduced = makeSweep(difficulty, seededRand(7), { reducedMotion: true });

      expect(reduced.sweepMs).toBe(Math.round(cfg.sweepMs * 1.4));
      expect(reduced.actualCount).toBe(normal.actualCount);

      const normalDecoys = normal.blocks.length - normal.actualCount;
      const reducedDecoys = reduced.blocks.length - reduced.actualCount;
      expect(reducedDecoys).toBeLessThan(normalDecoys);
      expect(reducedDecoys).toBeCloseTo(Math.round(normal.actualCount * cfg.decoyMultiplier * 0.75), 0);

      // Still moving — reduced motion calms the sweep, it never freezes it.
      expect(reduced.sweepMs).toBeGreaterThan(0);
    }
  });
});

describe('blockXAt', () => {
  it('sits off-stage to the left before a block\'s startOffset', () => {
    const sweep = makeSweep('easy', seededRand(11));
    const block = sweep.blocks[0];
    expect(blockXAt(block, block.startOffset - 1)).toBeLessThan(0);
  });

  it('has fully cleared the right edge by sweepCompletionMs', () => {
    const sweep = makeSweep('medium', seededRand(22));
    for (const block of sweep.blocks) {
      const completion = sweepCompletionMs(block);
      // At entry the block sits just off the left edge (negative fraction);
      // by its own completion time it has crossed past the right edge (>1).
      expect(blockXAt(block, block.startOffset)).toBeLessThan(0);
      expect(blockXAt(block, completion)).toBeGreaterThan(1);
    }
  });

  it('advances monotonically with elapsed time', () => {
    const sweep = makeSweep('hard', seededRand(33));
    const block = sweep.blocks[0];
    let previous = blockXAt(block, 0);
    for (let t = 100; t <= sweep.sweepMs * SWEEP_GRACE; t += 100) {
      const x = blockXAt(block, t);
      expect(x).toBeGreaterThan(previous);
      previous = x;
    }
  });
});

describe('getBlockChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getBlockChallengeRounds('abc123')).toEqual(getBlockChallengeRounds('abc123'));
    expect(getBlockChallengeRounds('ABC123')).toEqual(getBlockChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getBlockChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('gives different codes different sweeps', () => {
    expect(getBlockChallengeRounds('aaaaaa')).not.toEqual(getBlockChallengeRounds('bbbbbb'));
  });

  it('keeps every seeded round\'s red count within its difficulty range', () => {
    for (let i = 0; i < 100; i++) {
      for (const round of getBlockChallengeRounds(`fuzz-${i}`)) {
        const cfg = BLOCK_DIFFICULTY[round.difficulty];
        expect(round.sweep.actualCount).toBeGreaterThanOrEqual(cfg.minRed);
        expect(round.sweep.actualCount).toBeLessThanOrEqual(cfg.maxRed);
      }
    }
  });

  it('threads reduced motion through without changing the difficulty sequence', () => {
    const normal = getBlockChallengeRounds('reduced-motion-code');
    const reduced = getBlockChallengeRounds('reduced-motion-code', true);
    expect(reduced.map((r) => r.difficulty)).toEqual(normal.map((r) => r.difficulty));
    for (let i = 0; i < normal.length; i++) {
      expect(reduced[i].sweep.sweepMs).toBeGreaterThan(normal[i].sweep.sweepMs);
    }
  });
});

describe('scoreGuess', () => {
  it('scores an exact guess as a full 10, for any actual count', () => {
    for (const actual of [1, 6, 10, 12, 18, 25]) {
      expect(scoreGuess(actual, actual)).toBe(10);
    }
  });

  it('matches the documented off-by-one example: 12 reds, guess 11, ≈8.25', () => {
    expect(scoreGuess(12, 11)).toBe(8.25);
    expect(scoreGuess(12, 13)).toBe(8.25);
  });

  it('never lets an off-by-one guess round up to a perfect 10', () => {
    for (let actual = 1; actual <= 18; actual++) {
      expect(scoreGuess(actual, actual + 1)).toBeLessThan(9);
      if (actual > 1) expect(scoreGuess(actual, actual - 1)).toBeLessThan(9);
    }
  });

  it('guards against a zero actual count instead of dividing by zero', () => {
    expect(scoreGuess(0, 5)).toBe(0);
    expect(scoreGuess(0, 1)).toBe(0);
    expect(Number.isFinite(scoreGuess(0, 5))).toBe(true);
    // Exact-match still takes priority over the guard for the degenerate 0/0 case.
    expect(scoreGuess(0, 0)).toBe(10);
  });

  it('clamps at 0 for wild over- or under-guesses', () => {
    expect(scoreGuess(6, 100)).toBe(0);
    expect(scoreGuess(20, 0)).toBe(0);
    expect(scoreGuess(10, 1000)).toBe(0);
  });

  it('decreases monotonically as the guess drifts away from the actual count', () => {
    const actual = 14;
    let previous = scoreGuess(actual, actual);
    for (let guess = actual + 1; guess <= actual + 20; guess++) {
      const score = scoreGuess(actual, guess);
      expect(score).toBeLessThanOrEqual(previous);
      previous = score;
    }
  });

  it('keeps every score in [0, 10] as an exact 2dp value', () => {
    const rand = seededRand(2026);
    for (let i = 0; i < 2000; i++) {
      const actual = 1 + Math.floor(rand() * 30);
      const guess = Math.floor(rand() * 40);
      const score = scoreGuess(actual, guess);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
      expect(round2(score)).toBe(score);
      expect(formatScore(score)).toMatch(/^\d+(\.\d{2})?$/);
    }
  });

  it('keeps a session total at 2dp after summing several round scores', () => {
    const rand = seededRand(303);
    for (let session = 0; session < 300; session++) {
      const roundScores: number[] = [];
      for (let r = 0; r < 5; r++) {
        const actual = 6 + Math.floor(rand() * 13);
        const guess = Math.max(0, actual + Math.round((rand() - 0.5) * 6));
        roundScores.push(scoreGuess(actual, guess));
      }
      const total = round2(roundScores.reduce((a, b) => a + b, 0));
      expect(formatScore(total)).toMatch(/^\d+(\.\d{2})?$/);
    }
  });
});

describe('GAME_ID', () => {
  it('matches a real, red-accented entry in the game registry', () => {
    expect(GAME_ID).toBe('block-count');
    const entry = GAME_REGISTRY.find((g) => g.id === GAME_ID);
    expect(entry).toBeDefined();
    expect(entry?.accent).toBe(TARGET_COLOR);
  });
});
