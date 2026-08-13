/**
 * Indicator motion for Timing Tap — pure maths, no React and no framer-motion,
 * so the sweep can be unit-tested without a DOM (same reasoning as the water
 * curves in `lib/sounds.ts` and the path generator in Memory Path).
 */

export interface RoundConfig {
  /** Bar-percent per second, before the current leg's speed scale. */
  speed: number;
  zoneHalfWidth: number;
  direction: 1 | -1;
  /** Cycled at every bounce (Hard's per-leg drift; all-1s elsewhere). */
  speedScales: number[];
  legIndex: number;
}

/**
 * Advances `position` by one frame's worth of travel and bounces at 0/100 by
 * reflecting the overshoot (`-next` / `200 - next`) instead of clamping, so
 * the indicator's effective speed stays constant through the bounce rather
 * than briefly stalling at the edge. Mutates `cfg` in place (direction/leg
 * index) since it's a hot per-frame path backed by a ref, not React state.
 *
 * Callers must clamp `dt` (see MAX_DT): one frame may never carry more than a
 * bar's width of travel, or the reflection below would itself overshoot.
 */
export function stepPosition(cfg: RoundConfig, position: number, dt: number): number {
  const scale = cfg.speedScales[cfg.legIndex % cfg.speedScales.length];
  let next = position + cfg.direction * cfg.speed * scale * dt;
  if (next < 0) {
    next = -next;
    cfg.direction = 1;
    cfg.legIndex += 1;
  } else if (next > 100) {
    next = 200 - next;
    cfg.direction = -1;
    cfg.legIndex += 1;
  }
  return next;
}
