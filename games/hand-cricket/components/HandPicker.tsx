'use client';

/** Finger-count accent per throw, 1–6 — purely decorative flourish on top
 *  of the number, which stays the actual label read by screen readers. */
export const FINGER_EMOJI: Record<number, string> = {
  1: '👆',
  2: '✌️',
  3: '🤟',
  4: '🖖',
  5: '🖐️',
  6: '🤙',
};

interface HandPickerProps {
  onPick: (n: number) => void;
  disabled: boolean;
  accent: string;
  /** "Bat" (innings 1) or "Bowl" (innings 2) — read into the button label
   *  so screen reader users know which side of the ball they're throwing. */
  action: 'Bat' | 'Bowl';
}

/**
 * Six big finger-count buttons, 1–6. Real `<button>` elements (not a custom
 * pointer surface) so focus order, Enter/Space activation and disabled
 * state all come for free — the hardware 1–6 keys are wired at the game
 * component level, same pattern as Math Sprint's `NumberPad`.
 */
export function HandPicker({ onPick, disabled, accent, action }: HandPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm" role="group" aria-label={`${action} — pick a number 1 to 6`}>
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          disabled={disabled}
          aria-label={`${action} ${n}`}
          className="btn btn-secondary flex flex-col items-center justify-center gap-0.5 py-3 h-auto"
          style={{ '--btn-accent': accent } as React.CSSProperties}
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            {FINGER_EMOJI[n]}
          </span>
          <span className="font-display text-lg leading-none">{n}</span>
        </button>
      ))}
    </div>
  );
}
