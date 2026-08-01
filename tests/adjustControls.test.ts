import { describe, expect, it } from 'vitest';
import { calculateAccuracy, getRating } from '@/utils/accuracy';
import { calculateScore } from '@/utils/scoring';
import { BALLOON_ADJUST_STEP, adjustBalloonUnits } from '@/games/balloon-match/useBalloonGame';
import { POUR_ADJUST_STEP, adjustPourFill } from '@/games/perfect-pour/usePourGame';
import { getPourAccuracy, getPourRating } from '@/games/perfect-pour/constants';

/**
 * U8 — fine-adjust controllers. `adjustBalloonUnits`/`adjustPourFill` are the
 * pure step+clamp functions behind the −/+ buttons; `lockIn` (in each
 * game's hook) is the single scoring path whether the player released the
 * hold at the final value or nudged there afterwards. These tests pin down
 * the step sizes, the clamp at both range bounds, and that scoring a value
 * reached via adjustment matches scoring the same value reached directly.
 */

describe('difficulty-keyed step sizes (U8)', () => {
  it('Balloon Match steps down as difficulty increases: 1 / 0.5 / 0.25 units', () => {
    expect(BALLOON_ADJUST_STEP.easy).toBe(1);
    expect(BALLOON_ADJUST_STEP.medium).toBe(0.5);
    expect(BALLOON_ADJUST_STEP.hard).toBe(0.25);
  });

  it('Perfect Pour steps down as difficulty increases: 1 / 0.5 / 0.25 percentage points', () => {
    expect(POUR_ADJUST_STEP.easy).toBe(1);
    expect(POUR_ADJUST_STEP.medium).toBe(0.5);
    expect(POUR_ADJUST_STEP.hard).toBe(0.25);
  });
});

describe('adjustBalloonUnits — clamps to the 0–100 range the hold produces', () => {
  it('steps up normally within range', () => {
    expect(adjustBalloonUnits(50, 1)).toBe(51);
    expect(adjustBalloonUnits(50, 0.25)).toBe(50.25);
  });

  it('steps down normally within range', () => {
    expect(adjustBalloonUnits(50, -1)).toBe(49);
  });

  it('clamps at the upper bound (100)', () => {
    expect(adjustBalloonUnits(99.5, 1)).toBe(100);
    expect(adjustBalloonUnits(100, 0.25)).toBe(100);
  });

  it('clamps at the lower bound (0)', () => {
    expect(adjustBalloonUnits(0.5, -1)).toBe(0);
    expect(adjustBalloonUnits(0, -0.25)).toBe(0);
  });
});

describe('adjustPourFill — clamps to the 0–100 range the pour produces', () => {
  it('steps up normally within range', () => {
    expect(adjustPourFill(50, 1)).toBe(51);
    expect(adjustPourFill(50, 0.5)).toBe(50.5);
  });

  it('steps down normally within range', () => {
    expect(adjustPourFill(50, -1)).toBe(49);
  });

  it('clamps at the upper bound (100)', () => {
    expect(adjustPourFill(99.5, 1)).toBe(100);
    expect(adjustPourFill(100, 0.25)).toBe(100);
  });

  it('clamps at the lower bound (0)', () => {
    expect(adjustPourFill(0.5, -1)).toBe(0);
    expect(adjustPourFill(0, -0.25)).toBe(0);
  });
});

describe('adjust-then-lock scores identically to holding to that value directly (Balloon Match)', () => {
  it('matches for a value reached via several adjustment steps', () => {
    const target = 60;
    const releasedAt = 55; // where the hold happened to land
    const step = BALLOON_ADJUST_STEP.medium; // 0.5

    // Nudge up from the released value to the target, one step at a time —
    // exactly what repeatedly clicking "+" does.
    let adjusted = releasedAt;
    for (let i = 0; i < (target - releasedAt) / step; i++) {
      adjusted = adjustBalloonUnits(adjusted, step);
    }
    expect(adjusted).toBe(target);

    const scoreFromAdjust = calculateScore(calculateAccuracy(target, adjusted));
    const scoreFromDirectHold = calculateScore(calculateAccuracy(target, target));
    const ratingFromAdjust = getRating(calculateAccuracy(target, adjusted));
    const ratingFromDirectHold = getRating(calculateAccuracy(target, target));

    expect(scoreFromAdjust).toBe(scoreFromDirectHold);
    expect(ratingFromAdjust).toBe(ratingFromDirectHold);
  });

  it('matches for a value a hold could have landed on exactly, without any adjustment', () => {
    // A round where the player never touches −/+ should score identically
    // to one that does but nets to the same final value (zero net nudges).
    const target = 42;
    const held = 42;
    let adjusted = held;
    adjusted = adjustBalloonUnits(adjusted, 1);
    adjusted = adjustBalloonUnits(adjusted, -1);
    expect(adjusted).toBe(held);
    expect(calculateScore(calculateAccuracy(target, adjusted))).toBe(
      calculateScore(calculateAccuracy(target, held))
    );
  });
});

describe('adjust-then-lock scores identically to holding to that value directly (Perfect Pour)', () => {
  it('matches for a value reached via several adjustment steps', () => {
    const target = 70;
    const releasedAt = 68.5;
    const step = POUR_ADJUST_STEP.hard; // 0.25

    let adjusted = releasedAt;
    for (let i = 0; i < (target - releasedAt) / step; i++) {
      adjusted = adjustPourFill(adjusted, step);
    }
    expect(adjusted).toBe(target);

    const scoreFromAdjust = calculateScore(getPourAccuracy(target, adjusted));
    const scoreFromDirectPour = calculateScore(getPourAccuracy(target, target));
    const ratingFromAdjust = getPourRating(scoreFromAdjust);
    const ratingFromDirectPour = getPourRating(scoreFromDirectPour);

    expect(scoreFromAdjust).toBe(scoreFromDirectPour);
    expect(ratingFromAdjust).toBe(ratingFromDirectPour);
  });
});
