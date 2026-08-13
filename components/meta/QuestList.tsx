'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { QuestProgress } from '@/lib/quests';

interface QuestListProps {
  quests: QuestProgress[];
}

/** Today's quests with a progress bar each. QuestList is always rendered
 *  inside its own .glass-card panel (DailyClient), so rows use the quieter
 *  .quest-row instead of another .glass-card per row — nesting bordered
 *  cards inside a bordered card read as boxes-in-boxes. */
export function QuestList({ quests }: QuestListProps) {
  if (quests.length === 0) {
    return <p className="text-ink-3 text-sm font-ui">No quests yet today — play a game to roll them.</p>;
  }

  return (
    <div className="flex flex-col">
      {quests.map((q, i) => {
        const pct = q.target > 0 ? Math.min(100, Math.round((q.progress / q.target) * 100)) : 0;
        return (
          <motion.div
            key={q.id}
            className="quest-row"
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
