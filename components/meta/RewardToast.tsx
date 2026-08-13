'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameResultOutcome } from '@/lib/recordResult';

interface RewardToastProps {
  outcome: GameResultOutcome | null;
}

const DISMISS_MS = 4500;

function isEmpty(outcome: GameResultOutcome): boolean {
  return (
    outcome.xpGained <= 0 &&
    !outcome.leveledUpTo &&
    outcome.questsCompleted.length === 0 &&
    outcome.achievementsUnlocked.length === 0
  );
}

/**
 * Fixed bottom-center reward stack for a just-recorded GameResultOutcome:
 * an XP chip, a level-up line, one row per completed quest, one card per
 * unlocked badge. Reduced motion is handled by the app-wide MotionConfig in
 * MotionProvider, not re-checked here.
 */
export function RewardToast({ outcome }: RewardToastProps) {
  // `visible` is derived, not stored: a RewardToast only ever goes through
  // one show→dismiss cycle per mount (its parent records a result at most
  // once), so `dismissed` only needs to move false→true, and only from
  // inside the timeout callback — never synchronously in the effect body.
  const [dismissed, setDismissed] = useState(false);
  const hasContent = outcome !== null && !isEmpty(outcome);
  const visible = hasContent && !dismissed;

  useEffect(() => {
    if (!hasContent) return;
    const id = setTimeout(() => setDismissed(true), DISMISS_MS);
    return () => clearTimeout(id);
  }, [hasContent]);

  if (!hasContent || !outcome) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 px-4 w-full max-w-sm"
          style={{ zIndex: 'var(--z-modal)' }}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          <div className="glass-card flex items-center gap-2 py-2 px-4 rounded-full">
            <span className="font-score text-brand-yellow text-sm">+{outcome.xpGained} XP</span>
            {outcome.leveledUpTo && (
              <span className="font-score text-brand-cyan text-sm">
                · Level up → {outcome.leveledUpTo}
              </span>
            )}
          </div>

          {outcome.questsCompleted.map((q) => (
            <div
              key={q.id}
              className="glass-card w-full flex items-center justify-between gap-3 py-2 px-4"
            >
              <span className="text-ink-2 text-sm font-ui">✅ {q.label}</span>
              <span className="font-score text-brand-yellow text-xs shrink-0">+{q.xp} XP</span>
            </div>
          ))}

          {outcome.achievementsUnlocked.map((a) => (
            <div key={a.id} className="glass-card w-full flex items-center gap-3 py-2 px-4">
              <span className="text-2xl shrink-0" aria-hidden="true">
                {a.emoji}
              </span>
              <div className="text-left min-w-0">
                <p className="text-ink-1 text-sm font-display">{a.title}</p>
                <p className="text-ink-3 text-xs font-ui truncate">{a.blurb}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
