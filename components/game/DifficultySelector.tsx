'use client';

import { motion } from 'framer-motion';
import { Difficulty } from '@/types/game';

/** One difficulty card. Games supply their own stats so the selector stays generic. */
export interface DifficultyOption {
  id: Difficulty;
  label: string;
  description: string;
  color: string;
  glow: string;
  /** Up to two short stat pills, e.g. { label: 'Speed', value: 'Fast' }. */
  stats: { label: string; value: string }[];
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
    <div className="flex flex-col items-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">{title}</h2>
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl"
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
              className="h-1 w-full rounded-t-xl mb-4 transition-all duration-300 group-hover:h-1.5"
              style={{ background: `linear-gradient(90deg, ${opt.color}, transparent)` }}
            />

            <div className="px-5 pb-5">
              <p
                className="font-display text-2xl font-bold mb-1"
                style={{ color: opt.color, textShadow: `0 0 16px ${opt.color}80` }}
              >
                {opt.label}
              </p>
              <p className="text-white/50 text-xs font-mono mb-4 leading-relaxed">
                {opt.description}
              </p>

              <div className="grid grid-cols-2 gap-2 font-mono">
                {opt.stats.map((stat) => (
                  <div key={stat.label} className="stat-pill">
                    <span className="text-white/35 text-[0.6rem] uppercase tracking-wider">
                      {stat.label}
                    </span>
                    <span className="text-xs font-bold" style={{ color: opt.color }}>
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
