'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Direction } from '../types';

interface ControlsProps {
  accent: string;
  disabled: boolean;
  onMove: (dir: Direction) => void;
}

/** Row/column (1-indexed, CSS grid-area shorthand) each button sits at in
 *  the 3×3 pad — up/left/right/down around an empty centre and empty
 *  corners, which the grid leaves blank on its own since every placed cell
 *  is addressed explicitly (no spacer elements needed). */
const PAD: Array<{ dir: Direction; label: string; icon: React.ReactNode; gridArea: string }> = [
  { dir: 'up', label: 'Move up', icon: <ChevronUp strokeWidth={2.5} />, gridArea: '1 / 2' },
  { dir: 'left', label: 'Move left', icon: <ChevronLeft strokeWidth={2.5} />, gridArea: '2 / 1' },
  { dir: 'right', label: 'Move right', icon: <ChevronRight strokeWidth={2.5} />, gridArea: '2 / 3' },
  { dir: 'down', label: 'Move down', icon: <ChevronDown strokeWidth={2.5} />, gridArea: '3 / 2' },
];

/**
 * On-screen directional pad — an accessibility/mouse fallback alongside
 * arrow keys/WASD and swipe, so 2048 is fully playable without a keyboard
 * or touch gesture (e.g. switch/keyboard-only navigation of these buttons).
 * Buttons are data-driven rather than a locally-declared sub-component (a
 * component declared inside another component's render body gets recreated
 * — and loses its state — on every parent render).
 */
export function Controls({ accent, disabled, onMove }: ControlsProps) {
  const buttonStyle = {
    background: `${accent}14`,
    borderColor: `${accent}40`,
    color: accent,
  };

  return (
    <div
      className="grid grid-cols-3 grid-rows-3 gap-1.5 w-fit mx-auto"
      role="group"
      aria-label="Move controls"
    >
      {PAD.map(({ dir, label, icon, gridArea }) => (
        <button
          key={dir}
          type="button"
          aria-label={label}
          disabled={disabled}
          onClick={() => onMove(dir)}
          className="grid place-items-center w-12 h-12 rounded-xl border touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ ...buttonStyle, gridArea }}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
