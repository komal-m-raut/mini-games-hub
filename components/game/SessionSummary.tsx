'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Home, RotateCcw, Share2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { RewardToast } from '@/components/meta/RewardToast';
import { GameResultOutcome, recordGameResult } from '@/lib/recordResult';
import { buildSessionShare } from '@/lib/share';
import { MAX_ROUND_SCORE, formatScore, round2 } from '@/utils/scoring';

interface SessionSummaryProps {
  /** Game identity for the share text. */
  emoji: string;
  gameName: string;
  gamePath: string;
  /** Difficulty or mode line shown under the score. */
  subtitle: string;
  /** Accent color for the subtitle (usually the difficulty color). */
  accent: string;
  roundScores: number[];
  isNewBest: boolean;
  bestSession: number;
  onReplay: () => void;
  onMenu: () => void;
}

/**
 * End-of-session screen shared by every round-based game: total score,
 * per-round breakdown, personal best, share, and replay.
 */
export function SessionSummary({
  emoji,
  gameName,
  gamePath,
  subtitle,
  accent,
  roundScores,
  isNewBest,
  bestSession,
  onReplay,
  onMenu,
}: SessionSummaryProps) {
  const total = round2(roundScores.reduce((a, b) => a + b, 0));
  const max = roundScores.length * MAX_ROUND_SCORE;
  const [copied, setCopied] = useState(false);

  // Feeds the meta layer (XP/streak/quests/achievements) exactly once per
  // completed session — a ref guard because this effect's own dependencies
  // (roundScores et al.) can change reference on a re-render without this
  // component actually remounting for a new session.
  const recordedRef = useRef(false);
  const [outcome, setOutcome] = useState<GameResultOutcome | null>(null);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setOutcome(
      recordGameResult({
        gameId: gamePath.replace('/games/', ''),
        mode: 'solo',
        roundScores,
        totalScore: total,
        maxScore: max,
        isNewBest,
      })
    );
  }, [gamePath, roundScores, total, max, isNewBest]);

  const share = async () => {
    const text = buildSessionShare({
      emoji,
      game: gameName,
      subtitle,
      roundScores,
      path: gamePath,
      origin: window.location.origin,
    });
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
      {(isNewBest || total >= max * 0.7) && <ConfettiEffect trigger preset="perfect" />}
      <RewardToast outcome={outcome} />

      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p
          className="font-ui text-xs uppercase tracking-widest mb-2"
          style={{ color: accent }}
        >
          Session Complete · {subtitle}
        </p>
        <p className="font-score score-hero mb-1">
          {formatScore(total)}
          <span className="text-ink-4 text-2xl sm:text-3xl">/{max}</span>
        </p>
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
          <p className="text-ink-3 text-sm font-ui">
            Best: {formatScore(bestSession)}/{max}
          </p>
        )}
      </motion.div>

      {/* Per-round breakdown */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {roundScores.map((score, i) => (
          <motion.div
            key={i}
            className="stat-card px-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <p className="stat-label">R{i + 1}</p>
            <p className="stat-value text-brand-purple">
              {formatScore(score)}
              <span className="text-ink-4 text-sm">/{MAX_ROUND_SCORE}</span>
            </p>
          </motion.div>
        ))}
      </div>

      <button
        onClick={share}
        className="btn btn-sm btn-secondary" style={{ '--btn-accent': '#22D3EE' } as React.CSSProperties}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={1.5} />
        ) : (
          <Share2 strokeWidth={1.5} />
        )}
        {copied ? 'Copied!' : 'Share result'}
      </button>

      {/* Play Again leads and goes full-width in the thumb zone on mobile;
          Menu stays reachable underneath rather than splitting the same row
          in half. Side by side again once there's room at `sm`. */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 w-full max-w-sm">
        <NeonButton
          variant="ghost"
          size="md"
          onClick={onMenu}
          className="flex-1 min-w-0 w-full flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <Home className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          Menu
        </NeonButton>
        <NeonButton
          variant="primary"
          size="md"
          onClick={onReplay}
          className="flex-1 min-w-0 w-full flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4 shrink-0 hidden sm:block" strokeWidth={1.5} />
          Play Again
        </NeonButton>
      </div>
    </div>
  );
}
