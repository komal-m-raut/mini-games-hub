'use client';

import { Flame } from 'lucide-react';
import { StreakState } from '@/lib/streak';

interface StreakFlameProps {
  streak: StreakState;
  size?: 'sm' | 'lg';
}

/** Flame icon + current/best streak, lit orange while a streak is active. */
export function StreakFlame({ streak, size = 'lg' }: StreakFlameProps) {
  const lit = streak.current > 0;
  const iconClass = size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-3">
      <Flame
        className={iconClass}
        style={{ color: lit ? '#F97316' : 'var(--color-ink-4)' }}
        fill={lit ? '#F97316' : 'none'}
        strokeWidth={1.5}
      />
      <div>
        <p className="font-score text-xl leading-none">
          {streak.current}
          <span className="text-ink-3 text-sm"> day{streak.current === 1 ? '' : 's'}</span>
        </p>
        <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide mt-0.5">
          Best: {streak.best}
        </p>
      </div>
    </div>
  );
}
