'use client';

import { formatSeconds } from '../constants';

interface DurationCompareProps {
  targetMs: number;
  heldMs: number;
  /** Accent for the "You held" bar — the signed-error colour, so the bar
   *  that actually varies round to round matches the hero number above it. */
  heldColor: string;
}

/**
 * Target vs held, drawn as two slim bars sharing one scale — a ruler, not a
 * pair of stat tiles. The target bar stays a quiet neutral so the held bar
 * (the thing that actually changed) is the one the eye lands on.
 */
export function DurationCompare({ targetMs, heldMs, heldColor }: DurationCompareProps) {
  const max = Math.max(targetMs, heldMs, 1) * 1.08;
  const targetPct = Math.min(100, (targetMs / max) * 100);
  const heldPct = Math.min(100, (heldMs / max) * 100);

  return (
    <div className="w-full max-w-xs flex flex-col gap-3">
      <CompareRow label="Target" valueMs={targetMs} pct={targetPct} color="var(--color-ink-3)" />
      <CompareRow label="You held" valueMs={heldMs} pct={heldPct} color={heldColor} />
    </div>
  );
}

function CompareRow({
  label,
  valueMs,
  pct,
  color,
}: {
  label: string;
  valueMs: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-ui text-xs text-ink-3 uppercase tracking-widest">{label}</span>
        <span className="font-score text-sm text-ink-2">{formatSeconds(valueMs)}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color, transition: 'width 0.3s cubic-bezier(0.2,0,0,1)' }}
        />
      </div>
    </div>
  );
}
