'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Copy, Home, RotateCcw, Send, Share2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { ChallengeLeaderboard } from '@/components/challenge/ChallengeLeaderboard';
import {
  MAX_CHALLENGE_SCORE,
  buildChallengeShareText,
  challengeLabel,
  challengePath,
} from '@/lib/challenge';
import { MAX_ROUND_SCORE } from '@/utils/scoring';
import { setPlayerName, usePlayerId, usePlayerName } from '@/lib/player';

function CopyButton({ getText, label }: { getText: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(getText());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/25 transition-all text-xs font-mono cursor-pointer"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" strokeWidth={1.5} />
      ) : (
        <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
      )}
      {copied ? 'Copied!' : label}
    </button>
  );
}

interface ChallengeCompleteProps {
  gameId: string;
  code: string;
  roundScores: number[];
  /** Retry the same challenge. */
  onReplay: () => void;
}

export function ChallengeComplete({ gameId, code, roundScores, onReplay }: ChallengeCompleteProps) {
  const total = roundScores.reduce((a, b) => a + b, 0);
  const playerId = usePlayerId();
  const storedName = usePlayerName();
  // null = untouched → show the stored nickname; edits take over from there
  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? storedName;
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  const submit = async () => {
    if (!name.trim() || submitState === 'sending') return;
    setSubmitState('sending');
    setPlayerName(name);
    try {
      const res = await fetch(`/api/scores/${gameId}/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, name: name.trim(), roundScores }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSubmitState('done');
      setRefreshKey((k) => k + 1);
    } catch {
      setSubmitState('error');
    }
  };

  const share = async () => {
    const text = buildChallengeShareText(gameId, code, roundScores, window.location.origin);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // fall through to clipboard (user may have dismissed the sheet)
      }
    }
    await navigator.clipboard.writeText(text);
  };

  const inviteUrl = () => `${window.location.origin}${challengePath(gameId, code)}`;

  return (
    <div className="glass-card flex flex-col items-center gap-6 py-10 px-6">
      {total >= 20 && <ConfettiEffect trigger preset="perfect" />}

      <motion.div
        className="text-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16 }}
      >
        <p className="font-mono text-xs text-brand-cyan uppercase tracking-widest mb-2">
          Challenge Complete
        </p>
        <p className="font-display text-6xl font-black text-white mb-1">
          {total}
          <span className="text-white/30 text-3xl">/{MAX_CHALLENGE_SCORE}</span>
        </p>
        <p className="text-white/40 text-sm font-mono">{challengeLabel(code)}</p>
      </motion.div>

      {/* Per-round breakdown */}
      <div className="flex gap-3">
        {roundScores.map((score, i) => (
          <motion.div
            key={i}
            className="stat-card px-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
          >
            <p className="stat-label">Round {i + 1}</p>
            <p className="stat-value text-brand-purple">
              {score}
              <span className="text-white/30 text-sm">/{MAX_ROUND_SCORE}</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* Name + submit to the shared leaderboard */}
      {submitState !== 'done' ? (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-sm">
          <input
            type="text"
            value={name}
            onChange={(e) => setEditedName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Your nickname"
            maxLength={20}
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 font-mono text-sm outline-none focus:border-brand-purple/60 transition-colors"
          />
          <NeonButton
            variant="primary"
            size="md"
            onClick={submit}
            className="flex items-center gap-2 whitespace-nowrap w-full sm:w-auto justify-center"
            glow="rgba(124, 58, 237, 0.5)"
          >
            <Send className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            {submitState === 'sending' ? 'Submitting…' : 'Submit Score'}
          </NeonButton>
        </div>
      ) : (
        <p className="text-green-400 text-sm font-mono flex items-center gap-1.5">
          <Check className="w-4 h-4" strokeWidth={1.5} /> Score on the board!
        </p>
      )}
      {submitState === 'error' && (
        <p className="text-red-400 text-xs font-mono">Submission failed — try again.</p>
      )}

      {/* Share row */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={share}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan hover:border-brand-cyan/60 transition-all text-xs font-mono cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          Share result
        </button>
        <CopyButton
          getText={() => buildChallengeShareText(gameId, code, roundScores, window.location.origin)}
          label="Copy result"
        />
        <CopyButton getText={inviteUrl} label="Copy invite link" />
      </div>

      {/* Shared leaderboard for this challenge */}
      <div className="w-full border-t border-white/5 pt-5">
        <ChallengeLeaderboard gameId={gameId} code={code} playerId={playerId} refreshKey={refreshKey} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        <Link href={`/games/${gameId}`} className="flex-1 min-w-0">
          <NeonButton
            variant="ghost"
            size="md"
            className="w-full flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Home className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            Free Play
          </NeonButton>
        </Link>
        <NeonButton
          variant="secondary"
          size="md"
          onClick={onReplay}
          className="flex-1 min-w-0 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4 shrink-0 hidden sm:block" strokeWidth={1.5} />
          Retry
        </NeonButton>
      </div>
    </div>
  );
}
