'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Home, RotateCcw, Share2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { RewardToast } from '@/components/meta/RewardToast';
import { GameResultOutcome, recordGameResult } from '@/lib/recordResult';
import { SOLO_XP_SCORE_CAP } from '../constants';

interface SoloResultScreenProps {
  score: number;
  bestTile: number;
  moves: number;
  isNewBest: boolean;
  onReplay: () => void;
  onMenu: () => void;
}

/**
 * Solo endless has no fixed round count, so it can't reuse the shared
 * `SessionSummary` (built around a `roundScores[]` breakdown) — this is its
 * own result screen, but it still records the run into the shared XP/quest
 * pipeline exactly once per completed run, the same ref-guarded pattern
 * `SessionSummary`/`ChallengeComplete` use.
 */
export function SoloResultScreen({
  score,
  bestTile,
  moves,
  isNewBest,
  onReplay,
  onMenu,
}: SoloResultScreenProps) {
  const [copied, setCopied] = useState(false);

  const recordedRef = useRef(false);
  const [outcome, setOutcome] = useState<GameResultOutcome | null>(null);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setOutcome(
      recordGameResult({
        gameId: '2048',
        mode: 'solo',
        totalScore: Math.min(score, SOLO_XP_SCORE_CAP),
        maxScore: SOLO_XP_SCORE_CAP,
        isNewBest,
      })
    );
  }, [score, isNewBest]);

  const share = async () => {
    const text = `🧩 2048 — scored ${score.toLocaleString()}, best tile ${bestTile}, in ${moves} moves. Play free: ${window.location.origin}/games/2048`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Sheet dismissed — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <p className="font-ui text-xs uppercase tracking-widest mb-2" style={{ color: '#FB923C' }}>
          Game Over
        </p>
        <p className="font-display text-6xl mb-1">{score.toLocaleString()}</p>
        {isNewBest ? (
          <motion.p
            className="text-brand-yellow text-sm font-ui"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            🎉 New personal best!
          </motion.p>
        ) : (
          <p className="text-ink-3 text-sm font-ui">Keep merging to beat your best.</p>
        )}
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3">
        <div className="stat-card px-5">
          <p className="stat-label">Best Tile</p>
          <p className="stat-value text-brand-purple">{bestTile}</p>
        </div>
        <div className="stat-card px-5">
          <p className="stat-label">Moves</p>
          <p className="stat-value text-brand-purple">{moves}</p>
        </div>
      </div>

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
          accent="#FB923C"
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
