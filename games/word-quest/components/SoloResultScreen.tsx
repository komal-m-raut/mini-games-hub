'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Home, RotateCcw, Share2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { RewardToast } from '@/components/meta/RewardToast';
import { GameResultOutcome, recordGameResult } from '@/lib/recordResult';
import { MAX_ROUND_SCORE, formatScore } from '@/utils/scoring';
import { GAME_ID, MAX_GUESSES } from '../constants';
import { buildWordQuestShareText } from '../engine';
import { WordQuestRoundResult } from '../types';
import { WordGrid } from './WordGrid';

interface SoloResultScreenProps {
  result: WordQuestRoundResult;
  bestSession: number;
  isNewBest: boolean;
  onReplay: () => void;
  onMenu: () => void;
}

const CONSOLATION = [
  "So close — the word wins this round.",
  'Six guesses, no dice this time.',
  "That one had a few tricks up its sleeve.",
];

/**
 * Word Quest's solo mode is a single word, not a scored 5-round session, so
 * it gets its own terminal screen instead of the shared `SessionSummary` —
 * same job (record the result, offer share/replay), different shape: the
 * finished grid and the revealed word stand in for a round-by-round
 * breakdown.
 */
export function SoloResultScreen({
  result,
  bestSession,
  isNewBest,
  onReplay,
  onMenu,
}: SoloResultScreenProps) {
  const { solvedIn } = result;
  const solved = solvedIn !== null;
  const [copied, setCopied] = useState(false);
  // Picked once per mount (a fresh result screen every round) rather than
  // recomputed on every render, so it doesn't flicker between messages.
  const [consolationIndex] = useState(() => Math.floor(Math.random() * CONSOLATION.length));

  // Feeds the meta layer (XP/streak/quests/achievements) exactly once per
  // finished round — a ref guard because this effect's own dependencies can
  // change reference on a re-render without the component actually
  // remounting for a new round (see SessionSummary's identical pattern).
  const recordedRef = useRef(false);
  const [outcome, setOutcome] = useState<GameResultOutcome | null>(null);
  useEffect(() => {
    if (recordedRef.current) return;
    recordedRef.current = true;
    setOutcome(
      recordGameResult({
        gameId: GAME_ID,
        mode: 'solo',
        totalScore: result.score,
        maxScore: MAX_ROUND_SCORE,
        isNewBest,
      })
    );
  }, [result.score, isNewBest]);

  const message = solved
    ? `Solved in ${solvedIn}/${MAX_GUESSES} guesses.`
    : CONSOLATION[consolationIndex];

  const share = async () => {
    const text = buildWordQuestShareText({
      label: 'Solo',
      rows: result.rows,
      solvedIn,
      path: '/games/word-quest',
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
      {solved && <ConfettiEffect trigger preset={solvedIn !== null && solvedIn <= 2 ? 'perfect' : 'great'} />}
      <RewardToast outcome={outcome} />

      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-ui text-xs uppercase tracking-widest mb-2 text-brand-cyan">
          {solved ? 'Solved!' : 'Round Over'}
        </p>
        <p className="font-display text-3xl uppercase tracking-[0.25em] mb-2">{result.answer}</p>
        <p className="text-ink-2 text-sm font-ui mb-2">{message}</p>
        <p className="font-display text-5xl mb-1">
          {formatScore(result.score)}
          <span className="text-ink-4 text-2xl">/{MAX_ROUND_SCORE}</span>
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
            Best: {formatScore(bestSession)}/{MAX_ROUND_SCORE}
          </p>
        )}
      </motion.div>

      <WordGrid rows={result.rows} currentGuess="" invalidNonce={0} solved={false} />

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
