'use client';

import { motion } from 'framer-motion';

interface DurationBarProps {
  /** 0–100 fill percentage. Pass 0 for a reset, static bar (RECREATE). */
  percent: number;
  /** Live "X.XXs" readout, or null to hide the number entirely (RECREATE —
   *  showing it would hand the player the answer they're trying to feel). */
  secondsLabel: string | null;
  color: string;
  glow: string;
}

/**
 * The horizontal duration bar shared by SHOW (fills live, with a number) and
 * RECREATE (rendered once more, reset to empty, for visual continuity only —
 * it never animates or reveals a number during the hold).
 */
export function DurationBar({ percent, secondsLabel, color, glow }: DurationBarProps) {
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div className="w-full h-6 rounded-full bg-white/5 border border-white/10 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, ${color}aa)`,
            boxShadow: `0 0 12px ${glow}`,
          }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>
      {/* Reserve the line height even when hidden so RECREATE's stage
          doesn't jump a row shorter than SHOW's. */}
      <p className="font-score text-3xl leading-none" style={{ color }}>
        {secondsLabel ?? ' '}
      </p>
    </div>
  );
}
