'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { BallState } from '../types';
import { FINGER_EMOJI } from './HandPicker';

interface HandRevealProps {
  ballState: BallState;
  playerPick: number | null;
  botPick: number | null;
  isOut: boolean;
  accent: string;
  playerLabel: string;
  botLabel: string;
  /** The batting side's pick this ball (playerPick in innings 1, botPick in
   *  innings 2) — what actually gets added as runs when the ball isn't a
   *  wicket. Passed explicitly rather than inferred, since this component
   *  doesn't otherwise know which side is batting. */
  runsPick: number | null;
}

/** One side of the reveal — a fist during the suspense beat, the thrown
 *  finger-count once revealed. */
function Hand({
  label,
  pick,
  revealed,
  reducedMotion,
}: {
  label: string;
  pick: number | null;
  revealed: boolean;
  reducedMotion: boolean;
}) {
  const showFace = revealed && pick !== null;
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-ui text-2xs uppercase tracking-widest text-ink-3">{label}</p>
      <motion.div
        key={showFace ? `hand-${pick}` : 'hand-hidden'}
        className="grid place-items-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border border-white/10 bg-white/5 text-5xl sm:text-6xl"
        initial={reducedMotion ? { opacity: 0 } : { rotateY: 90, opacity: 0.6 }}
        animate={reducedMotion ? { opacity: 1 } : { rotateY: 0, opacity: 1 }}
        transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
        aria-hidden="true"
      >
        {showFace ? FINGER_EMOJI[pick] : '✊'}
      </motion.div>
      <p className="font-score text-lg tabular-nums text-ink-2" aria-live="polite">
        {showFace ? pick : '?'}
      </p>
    </div>
  );
}

/**
 * Both hands, revealed simultaneously after the 400ms suspense beat. An OUT
 * flash overlays the whole reveal the instant the picks match. Reduced
 * motion swaps the flip spring for a plain opacity fade, per the OS
 * preference `useReducedMotion` reads.
 */
export function HandReveal({
  ballState,
  playerPick,
  botPick,
  isOut,
  accent,
  playerLabel,
  botLabel,
  runsPick,
}: HandRevealProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const revealed = ballState === 'revealed';

  return (
    <div className="relative flex flex-col items-center gap-3 py-2">
      <div className="flex items-center gap-6 sm:gap-10">
        <Hand label={playerLabel} pick={playerPick} revealed={revealed} reducedMotion={reducedMotion} />
        <span className="font-display text-2xl text-ink-4">vs</span>
        <Hand label={botLabel} pick={botPick} revealed={revealed} reducedMotion={reducedMotion} />
      </div>

      {revealed && (
        <motion.p
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
          transition={reducedMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 300, damping: 14 }}
          className="font-display text-3xl sm:text-4xl"
          style={{ color: isOut ? '#EF4444' : accent }}
          role="status"
          aria-live="assertive"
        >
          {isOut ? 'OUT!' : `+${runsPick ?? 0}`}
        </motion.p>
      )}
    </div>
  );
}
