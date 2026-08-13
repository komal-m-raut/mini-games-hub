'use client';

import { Check, Delete } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  canBackspace: boolean;
  canSubmit: boolean;
  /** True whenever the game isn't actually accepting typed input right now
   *  (display or the level-up beat) — every key goes inert together. */
  disabled: boolean;
  accent: string;
}

const TOP_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const KEY_CLASS =
  'min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-score text-lg text-ink-1 active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100';

/**
 * The on-screen digit pad: 1–9, then Backspace / 0 / Submit. Every key
 * clears the WCAG 2.5.8 44×44px touch-target minimum and carries its own
 * `aria-label`, since the visible glyph alone (a bare digit, or an icon)
 * isn't enough for a screen reader. Hardware digits/Backspace/Enter are
 * handled separately, by the hook's own keydown listener.
 */
export function NumberPad({
  onDigit,
  onBackspace,
  onSubmit,
  canBackspace,
  canSubmit,
  disabled,
  accent,
}: NumberPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-[280px]" role="group" aria-label="Number pad">
      {TOP_KEYS.map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => onDigit(digit)}
          disabled={disabled}
          aria-label={`Digit ${digit}`}
          className={KEY_CLASS}
        >
          {digit}
        </button>
      ))}

      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled || !canBackspace}
        aria-label="Backspace"
        className={cn(KEY_CLASS, 'flex items-center justify-center')}
      >
        <Delete className="w-5 h-5" strokeWidth={1.5} />
      </button>

      <button
        type="button"
        onClick={() => onDigit('0')}
        disabled={disabled}
        aria-label="Digit 0"
        className={KEY_CLASS}
      >
        0
      </button>

      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !canSubmit}
        aria-label="Submit"
        className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:pointer-events-none disabled:active:scale-100"
        style={{ background: `${accent}25`, border: `1px solid ${accent}80`, color: accent }}
      >
        <Check className="w-5 h-5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
