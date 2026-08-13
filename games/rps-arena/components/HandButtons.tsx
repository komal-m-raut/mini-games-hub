'use client';

import { motion } from 'framer-motion';
import { THROW_EMOJI, THROW_LABEL } from '../constants';
import { Throw } from '../types';

interface HandButtonsProps {
  onThrow: (hand: Throw) => void;
  disabled: boolean;
  accent: string;
}

const HANDS: { hand: Throw; key: string }[] = [
  { hand: 'rock', key: '1' },
  { hand: 'paper', key: '2' },
  { hand: 'scissors', key: '3' },
];

/**
 * The three big rock/paper/scissors buttons. Keyboard 1/2/3 mirrors these
 * (wired at the game component level, same pattern as Math Sprint's digit
 * pad) — this stays a pure input surface either way.
 */
export function HandButtons({ onThrow, disabled, accent }: HandButtonsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
      {HANDS.map(({ hand, key }) => (
        <motion.button
          key={hand}
          type="button"
          onClick={() => onThrow(hand)}
          disabled={disabled}
          aria-label={`Throw ${THROW_LABEL[hand]} (key ${key})`}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-6 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          style={{ borderColor: `${accent}40`, background: `${accent}0F` }}
          whileHover={disabled ? undefined : { y: -3, borderColor: accent }}
          whileTap={disabled ? undefined : { scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <span className="text-5xl sm:text-6xl" aria-hidden="true">
            {THROW_EMOJI[hand]}
          </span>
          <span className="font-ui text-xs text-ink-3 uppercase tracking-wide">
            {THROW_LABEL[hand]}
          </span>
          <kbd className="font-body text-xs px-2 py-0.5 rounded-md text-ink-2 bg-white/5 border border-white/10">
            {key}
          </kbd>
        </motion.button>
      ))}
    </div>
  );
}
