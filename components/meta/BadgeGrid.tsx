'use client';

import { AchievementDef } from '@/lib/achievements';

interface BadgeGridProps {
  defs: AchievementDef[];
  unlocked: Set<string>;
}

/** All achievements — unlocked ones show their emoji, locked ones show 🔒
 *  and their hint blurb dimmed. */
export function BadgeGrid({ defs, unlocked }: BadgeGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {defs.map((def) => {
        const isUnlocked = unlocked.has(def.id);
        return (
          <div
            key={def.id}
            className="glass-card flex flex-col items-center text-center gap-1.5 p-4"
            style={{ opacity: isUnlocked ? 1 : 0.5 }}
          >
            <span className="text-3xl" aria-hidden="true">
              {isUnlocked ? def.emoji : '🔒'}
            </span>
            <p className="font-ui text-sm text-ink-1">{def.title}</p>
            <p className="text-2xs text-ink-3 font-ui leading-snug">{def.blurb}</p>
          </div>
        );
      })}
    </div>
  );
}
