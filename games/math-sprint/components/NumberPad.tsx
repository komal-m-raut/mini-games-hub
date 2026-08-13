'use client';

import { Check, Delete, SkipForward } from 'lucide-react';

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  onSkip: () => void;
  submitDisabled: boolean;
  accent: string;
}

const DIGIT_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/**
 * On-screen 3×4 keypad: digits 1–9, then 0 / backspace / submit on the last
 * row, plus a separate Skip button. `.btn`'s default height is the site's
 * 44px touch-target floor (see `--btn-h` in globals.css), so every cell here
 * already clears the "large buttons, min 44px" requirement without an extra
 * size override. Hardware digits/Backspace/Enter are wired at the game
 * component level so this stays a pure input surface.
 */
export function NumberPad({
  onDigit,
  onBackspace,
  onSubmit,
  onSkip,
  submitDisabled,
  accent,
}: NumberPadProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-xs">
      <div className="grid grid-cols-3 gap-2 w-full">
        {DIGIT_ROWS.flat().map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => onDigit(digit)}
            aria-label={`Digit ${digit}`}
            className="btn btn-secondary text-xl font-display"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onDigit('0')}
          aria-label="Digit 0"
          className="btn btn-secondary text-xl font-display"
        >
          0
        </button>
        <button
          type="button"
          onClick={onBackspace}
          aria-label="Backspace"
          className="btn btn-secondary"
        >
          <Delete strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitDisabled}
          aria-label="Submit answer"
          className="btn btn-primary"
          style={{ '--btn-accent': accent } as React.CSSProperties}
        >
          <Check strokeWidth={2.5} />
        </button>
      </div>

      <button type="button" onClick={onSkip} aria-label="Skip this question" className="btn btn-sm btn-ghost">
        <SkipForward strokeWidth={2} className="w-4 h-4" />
        Skip
      </button>
    </div>
  );
}
