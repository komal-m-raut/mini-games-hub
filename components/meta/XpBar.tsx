'use client';

import { xpIntoLevel } from '@/lib/progress';

interface XpBarProps {
  xp: number;
  level: number;
}

/** Horizontal progress bar for XP into the current level. */
export function XpBar({ xp, level }: XpBarProps) {
  const { into, needed } = xpIntoLevel(xp);
  const pct = needed > 0 ? Math.min(100, Math.round((into / needed) * 100)) : 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-ui text-xs text-ink-3 uppercase tracking-widest">Level {level}</span>
        <span className="font-score text-xs text-ink-3">
          {into} / {needed} XP
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #7C3AED, #22D3EE)' }}
        />
      </div>
    </div>
  );
}
