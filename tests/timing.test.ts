import { describe, expect, it } from 'vitest';

/**
 * H12 replaces "decrement remaining time by 1 per tick" countdowns (which
 * lose ~1s per *callback firing*, so a throttled/backgrounded tab that only
 * gets one callback every few seconds nearly freezes) with a deadline
 * computed once up front, then re-derived from `performance.now()` on every
 * tick — see `useBalloonGame.ts`'s `observeDeadlineRef`/`inflateDeadlineRef`
 * and the equivalent in `usePourGame.ts`.
 *
 * The formula itself isn't exported (it's inlined at each call site), so
 * these tests pin down its two properties directly: it reports the correct
 * remaining time regardless of how many ticks actually fired, and it clamps
 * a per-tick delta so a single coalesced tick can't jump growth/pour
 * progress by several seconds at once.
 */

/** Mirrors `Math.ceil((deadline - now) / 1000)` used by both countdowns. */
function remainingSeconds(deadline: number, now: number): number {
  return Math.ceil((deadline - now) / 1000);
}

/** Mirrors the per-tick dt clamp used by the growth/pour loops. */
function clampedDt(now: number, lastTick: number, tickMs: number): number {
  return Math.min((now - lastTick) / 1000, (tickMs / 1000) * 4);
}

describe('deadline-based countdown math (H12)', () => {
  it('reports the full duration at t=0', () => {
    const start = 1_000_000;
    const deadline = start + 5000; // 5s countdown
    expect(remainingSeconds(deadline, start)).toBe(5);
  });

  it('decrements normally under a healthy 1s tick cadence', () => {
    const start = 0;
    const deadline = start + 5000;
    const ticks = [1000, 2000, 3000, 4000, 5000].map((now) => remainingSeconds(deadline, now));
    expect(ticks).toEqual([4, 3, 2, 1, 0]);
  });

  it('is correct even if only a single tick fires after a long throttle', () => {
    // A tab backgrounded for the whole countdown gets exactly one tick when
    // it resumes — with a fixed "-1 per tick" model this would report 4s
    // left (only one decrement happened); deadline-based math reports 0.
    const start = 0;
    const deadline = start + 5000;
    const resumeAt = 5200; // throttled tab wakes up slightly after the deadline
    expect(remainingSeconds(deadline, resumeAt)).toBeLessThanOrEqual(0);
  });

  it('is immune to tick count — same deadline, arbitrary intermediate ticks, same final answer', () => {
    const start = 0;
    const deadline = start + 10_000;
    const manyTicksResult = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => remainingSeconds(deadline, s * 1000));
    const oneTickResult = remainingSeconds(deadline, 10_000);
    expect(manyTicksResult[manyTicksResult.length - 1]).toBe(oneTickResult);
  });

  it('never goes negative-then-positive (monotonically reaches 0 and stays there)', () => {
    const start = 0;
    const deadline = start + 3000;
    for (const now of [3000, 3001, 5000, 60_000]) {
      expect(remainingSeconds(deadline, now)).toBeLessThanOrEqual(0);
    }
  });
});

describe('per-tick dt clamp (H12)', () => {
  const TICK_MS = 16;

  it('passes through a normal tick delta unclamped', () => {
    expect(clampedDt(16, 0, TICK_MS)).toBeCloseTo(0.016, 5);
  });

  it('clamps a coalesced multi-second delta after a backgrounded tab resumes', () => {
    const last = 0;
    const now = 8000; // 8 real seconds elapsed in one callback firing
    const dt = clampedDt(now, last, TICK_MS);
    // Clamp is 4 ticks worth: (16/1000) * 4 = 0.064s
    expect(dt).toBeCloseTo(0.064, 5);
    expect(dt).toBeLessThan((now - last) / 1000);
  });

  it('clamp ceiling scales with the configured tick interval', () => {
    const dt = clampedDt(1000, 0, TICK_MS);
    expect(dt).toBe((TICK_MS / 1000) * 4);
  });
});
