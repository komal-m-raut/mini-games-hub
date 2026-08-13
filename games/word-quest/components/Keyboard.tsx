'use client';

import { CornerDownLeft, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENT } from '../constants';
import { KeyboardState } from '../engine';

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'backspace'],
] as const;

const PRESENT_COLOR = '#FBBF24';

interface KeyboardProps {
  keyState: KeyboardState;
  onKey: (key: string) => void;
  disabled?: boolean;
}

/**
 * The on-screen QWERTY keyboard: three letter rows plus Enter/Backspace on
 * the bottom row. Every key is at least 44px tall (the standard touch
 * target minimum) and carries its own `aria-label`, so it's usable with a
 * screen reader as well as a mouse, touch, or the hardware keyboard (which
 * `WordQuestGame` wires up separately to call these same handlers).
 */
export function Keyboard({ keyState, onKey, disabled }: KeyboardProps) {
  return (
    <div
      className="flex flex-col gap-1.5 w-full max-w-[480px] mx-auto select-none"
      role="group"
      aria-label="On-screen keyboard"
    >
      {ROWS.map((row, i) => (
        <div key={i} className="flex justify-center gap-1 sm:gap-1.5">
          {row.map((key) => {
            const isSpecial = key === 'enter' || key === 'backspace';
            const state = isSpecial ? undefined : keyState[key];
            const label = key === 'enter' ? 'Enter' : key === 'backspace' ? 'Backspace' : key.toUpperCase();
            return (
              <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => onKey(key)}
                aria-label={label}
                className={cn(
                  'rounded-lg font-ui text-xs sm:text-sm font-semibold uppercase flex items-center justify-center transition-colors disabled:opacity-50',
                  isSpecial ? 'flex-[1.6] px-1' : 'flex-1'
                )}
                style={{
                  height: 44,
                  minWidth: isSpecial ? 44 : 30,
                  background:
                    state === 'correct'
                      ? ACCENT
                      : state === 'present'
                        ? PRESENT_COLOR
                        : state === 'absent'
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(255,255,255,0.10)',
                  color: state === 'absent' ? 'rgba(255,255,255,0.35)' : '#fff',
                }}
              >
                {key === 'backspace' ? (
                  <Delete className="w-4 h-4" strokeWidth={1.75} />
                ) : key === 'enter' ? (
                  <CornerDownLeft className="w-4 h-4" strokeWidth={1.75} />
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
