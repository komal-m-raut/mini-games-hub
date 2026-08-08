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
            className="difficulty-card flex-1"
            style={{ '--accent': opt.color } as React.CSSProperties}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {/* Colour accent bar */}
            <div className="h-1 w-full" style={{ background: opt.color }} />

            <div className="px-5 py-3.5 flex items-center justify-between gap-3 sm:block sm:py-4">
              {/* No neon-text here: the difficulty name is the label you read
                  to make a choice, and a glow on it costs legibility for
                  nothing. Colour alone already carries the easy→hard ramp. */}
              <p className="font-display text-xl sm:text-2xl font-bold" style={{ color: opt.color }}>
                {opt.label}
              </p>
              {opt.qualifier && (
                <p className="text-white/60 text-sm leading-snug">{opt.qualifier}</p>
              )}
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
