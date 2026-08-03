'use client';

import { motion } from 'framer-motion';
import { Difficulty } from '@/types/game';

/** One difficulty card. Games supply their own accent so the selector stays generic. */
export interface DifficultyOption {
  id: Difficulty;
  label: string;
  /** Optional short qualifier shown under the label, e.g. "Fast". */
  qualifier?: string;
  color: string;
  glow: string;
}

interface DifficultySelectorProps {
  options: DifficultyOption[];
  onSelect: (difficulty: Difficulty) => void;
  title?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DifficultySelector({
  options,
  onSelect,
  title = 'Choose Difficulty',
}: DifficultySelectorProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h2>
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {options.map((opt) => (
          <motion.button
            key={opt.id}
            variants={item}
            onClick={() => onSelect(opt.id)}
            className="difficulty-card group flex-1"
            style={{ '--glow': opt.glow } as React.CSSProperties}
            whileHover={{ scale: 1.04, y: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Color accent bar */}
            <div
              className="h-1 w-full rounded-t-xl transition-all duration-300 group-hover:h-1.5"
              style={{ background: `linear-gradient(90deg, ${opt.color}, transparent)` }}
            />

            <div className="px-5 py-3.5 flex items-center justify-between gap-3 sm:block sm:py-4">
              <p
                className="neon-text font-display text-xl sm:text-2xl font-bold"
                style={{ color: opt.color, '--neon': opt.color } as React.CSSProperties}
              >
                {opt.label}
              </p>
              {opt.qualifier && (
                <p className="text-white/45 text-xs font-mono">{opt.qualifier}</p>
              )}
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
