'use client';

import { cn } from '@/lib/utils';

interface DigitSlotsProps {
  /** Total slots to render — the number's digit length. */
  length: number;
  /** Digits filled so far, left to right. */
  digits: string;
  accent: string;
  /**
   * When set, colours filled slots green before this index (the matched
   * prefix) and red from it onward (the miss) — used by the result screen.
   * Left unset during normal input, where filled slots just take the
   * difficulty's accent colour.
   */
  diffIndex?: number;
  size?: 'sm' | 'md';
}

/**
 * A row of digit slots: empty slots show as faint outline dots, filled
 * slots show the actual digit inside a glowing circle — visible, not
 * masked, so the player can always see exactly what they've typed.
 */
export function DigitSlots({ length, digits, accent, diffIndex, size = 'md' }: DigitSlotsProps) {
  const dim = size === 'sm' ? 'w-8 h-8 text-sm' : 'w-10 h-10 sm:w-11 sm:h-11 text-lg sm:text-xl';

  return (
    <div
      className="flex flex-wrap justify-center gap-2"
      role="text"
      aria-label={digits ? `Entered: ${digits.split('').join(' ')}` : 'No digits entered yet'}
    >
      {Array.from({ length }, (_, i) => {
        const filled = i < digits.length;
        const isMatch = diffIndex !== undefined && i < diffIndex;
        const isMiss = diffIndex !== undefined && i >= diffIndex;
        const color = isMatch ? '#22C55E' : isMiss ? '#EF4444' : accent;

        return (
          <div
            key={i}
            aria-hidden="true"
            className={cn(
              'rounded-full flex items-center justify-center font-score font-semibold shrink-0 border transition-colors duration-150',
              dim,
              !filled && 'border-white/15 text-white/20'
            )}
            style={
              filled
                ? {
                    background: `${color}22`,
                    borderColor: `${color}80`,
                    color,
                    boxShadow: `0 0 10px ${color}40`,
                  }
                : undefined
            }
          >
            {filled ? digits[i] : '•'}
          </div>
        );
      })}
    </div>
  );
}
