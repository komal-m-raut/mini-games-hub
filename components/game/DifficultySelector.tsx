'use client';

import { motion } from 'framer-motion';
import { Difficulty } from '@/types/game';
import { DIFFICULTY_CONFIG } from '@/lib/constants';

interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

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

export function DifficultySelector({ onSelect }: DifficultySelectorProps) {
  return (
    <div className="flex flex-col items-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
          Choose Difficulty
        </h2>
        <p className="text-white/50 text-sm font-mono">
          Select how challenging you want the balloon match to be
        </p>
      </motion.div>

      <motion.div
        className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {DIFFICULTIES.map((diff) => {
          const cfg = DIFFICULTY_CONFIG[diff];
          return (
            <motion.button
              key={diff}
              variants={item}
              onClick={() => onSelect(diff)}
              className="difficulty-card group flex-1"
              style={{ '--glow': cfg.glow } as React.CSSProperties}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Color accent bar */}
              <div
                className="h-1 w-full rounded-t-xl mb-4 transition-all duration-300 group-hover:h-1.5"
                style={{ background: `linear-gradient(90deg, ${cfg.color}, transparent)` }}
              />

              <div className="px-5 pb-5">
                <p
                  className="font-display text-2xl font-bold mb-1"
                  style={{ color: cfg.color, textShadow: `0 0 16px ${cfg.color}80` }}
                >
                  {cfg.label}
                </p>
                <p className="text-white/50 text-xs font-mono mb-4 leading-relaxed">
                  {cfg.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="stat-pill">
                    <span className="text-white/40">Speed</span>
                    <span style={{ color: cfg.color }}>
                      {diff === 'easy' ? 'Slow' : diff === 'medium' ? 'Medium' : 'Fast'}
                    </span>
                  </div>
                  <div className="stat-pill">
                    <span className="text-white/40">Tolerance</span>
                    <span style={{ color: cfg.color }}>±{cfg.tolerancePercent}%</span>
                  </div>
                  <div className="stat-pill col-span-2">
                    <span className="text-white/40">Score multiplier</span>
                    <span style={{ color: cfg.color }}>
                      {diff === 'easy' ? '×1' : diff === 'medium' ? '×1.5' : '×2.5'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
