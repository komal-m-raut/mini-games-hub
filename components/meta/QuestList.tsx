'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { QuestProgress } from '@/lib/quests';

interface QuestListProps {
  quests: QuestProgress[];
}

/** Today's quests with a progress bar each. Cards use .glass-card (not
 *  .stat-card) because that class is unlayered CSS and always wins the
 *  cascade over Tailwind utilities — its centered layout can't be
 *  overridden for this row's label/progress split. */
export function QuestList({ quests }: QuestListProps) {
  if (quests.length === 0) {
    return <p className="text-ink-3 text-sm font-ui">No quests yet today — play a game to roll them.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {quests.map((q, i) => {
        const pct = q.target > 0 ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0;
        return (
          <motion.div
            key={q.id}
            className="glass-card flex flex-col gap-2 p-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-ui text-sm text-ink-1">{q.label}</span>
              {q.done ? (
                <span className="flex items-center gap-1 text-brand-green text-xs font-ui shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={2} /> +{q.xp} XP
                </span>
              ) : (
                <span className="font-score text-ink-3 text-xs shrink-0">
                  {q.progress}/{q.target}
                </span>
              )}
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  background: q.done ? 'var(--color-brand-green)' : 'var(--color-brand-purple)',
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
