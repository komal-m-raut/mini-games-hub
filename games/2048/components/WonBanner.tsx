'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { NeonButton } from '@/components/ui/NeonButton';

interface WonBannerProps {
  visible: boolean;
  onKeepGoing: () => void;
}

/** Dismissible overlay shown once, the moment a run first reaches 2048 —
 *  the run keeps going underneath (endless in solo, until the clock runs
 *  out in a challenge round), this is only a "you did it" beat. */
export function WonBanner({ visible, onKeepGoing }: WonBannerProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: 'rgba(11,11,26,0.72)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-card flex flex-col items-center gap-4 py-8 px-8 text-center"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <span className="text-5xl" aria-hidden="true">
              🧩
            </span>
            <h2 className="font-display text-3xl" style={{ color: '#FB923C' }}>
              You reached 2048!
            </h2>
            <p className="text-ink-2 text-sm max-w-xs">
              Keep merging — the board doesn&apos;t stop here, and every tile past this one still
              adds to your score.
            </p>
            <NeonButton variant="primary" accent="#FB923C" onClick={onKeepGoing}>
              Keep Going
            </NeonButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
