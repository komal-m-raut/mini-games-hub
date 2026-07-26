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

  const copyInvite = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${challengePath(gameId, code)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card flex flex-col items-center gap-6 py-10 px-6 text-center">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Swords className="w-5 h-5 text-brand-cyan" strokeWidth={1.5} />
          <p className="font-mono text-xs text-brand-cyan uppercase tracking-widest">
            {daily ? 'Daily Challenge' : 'Friend Challenge'}
          </p>
        </div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-2">
          {challengeLabel(code)}
        </h2>
      </motion.div>

      {/* Round preview: difficulty sequence only, targets stay secret */}
      <div className="flex gap-3">
        {difficulties.map((difficulty, i) => {
          const color = DIFFICULTY_ACCENT[difficulty];
          return (
            <div
              key={i}
              className="px-4 py-2 rounded-xl border text-xs font-mono"
              style={{ color, borderColor: `${color}40`, background: `${color}10` }}
            >
              <span className="block text-white/40 text-[0.6rem] uppercase tracking-wider mb-0.5">
                Round {i + 1}
              </span>
              {DIFFICULTY_LABEL[difficulty]}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <NeonButton variant="primary" size="lg" onClick={onStart} glow="rgba(124, 58, 237, 0.5)">
          Start Challenge
        </NeonButton>
        <button
          onClick={copyInvite}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/25 transition-all text-xs font-mono cursor-pointer"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={1.5} />
          ) : (
            <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
          )}
          {copied ? 'Copied!' : 'Copy invite link'}
        </button>
      </div>
    </div>
  );
}
