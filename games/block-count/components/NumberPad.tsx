'use client';

import { Check, Delete } from 'lucide-react';

interface NumberPadProps {
  /** Digits typed so far, e.g. "" | "7" | "14". */
  value: string;
  accent: string;
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
}

const DIGIT_ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/**
 * 3×4 digit pad for typing the red-block count: rows of 1–9, then
 * backspace/0/submit. Plain buttons on the shared `.btn` token layer (same
 * classes NeonButton itself renders) so no new styling is introduced —
 * keyboard digits/Backspace/Enter are wired by the game orchestrator, which
 * owns the window-level listener the same way TimingTapGame does for Space.
 */
export function NumberPad({ value, accent, disabled, onDigit, onBackspace, onSubmit }: NumberPadProps) {
  const accentStyle = { '--btn-accent': accent } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-xs">
      <p
        className="font-score text-5xl tabular-nums min-h-[3.5rem] leading-none"
        style={{ color: accent }}
        aria-live="polite"
      >
        {value || '—'}
      </p>

      <div className="grid grid-cols-3 gap-2 w-full">
        {DIGIT_ROWS.flat().map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => onDigit(digit)}
            disabled={disabled}
            aria-label={`Digit ${digit}`}
            className="btn btn-secondary font-score text-xl"
          >
            {digit}
          </button>
        ))}

        <button
          type="button"
          onClick={onBackspace}
          disabled={disabled || !value}
          aria-label="Backspace"
          className="btn btn-secondary"
        >
          <Delete strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => onDigit('0')}
          disabled={disabled}
          aria-label="Digit 0"
          className="btn btn-secondary font-score text-xl"
        >
          0
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value}
          aria-label="Submit guess"
          className="btn btn-primary"
          style={accentStyle}
        >
          <Check strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
