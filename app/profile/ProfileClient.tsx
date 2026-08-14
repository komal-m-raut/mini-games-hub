'use client';

import { useState, useSyncExternalStore } from 'react';
import { Share2 } from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { LevelRing } from '@/components/meta/LevelRing';
import { XpBar } from '@/components/meta/XpBar';
import { BadgeGrid } from '@/components/meta/BadgeGrid';
import { useProgress } from '@/lib/progress';
import { useStreak } from '@/lib/streak';
import { useAchievements } from '@/lib/achievements';
import { setPlayerName, usePlayerName } from '@/lib/player';
import { AVAILABLE_GAMES } from '@/lib/gameRegistry';
import { getLocalBestSession, formatScore } from '@/utils/scoring';
import { cn } from '@/lib/utils';

const AVATAR_KEY = 'mgh_avatar';
const AVATAR_OPTIONS = [
  '😀', '😎', '🤖', '👾', '🐱', '🐶', '🦊', '🐻',
  '🐼', '🦁', '🐯', '🐸', '🦄', '🐙', '🦖', '👽',
];
const DEFAULT_AVATAR = AVATAR_OPTIONS[0];

function readAvatar(): string {
  if (typeof window === 'undefined') return DEFAULT_AVATAR;
  try {
    return localStorage.getItem(AVATAR_KEY) || DEFAULT_AVATAR;
  } catch {
    return DEFAULT_AVATAR;
  }
}

function writeAvatar(emoji: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AVATAR_KEY, emoji);
  } catch {
    // Quota exceeded or private-mode denial — the pick still "wins" for
    // this session via local state, it just won't persist.
  }
}

// Single-consumer, so this mirrors lib/player.ts's noop-subscribe pattern
// directly rather than growing a dedicated lib/streak-style module for one
// field only ProfileClient reads.
const noopSubscribe = () => () => {};
const defaultAvatarSnapshot = () => DEFAULT_AVATAR;

function useAvatar(): string {
  return useSyncExternalStore(noopSubscribe, readAvatar, defaultAvatarSnapshot);
}

// "Has this component hydrated on the client yet?" — deliberately not a
// useState+useEffect toggle (React's set-state-in-effect rule flags that),
// reusing the same server/client snapshot split as every other hook here.
const getHydratedTrue = () => true;
const getHydratedFalse = () => false;
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, getHydratedTrue, getHydratedFalse);
}

export function ProfileClient() {
  const progress = useProgress();
  const streak = useStreak();
  const { defs, unlocked } = useAchievements();
  const storedName = usePlayerName();
  const storedAvatar = useAvatar();

  const [editedName, setEditedName] = useState<string | null>(null);
  const name = editedName ?? storedName;
  const [editedAvatar, setEditedAvatar] = useState<string | null>(null);
  const avatar = editedAvatar ?? storedAvatar;
  const [shareState, setShareState] = useState<'idle' | 'shared' | 'error'>('idle');

  // getLocalBestSession reads localStorage directly (no hook), so the
  // per-game best table waits for the client mount the same way the /daily
  // calendar does — otherwise the server's all-zero render and the client's
  // real bests would mismatch on hydration.
  const mounted = useHydrated();

  const pickAvatar = (emoji: string) => {
    writeAvatar(emoji);
    setEditedAvatar(emoji);
  };

  const commitName = () => setPlayerName(name);

  const shareProfile = async () => {
    const text = [
      `${avatar} ${name || 'My'} Mettle profile`,
      `Level ${progress.level} · ${progress.totalPlays} plays · ${streak.current}-day streak (best ${streak.best}) · ${unlocked.size}/${defs.length} badges`,
      `Play free at ${window.location.origin}`,
    ].join('\n');
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // Sheet dismissed — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareState('shared');
      setTimeout(() => setShareState('idle'), 2000);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 2000);
    }
  };

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-10">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl mb-2">Your Player Profile</h1>
        <p className="text-ink-3 text-sm max-w-2xl">
          Everything here lives on this device only — no account, no sign-in. Pick a nickname
          and an avatar, track your level and streak, and unlock badges as you play.
        </p>
      </div>

      {/* Identity: avatar picker + nickname */}
      <section className="glass-card flex flex-col sm:flex-row gap-6 py-6 px-6">
        <div className="flex flex-col items-center gap-3 shrink-0">
          <div className="w-20 h-20 rounded-full grid place-items-center text-4xl bg-white/5 border border-white/10">
            <span aria-hidden="true">{avatar}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Choose an avatar">
            {AVATAR_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => pickAvatar(emoji)}
                aria-label={`Choose avatar ${emoji}`}
                aria-pressed={emoji === avatar}
                className={cn(
                  'w-8 h-8 rounded-lg grid place-items-center text-lg transition-colors cursor-pointer',
                  emoji === avatar
                    ? 'bg-brand-purple/30 ring-1 ring-brand-purple'
                    : 'bg-white/5 hover:bg-white/10'
                )}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-4 justify-center">
          <div>
            <label
              htmlFor="nickname"
              className="block font-ui text-xs text-ink-3 uppercase tracking-widest mb-1.5"
            >
              Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={name}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                commitName();
                (e.target as HTMLInputElement).blur();
              }}
              placeholder="Your nickname"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/55 font-ui text-sm outline-none focus:border-brand-purple/60 transition-colors"
            />
          </div>

          <NeonButton
            variant="secondary"
            size="md"
            onClick={shareProfile}
            className="self-start flex items-center gap-2 whitespace-nowrap"
          >
            <Share2 strokeWidth={1.5} />
            {shareState === 'error' ? 'Share failed' : shareState === 'shared' ? 'Copied!' : 'Share my profile'}
          </NeonButton>
        </div>
      </section>

      {/* Level + XP */}
      <section className="glass-card flex flex-col sm:flex-row items-center gap-6 py-6 px-6">
        <LevelRing xp={progress.xp} />
        <div className="w-full flex-1 min-w-0">
          <XpBar xp={progress.xp} level={progress.level} />
        </div>
      </section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="stat-card">
          <p className="stat-label">Total Plays</p>
          <p className="stat-value">{progress.totalPlays}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Streak</p>
          <p className="stat-value">{streak.current}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Best Streak</p>
          <p className="stat-value">{streak.best}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Badges</p>
          <p className="stat-value">
            {unlocked.size}
            <span className="text-ink-4 text-sm">/{defs.length}</span>
          </p>
        </div>
      </section>

      {/* Badges */}
      <section>
        <h2 className="font-display text-xl mb-4">Badges</h2>
        <BadgeGrid defs={defs} unlocked={unlocked} />
      </section>

      {/* Per-game bests */}
      <section className="glass-card">
        <h2 className="font-display text-xl mb-4">Your Best Scores</h2>
        {mounted ? (
          <div className="divide-y divide-white/5">
            {AVAILABLE_GAMES().map((game) => (
              <div key={game.id} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-2 font-ui text-sm text-ink-2">
                  <span aria-hidden="true">{game.emoji}</span>
                  {game.title}
                </span>
                <span className="font-score text-sm text-ink-1">
                  {formatScore(getLocalBestSession(game.id))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-ink-4 text-xs font-ui">Loading your scores…</p>
        )}
      </section>
    </div>
  );
}
