'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';

interface InningsSummaryProps {
  playerRuns: number;
  playerBalls: number;
  target: number;
  accent: string;
  onContinue: () => void;
}

/** The strip between innings: your first-innings total, and the target
 *  you've just set the bot for its chase. */
export function InningsSummary({ playerRuns, playerBalls, target, accent, onContinue }: InningsSummaryProps) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }}>
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: accent }}>
          Innings 1 Complete
        </p>
        <p className="font-display text-5xl mb-1">
          {playerRuns}
          <span className="text-ink-4 text-2xl"> / {playerBalls} balls</span>
        </p>
      </motion.div>

      <div className="stat-card px-6">
        <p className="stat-label">Bot needs to win</p>
        <p className="stat-value text-brand-purple">{target}</p>
      </div>

      <p className="text-ink-3 text-sm font-ui max-w-sm">
        Now it&apos;s your turn to bowl — match the bot&apos;s pick to take the wicket before it reaches {target}.
      </p>

      <NeonButton variant="primary" size="lg" onClick={onContinue} className="flex items-center gap-2">
        Start Bowling
        <ArrowRight className="w-4 h-4" strokeWidth={2} />
      </NeonButton>
    </div>
  );
}
