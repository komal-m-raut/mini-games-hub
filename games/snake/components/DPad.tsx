'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Direction } from '../engine';

interface DPadProps {
  onPress: (direction: Direction) => void;
  accent: string;
}

interface Cell {
  direction: Direction;
  icon: typeof ChevronUp;
  area: string;
  label: string;
}

const CELLS: Cell[] = [
  { direction: 'up', icon: ChevronUp, area: 'up', label: 'Move up' },
  { direction: 'left', icon: ChevronLeft, area: 'left', label: 'Move left' },
  { direction: 'right', icon: ChevronRight, area: 'right', label: 'Move right' },
  { direction: 'down', icon: ChevronDown, area: 'down', label: 'Move down' },
];

/**
 * On-screen cross d-pad, shown only on coarse-pointer devices (see
 * SnakeGame.tsx's pointer-type detection — swipe and this pad are both
 * available on touch, so this is a convenience for players who'd rather tap
 * than swipe). `onPointerDown` rather than `onClick` so a turn registers on
 * first contact, matching the immediacy swipe and keyboard already have.
 */
export function DPad({ onPress, accent }: DPadProps) {
  return (
    <div
      className="grid gap-1.5 w-36 h-36 mx-auto"
      style={{
        gridTemplateAreas: '". up ." "left . right" ". down ."',
        gridTemplateColumns: '1fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr 1fr',
        touchAction: 'none',
      }}
    >
      {CELLS.map(({ direction, icon: Icon, area, label }) => (
        <button
          key={direction}
          type="button"
          aria-label={label}
          onPointerDown={(e) => {
            e.preventDefault();
            onPress(direction);
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="grid place-items-center rounded-xl border select-none active:scale-95 transition-transform"
          style={{
            gridArea: area,
            borderColor: `${accent}40`,
            background: `${accent}14`,
            color: accent,
          }}
        >
          <Icon className="w-6 h-6" strokeWidth={2.5} />
        </button>
      ))}
    </div>
  );
}
