'use client';

import { useId } from 'react';
import { levelForXp, xpIntoLevel } from '@/lib/progress';

interface LevelRingProps {
  xp: number;
  size?: number;
}

/** SVG ring showing progress into the current level, with the level number
 *  at its center. */
export function LevelRing({ xp, size = 96 }: LevelRingProps) {
  const gradientId = useId();
  const level = levelForXp(xp);
  const { into, needed } = xpIntoLevel(xp);
  const pct = needed > 0 ? Math.min(1, into / needed) : 1;

  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none">Lvl</p>
          <p className="font-score text-2xl leading-tight">{level}</p>
        </div>
      </div>
    </div>
  );
}
