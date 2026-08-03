'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { TapResultScreen } from './TapResultScreen';
import { TimingBar } from './TimingBar';
import { TAP_DIFFICULTY } from './constants';
import { useTimingTapGame } from './useTimingTapGame';

const GAME_ID = 'timing-tap';

interface TimingTapGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_QUALIFIER: Record<Difficulty, string> = {
  easy: 'Wide zone · slow',
  medium: 'Tighter zone · fast',
  hard: 'Razor zone · erratic',
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = TAP_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: DIFFICULTY_QUALIFIER[id],
    color: cfg.color,
    glow: cfg.glow,
  };
});

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export function TimingTapGame({ challengeCode }: TimingTapGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    position,
    selectDifficulty,
    startChallenge,
    tap,
    nextRound,
    replay,
    resetToMenu,
  } = useTimingTapGame({ challengeCode });

  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const surfaceRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const rippleTimeouts = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  useEffect(() => {
    const timeouts = rippleTimeouts.current;
    return () => {
      timeouts.forEach((id) => clearTimeout(id));
      timeouts.clear();
    };
  }, []);

  const addRipple = useCallback(
    (x: number, y: number) => {
      if (reducedMotion) return;
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev.slice(-5), { id, x, y }]);
      const timeoutId = setTimeout(() => {
        rippleTimeouts.current.delete(timeoutId);
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 560);
      rippleTimeouts.current.add(timeoutId);
    },
    [reducedMotion]
  );

  // tap() is idempotent per round (the hook guards it), but skip our own
  // ripple/side-effects once a result already landed rather than lean on that.
  const registerTap = useCallback(
    (x: number, y: number) => {
      if (state.result) return;
      addRipple(x, y);
      tap();
    },
    [state.result, addRipple, tap]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      registerTap(e.clientX - rect.left, e.clientY - rect.top);
    },
    [registerTap]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.repeat) return;
      e.preventDefault();
      // The window-level Space listener below must not also react to this
      // same keydown now that the focused surface has handled it.
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      registerTap((position.get() / 100) * rect.width, rect.height / 2);
    },
    [position, registerTap]
  );

  // Space works even when the tap surface has lost focus — a timing game
  // shouldn't require the player to keep re-clicking the same DOM node.
  useEffect(() => {
    if (state.phase !== 'running') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      if (e.repeat) return;
      e.preventDefault();
      const surface = surfaceRef.current;
      if (!surface) return;
      const rect = surface.getBoundingClientRect();
      registerTap((position.get() / 100) * rect.width, rect.height / 2);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, position, registerTap]);

  // Instant replay: Space/Enter chain straight into the next round so a
  // player never has to move their hand to the Next button — unless they've
  // deliberately tabbed to a different control (e.g. Menu), which keeps its
  // own activation.
  useEffect(() => {
    if (state.phase !== 'results') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.repeat) return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && ['BUTTON', 'A', 'INPUT', 'TEXTAREA'].includes(active.tagName)) {
        return;
      }
      e.preventDefault();
      nextRound();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, nextRound]);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? TAP_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Top bar */}
      {!isMenu && !isEnd && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={isChallenge ? resetToMenu : backToMenu}
            className="flex items-center gap-1.5 -ml-3 px-3 py-2.5 min-h-11 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            {isChallenge ? 'Restart' : 'Menu'}
          </button>
          <ScoreCard
            score={state.score}
            round={state.round}
            totalRounds={state.totalRounds}
            totalScore={state.totalScore}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Free-play menu: mode picker → solo or multiplayer ── */}
        {state.phase === 'selecting-difficulty' && (
          <motion.div
            key={`menu-${menuView}`}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6 fade-up"
          >
            {menuView === 'mode' && (
              <ModeSelector
                accent="#EAB308"
                onSolo={() => setMenuView('solo')}
                onDailyChallenge={() =>
                  router.push(challengePath(GAME_ID, getDailyChallengeCode()))
                }
                onFriendChallenge={() =>
                  router.push(challengePath(GAME_ID, generateChallengeCode()))
                }
              />
            )}
            {menuView === 'solo' && (
              <div className="flex flex-col gap-5">
                <DifficultySelector options={DIFFICULTY_OPTIONS} onSelect={selectDifficulty} />
                <button
                  onClick={() => setMenuView('mode')}
                  className="mx-auto flex items-center gap-1.5 px-3 py-2.5 min-h-11 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                  Back
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Challenge intro ── */}
        {state.phase === 'challenge-intro' && challengeCode && challengeRounds && (
          <motion.div key="challenge-intro" exit={{ opacity: 0, y: -20 }} className="fade-up">
            <ChallengeIntro
              gameId={GAME_ID}
              code={challengeCode}
              difficulties={challengeRounds.map((r) => r.difficulty)}
              onStart={startChallenge}
            />
          </motion.div>
        )}

        {/* ── Countdown: same "3 · 2 · 1" rhythm before every round ── */}
        {state.phase === 'countdown' && cfg && (
          <motion.div
            key={`countdown-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="font-display text-xl font-bold text-white">Get Ready…</p>
            <div className="relative w-full">
              <TimingBar
                position={position}
                zoneHalfWidth={cfg.zoneHalfWidth}
                beam={cfg.beam}
                frozen
                slowMotion={false}
                markerPosition={null}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={state.countdown}
                    className="neon-text font-display text-6xl font-black text-white"
                    style={{ '--neon': cfg.beam } as React.CSSProperties}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.3, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                  >
                    {state.countdown}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Running: tap to stop the indicator inside the zone ── */}
        {state.phase === 'running' && cfg && (
          <motion.div
            key={`running-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="font-display text-xl font-bold text-white">Tap in the Zone!</p>
            <p className="text-white/50 text-sm font-mono text-center px-2">
              Tap, click, or press Space/Enter as the beam crosses the glowing zone.
            </p>

            <button
              ref={surfaceRef}
              type="button"
              onPointerDown={handlePointerDown}
              onKeyDown={handleKeyDown}
              aria-label="Tap to stop the indicator inside the Perfect Zone"
              className="relative w-full touch-none select-none cursor-pointer rounded-2xl py-6"
              style={{ '--beam': cfg.beam } as React.CSSProperties}
            >
              <TimingBar
                position={position}
                zoneHalfWidth={cfg.zoneHalfWidth}
                beam={cfg.beam}
                frozen={Boolean(state.result)}
                slowMotion={state.isSlowMotion}
                markerPosition={state.result ? state.result.position : null}
              />
              {ripples.map((r) => (
                <span
                  key={r.id}
                  className="timing-ripple"
                  style={{ left: r.x, top: r.y, width: 24, height: 24 }}
                />
              ))}
            </button>
          </motion.div>
        )}

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && cfg && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
          >
            <TapResultScreen
              result={state.result}
              beam={cfg.beam}
              nextLabel={isFinalRound ? 'Results' : 'Next'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {/* ── Session complete (solo) ── */}
        {state.phase === 'session-complete' && cfg && (
          <motion.div
            key="session-complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <SessionSummary
              emoji="🎯"
              gameName="Timing Tap"
              gamePath="/games/timing-tap"
              subtitle={cfg.label}
              accent={cfg.color}
              roundScores={state.roundScores}
              isNewBest={state.isNewBestSession}
              bestSession={bestSession}
              onReplay={replay}
              onMenu={backToMenu}
            />
          </motion.div>
        )}

        {/* ── Challenge complete (multiplayer) ── */}
        {state.phase === 'challenge-complete' && challengeCode && (
          <motion.div
            key="challenge-complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <ChallengeComplete
              gameId={GAME_ID}
              code={challengeCode}
              roundScores={state.roundScores}
              onReplay={resetToMenu}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer: difficulty badge + sound */}
      <div className="flex justify-center items-center gap-3">
        {cfg && !isMenu && !isEnd && (
          <motion.span
            className="px-3 py-1 rounded-full text-xs font-mono border"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              color: cfg.color,
              borderColor: `${cfg.color}40`,
              background: `${cfg.color}10`,
            }}
          >
            {cfg.label}
          </motion.span>
        )}
        <SoundToggle />
      </div>
    </div>
  );
}
