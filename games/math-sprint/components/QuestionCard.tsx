'use client';

import { motion } from 'framer-motion';
import { MathQuestion } from '../constants';

interface QuestionCardProps {
  question: MathQuestion;
  input: string;
  /** True while the wrong-answer shake/flash plays. */
  isWrong: boolean;
  accent: string;
}

/**
 * The question, big and centred, with a typed-answer readout underneath. A
 * wrong submission shakes the whole card and flashes the readout red — the
 * question itself never changes, so the shake reads as "try again", not
 * "new question". `MotionConfig`'s app-wide `reducedMotion="user"` (see
 * `components/ui/MotionProvider.tsx`) neuters the shake's `x` keyframes for
 * players with that OS preference, no extra guard needed here.
 */
export function QuestionCard({ question, input, isWrong, accent }: QuestionCardProps) {
  return (
    <motion.div
      className="flex flex-col items-center gap-4 w-full"
      animate={isWrong ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <p className="font-display text-5xl sm:text-6xl tracking-tight text-center">
        {question.a} {question.op} {question.b} =
      </p>

      <div
        className="min-w-32 rounded-2xl border-2 px-6 py-3 text-center transition-colors duration-200"
        style={{
          borderColor: isWrong ? '#EF4444' : `${accent}40`,
          background: isWrong ? 'rgba(239, 68, 68, 0.14)' : `${accent}0F`,
        }}
        aria-label="Your answer"
      >
        <span className="font-score text-3xl text-ink-1 tabular-nums">{input || ' '}</span>
      </div>
    </motion.div>
  );
}
