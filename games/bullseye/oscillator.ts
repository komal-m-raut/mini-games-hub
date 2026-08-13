/**
 * Bullseye's aim-line motion — a sine oscillator sampled purely from elapsed
 * time, so a frame can be read at any instant without replaying every frame
 * before it (unlike Timing Tap's per-frame `stepPosition`, which mutates a
 * running position). That makes the whole thing trivially testable and lets
 * the hook's rAF loop stay a dumb sampler: read `performance.now()`, hand the
 * elapsed ms to `positionAt`, done.
 *
 * Position swings 0–100 (board-percent, centre at 50) — one full swing
 * (centre → extreme → centre → other extreme → centre) every `1 /
 * frequencyHz` seconds. A "leg" is one half-swing (centre-to-extreme or
 * extreme-to-centre, Δphase = π); Hard's per-leg drift scales a leg's
 * *duration* via `legSpeedScales` (cycled at every extremum), the same idea
 * as Timing Tap's per-bounce `speedScales` but expressed as a duration
 * multiplier instead of a per-frame speed multiplier, since there's no
 * per-frame stepping here to multiply.
 */

export interface OscillatorConfig {
  /** Full swings per second, before any leg's drift scale. */
  frequencyHz: number;
  /** Radians — where in the cycle `tMs = 0` sits. Seeded per dart. */
  phaseOffset: number;
  /**
   * Per-leg (half-cycle) duration multipliers, cycled at every extremum.
   * `[1]` for Easy/Medium (no drift); Hard draws several from a ±15% band.
   */
  legSpeedScales: number[];
}

const clampPercent = (n: number): number => Math.min(100, Math.max(0, n));

/**
 * Cumulative phase (radians, unbounded — not wrapped to 0–2π) at `tMs`
 * milliseconds. Walks leg-by-leg from t=0 because each leg can have its own
 * duration (Hard's drift); the loop is bounded by real elapsed play time —
 * at Hard's fastest drift a leg is never shorter than
 * `1 / (2·frequencyHz·1.15)` seconds, so even a multi-minute stall resolves
 * in at most a few hundred iterations.
 */
function phaseAt(cfg: OscillatorConfig, tMs: number): number {
  const totalSeconds = Math.max(0, tMs) / 1000;
  const baseLegSeconds = 1 / (2 * cfg.frequencyHz);
  let remaining = totalSeconds;
  let legIndex = 0;
  for (;;) {
    const scale = cfg.legSpeedScales[legIndex % cfg.legSpeedScales.length];
    const legSeconds = baseLegSeconds / scale;
    if (remaining < legSeconds) {
      const fraction = legSeconds === 0 ? 0 : remaining / legSeconds;
      return cfg.phaseOffset + legIndex * Math.PI + fraction * Math.PI;
    }
    remaining -= legSeconds;
    legIndex += 1;
  }
}

/** Continuous position, 0–100, at `tMs` milliseconds since the axis started. */
export function positionAt(cfg: OscillatorConfig, tMs: number): number {
  return clampPercent(50 + 50 * Math.sin(phaseAt(cfg, tMs)));
}

/**
 * Reduced-motion variant: the same underlying phase (so timing/fairness is
 * identical), but quantised to `steps` discrete positions per full 2π cycle
 * instead of sliding continuously — the line jumps between fixed spots
 * rather than sweeping, at the same period.
 */
export function steppedPositionAt(cfg: OscillatorConfig, tMs: number, steps = 12): number {
  const phase = phaseAt(cfg, tMs);
  const stepSize = (2 * Math.PI) / steps;
  const quantized = Math.round(phase / stepSize) * stepSize;
  return clampPercent(50 + 50 * Math.sin(quantized));
}

/**
 * Wall-clock duration (ms) of each of the first `count` legs. Exported for
 * tests (and any caller curious when the next extremum lands) to assert
 * drift changes leg durations without reaching into `phaseAt`'s internals.
 */
export function legDurationsMs(cfg: OscillatorConfig, count: number): number[] {
  const baseLegMs = 1000 / (2 * cfg.frequencyHz);
  return Array.from(
    { length: count },
    (_, i) => baseLegMs / cfg.legSpeedScales[i % cfg.legSpeedScales.length]
  );
}
