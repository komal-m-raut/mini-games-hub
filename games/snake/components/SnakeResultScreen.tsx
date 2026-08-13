'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Home, RotateCcw, Share2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { RewardToast } from '@/components/meta/RewardToast';
import { GameResultOutcome, recordGameResult } from '@/lib/recordResult';
import { Difficulty } from '@/types/game';
import { GAME_ID, SNAKE_DIFFICULTY, SOLO_MAX_SCORE } from '../constants';

interface SnakeResultScreenProps {
  difficulty: Difficulty;
  length: number;
  foodEaten: number;
  isNewBest: boolean;
  best: number;
  onReplay: () => void;
  onMenu: () => void;
}

/**
 * Solo endless has no fixed round count, so it doesn't fit SessionSummary's
 * "N rounds out of 10 each" shape (see GAME-TEMPLATE.md's note on custom
 * result screens) — this calls recordGameResult itself instead, exactly
 * once per completed run, with the score capped at SOLO_MAX_SCORE so an
 * arbitrarily long run still reports a sane percentage for XP.
 */
export function SnakeResultScreen({
  difficulty,
  length,
  foodEaten,
  isNewBest,
  best,
  onReplay,
  onMenu,
}: SnakeResultScreenProps) {
  const accent = SNAKE_DIFFICULTY[difficulty].color;
  const totalScore = Math.min(foodEaten, SOLO_MAX_SCORE);
  const [copied, setCopied] = useState(false);

  // Ref-guarded exactly like SessionSummary/ChallengeComplete: this effect's
  // own dependencies can change reference on a re-render without the
  // component actually remounting for a new run.
  const recordedRef = useRef(false);
  const [outcome, setOutcome] = useState<GameResultOutcome | null>(null);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setOutcome(
      recordGameResult({
        gameId: GAME_ID,
        mode: 'solo',
        totalScore,
        maxScore: SOLO_MAX_SCORE,
        isNewBest,
      })
    );
  }, [totalScore, isNewBest]);

  const share = async () => {
    const text = `🐍 Snake — ${SNAKE_DIFFICULTY[difficulty].label} — ${foodEaten} food, length ${length}\nPlay free: ${window.location.origin}/games/snake`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Sheet dismissed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — silently drop; the result is still on screen.
    }
  };

  return (
    <div className="glass-card flex flex-col items-center gap-6 py-10 px-6">
      {isNewBest && <ConfettiEffect trigger preset="perfect" />}
      <RewardToast outcome={outcome} />

      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: accent }}>
          Game Over · {SNAKE_DIFFICULTY[difficulty].label}
        </p>
        <p className="font-display text-6xl mb-1">
          {foodEaten}
          <span className="text-ink-4 text-3xl"> food</span>
        </p>
        <p className="text-ink-3 text-sm font-ui">Length {length}</p>
        {isNewBest ? (
          <motion.p
            className="text-brand-yellow text-sm font-ui mt-1"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            🎉 New personal best!
          </motion.p>
        ) : (
          <p className="text-ink-3 text-sm font-ui mt-1">Best: {best} food</p>
        )}
      </motion.div>

      <button
        onClick={share}
        className="btn btn-sm btn-secondary"
        style={{ '--btn-accent': '#22D3EE' } as React.CSSProperties}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={1.5} />
        ) : (
          <Share2 strokeWidth={1.5} />
        )}
        {copied ? 'Copied!' : 'Share result'}
      </button>

      <div className="flex gap-3 w-full max-w-sm">
        <NeonButton
          variant="ghost"
          size="md"
          onClick={onMenu}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Home className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          Menu
        </NeonButton>
        <NeonButton
          variant="primary"
          size="md"
          onClick={onReplay}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4 shrink-0 hidden sm:block" strokeWidth={1.5} />
          Play Again
        </NeonButton>
      </div>
    </div>
  );
}
