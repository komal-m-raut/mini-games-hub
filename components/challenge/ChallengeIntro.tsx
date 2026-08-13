'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Swords } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { Difficulty } from '@/types/game';
import {
  DIFFICULTY_ACCENT,
  challengeLabel,
  challengePath,
  isDailyCode,
} from '@/lib/challenge';

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

interface ChallengeIntroProps {
  gameId: string;
  code: string;
  /** Round difficulty sequence (targets stay secret until you play). */
  difficulties: Difficulty[];
  onStart: () => void;
}

export function ChallengeIntro({ gameId, code, difficulties, onStart }: ChallengeIntroProps) {
  const daily = isDailyCode(code);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${challengePath(gameId, code)}`);
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  return (
    <div className="glass-card flex flex-col items-center gap-6 py-10 px-6 text-center">
      <motion.div className="fade-up">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Swords className="w-5 h-5 text-brand-cyan" strokeWidth={1.5} />
          <p className="font-ui text-xs text-brand-cyan uppercase tracking-widest">
            {daily ? 'Daily Challenge' : 'Friend Challenge'}
          </p>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl mb-2">
          {challengeLabel(code)}
        </h2>
      </motion.div>

      {/* Round preview: difficulty sequence only, targets stay secret. Flat
          tint, no border — these already sit inside the outer .glass-card,
          and a bordered chip inside a bordered card is the boxes-in-boxes
          look the redesign drops in favour of a soft surface tint. */}
      <div className="flex gap-3">
        {difficulties.map((difficulty, i) => {
          const color = DIFFICULTY_ACCENT[difficulty];
          return (
            <div
              key={i}
              className="px-4 py-2 rounded-xl text-xs font-ui"
              style={{ color, background: `${color}16` }}
            >
              <span className="block text-ink-3 text-xs uppercase tracking-wider mb-0.5">
                Round {i + 1}
              </span>
              {DIFFICULTY_LABEL[difficulty]}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm sm:max-w-none">
        <NeonButton variant="primary" size="lg" onClick={onStart} className="w-full sm:w-auto">
          Start Challenge
        </NeonButton>
        <button
          onClick={copyInvite}
          className="btn btn-sm btn-secondary w-full sm:w-auto" style={{ '--btn-accent': '#22D3EE' } as React.CSSProperties}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={1.5} />
          ) : (
            <Copy strokeWidth={1.5} />
          )}
          {copyFailed ? 'Copy failed' : copied ? 'Copied!' : 'Copy invite link'}
        </button>
      </div>
    </div>
  );
}
