'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, Home, RotateCcw, Send, Share2, Swords } from 'lucide-react';
import Link from 'next/link';
import { NeonButton } from '@/components/ui/NeonButton';
import { ConfettiEffect } from '@/components/ui/ConfettiEffect';
import { ChallengeLeaderboard } from '@/components/challenge/ChallengeLeaderboard';
import {
  ChallengeRound,
  MAX_CHALLENGE_SCORE,
  buildShareText,
  challengeLabel,
  challengePath,
  isDailyCode,
} from '@/lib/challenge';
import { DIFFICULTY_CONFIG } from '@/lib/constants';
import { MAX_ROUND_SCORE } from '@/utils/scoring';
import { getPlayerId, getPlayerName, setPlayerName } from '@/lib/player';

/** Absolute invite URL — only called from click handlers, so window is safe. */
function challengeUrl(code: string): string {
  return `${window.location.origin}${challengePath(code)}`;
}

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

// ── Intro screen ────────────────────────────────────────────────────

interface ChallengeIntroProps {
  code: string;
  rounds: ChallengeRound[];
  onStart: () => void;
}

export function ChallengeIntro({ code, rounds, onStart }: ChallengeIntroProps) {
  const daily = isDailyCode(code);

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
        {rounds.map((round, i) => {
          const cfg = DIFFICULTY_CONFIG[round.difficulty];
          return (
            <div
              key={i}
              className="px-4 py-2 rounded-xl border text-xs font-mono"
              style={{ color: cfg.color, borderColor: `${cfg.color}40`, background: `${cfg.color}10` }}
            >
              <span className="block text-white/40 text-[0.6rem] uppercase tracking-wider mb-0.5">
                Round {i + 1}
              </span>
              {cfg.label}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <NeonButton variant="primary" size="lg" onClick={onStart} glow="rgba(124, 58, 237, 0.5)">
          Start Challenge
        </NeonButton>
        <CopyButton getText={() => challengeUrl(code)} label="Copy invite link" />
      </div>
    </div>
  );
}

// ── Completion screen ───────────────────────────────────────────────

interface ChallengeCompleteProps {
  code: string;
  roundScores: number[];
  onReplay: () => void;
}

export function ChallengeComplete({ code, roundScores, onReplay }: ChallengeCompleteProps) {
  const total = roundScores.reduce((a, b) => a + b, 0);
  const [name, setName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPlayerId(getPlayerId());
    setName(getPlayerName());
  }, []);

  const submit = async () => {
    if (!name.trim() || submitState === 'sending') return;
    setSubmitState('sending');
    setPlayerName(name);
    try {
      const res = await fetch(`/api/scores/balloon-match/${code}`, {
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
    const text = buildShareText(code, roundScores, window.location.origin);
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
            onChange={(e) => setName(e.target.value)}
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
          getText={() => buildShareText(code, roundScores, window.location.origin)}
          label="Copy result"
        />
        <CopyButton getText={() => challengeUrl(code)} label="Copy invite link" />
      </div>

      {/* Shared leaderboard for this challenge */}
      <div className="w-full border-t border-white/5 pt-5">
        <ChallengeLeaderboard code={code} playerId={playerId} refreshKey={refreshKey} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 w-full max-w-sm">
        <Link href="/games/balloon-match" className="flex-1">
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
          className="flex-1 flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          Retry
        </NeonButton>
      </div>

    </div>
  );
}
