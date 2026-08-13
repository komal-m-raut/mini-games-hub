import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '@/lib/challenge';
import { getPourChallengeRounds } from '@/games/perfect-pour/challenge';
import { MAX_TARGET_FILL, MIN_TARGET_FILL } from '@/games/perfect-pour/constants';
import { getPathChallengeRounds } from '@/games/memory-path/challenge';
import { PATH_DIFFICULTY } from '@/games/memory-path/constants';
import { cellKey, isAdjacent } from '@/games/memory-path/pathGen';
import { getTapChallengeRounds } from '@/games/timing-tap/challenge';
import {
  MAX_START_OFFSET,
  MIN_START_OFFSET,
  SPEED_SCALE_COUNT,
  TAP_DIFFICULTY,
} from '@/games/timing-tap/constants';

/**
 * Challenge fairness for every game rests on "same code → identical rounds for
 * everyone". These guard the per-game seeded generators the same way the
 * balloon golden values do.
 */

describe('getPourChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getPourChallengeRounds('abc123')).toEqual(getPourChallengeRounds('abc123'));
    expect(getPourChallengeRounds('ABC123')).toEqual(getPourChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getPourChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('keeps every target within the pourable range', () => {
    for (let i = 0; i < 200; i++) {
      for (const round of getPourChallengeRounds(`fuzz-${i}`)) {
        expect(round.targetFill).toBeGreaterThanOrEqual(MIN_TARGET_FILL);
        expect(round.targetFill).toBeLessThanOrEqual(MAX_TARGET_FILL);
      }
    }
  });

  it('differentiates codes', () => {
    expect(getPourChallengeRounds('aaaaaa')).not.toEqual(getPourChallengeRounds('bbbbbb'));
  });
});

describe('getPathChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getPathChallengeRounds('abc123')).toEqual(getPathChallengeRounds('abc123'));
    expect(getPathChallengeRounds('ABC123')).toEqual(getPathChallengeRounds('abc123'));
  });

  it('produces a valid path per difficulty preset', () => {
    for (const round of getPathChallengeRounds('any-code')) {
      const cfg = PATH_DIFFICULTY[round.difficulty];
      expect(round.path).toHaveLength(cfg.pathLength);
      // No revisits
      expect(new Set(round.path.map(cellKey)).size).toBe(round.path.length);
      // Orthogonally adjacent steps, inside the grid
      for (let i = 0; i < round.path.length; i++) {
        const { r, c } = round.path[i];
        expect(r).toBeGreaterThanOrEqual(0);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThan(cfg.size);
        expect(c).toBeLessThan(cfg.size);
        if (i > 0) expect(isAdjacent(round.path[i - 1], round.path[i])).toBe(true);
      }
    }
  });

  it('differentiates codes', () => {
    expect(getPathChallengeRounds('aaaaaa')).not.toEqual(getPathChallengeRounds('bbbbbb'));
  });
});

describe('getTapChallengeRounds', () => {
  it('is deterministic and case-insensitive for a code', () => {
    expect(getTapChallengeRounds('abc123')).toEqual(getTapChallengeRounds('abc123'));
    expect(getTapChallengeRounds('ABC123')).toEqual(getTapChallengeRounds('abc123'));
  });

  it('follows the easy → medium → hard sequence', () => {
    expect(getTapChallengeRounds('any-code').map((r) => r.difficulty)).toEqual(
      CHALLENGE_DIFFICULTIES
    );
  });

  it('differentiates codes', () => {
    expect(getTapChallengeRounds('aaaaaa')).not.toEqual(getTapChallengeRounds('bbbbbb'));
  });

  it('keeps every start position on the bar and outside that round\'s Perfect Zone, ' +
    'with the right number of in-range speed scales', () => {
    for (let i = 0; i < 200; i++) {
      for (const round of getTapChallengeRounds(`fuzz-${i}`)) {
        const cfg = TAP_DIFFICULTY[round.difficulty];

        expect(round.startPosition).toBeGreaterThanOrEqual(MIN_START_OFFSET);
        expect(round.startPosition).toBeLessThanOrEqual(MAX_START_OFFSET);
        // A round that starts inside the Perfect Zone would hand out a free
        // 100 the instant the player taps — must never happen.
        expect(Math.abs(round.startPosition - 50)).toBeGreaterThan(cfg.zoneHalfWidth);

        expect(round.speedScales).toHaveLength(SPEED_SCALE_COUNT);
        for (const scale of round.speedScales) {
          expect(scale).toBeGreaterThanOrEqual(1 - cfg.speedJitter);
          expect(scale).toBeLessThanOrEqual(1 + cfg.speedJitter);
        }

        expect([1, -1]).toContain(round.direction);
      }
    }
  });
});
