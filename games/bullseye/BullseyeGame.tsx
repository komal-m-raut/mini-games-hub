'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Dartboard } from './components/Dartboard';
import { DartHud } from './components/DartHud';
import { RoundResultScreen } from './components/RoundResultScreen';
import { BULLSEYE_DIFFICULTY, DARTS_PER_ROUND } from './constants';
import { useBullseyeGame } from './useBullseyeGame';

const GAME_ID = 'bullseye';

interface BullseyeGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_QUALIFIER: Record<Difficulty, string> = {
  easy: 'Slow sweep · wide scatter',
  medium: 'Quicker sweep · tighter scatter',
  hard: 'Fast, drifting sweep · razor scatter',
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = BULLSEYE_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: DIFFICULTY_QUALIFIER[id],
    color: cfg.color,
    glow: cfg.glow,
  };
});

const CARD_EXIT = { duration: 0.16, ease: 'easeIn' } as const;

const AIM_HINT: Record<'aiming-y' | 'aiming-x', string> = {
  'aiming-y': 'Lock the vertical read',
  'aiming-x': 'Lock the horizontal read',
};

export function BullseyeGame({ challengeCode }: BullseyeGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    lockAim,
    nextRound,
    replay,
    resetToMenu,
  } = useBullseyeGame({ challengeCode });

  const router = useRouter();
  const reducedMotion = Boolean(useReducedMotion());
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const registerTap = useCallback(() => {
    if (state.phase !== 'aiming-y' && state.phase !== 'aiming-x') return;
    lockAim();
  }, [state.phase, lockAim]);

  const handlePointerDown = useCallback(() => {
    registerTap();
  }, [registerTap]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.repeat) return;
      e.preventDefault();
      e.stopPropagation();
      registerTap();
    },
    [registerTap]
  );

  // Space works even when the tap surface has lost focus.
  useEffect(() => {
    if (state.phase !== 'aiming-y' && state.phase !== 'aiming-x') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== ' ') return;
      if (e.repeat) return;
      e.preventDefault();
      registerTap();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, registerTap]);

  // Instant replay: Space/Enter chains straight into the next round.
  useEffect(() => {
    if (state.phase !== 'round-result') return;
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

  const cfg = state.difficulty ? BULLSEYE_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isPlay = state.phase === 'aiming-y' || state.phase === 'aiming-x' || state.phase === 'landing';
  const isFinalRound = state.round >= state.totalRounds;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Top bar */}
      {!isMenu && !isEnd && (
        <motion.div
          className="flex flex-col gap-3"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={isChallenge ? resetToMenu : backToMenu}
              className="btn btn-sm btn-ghost -ml-3.5"
            >
              <ArrowLeft strokeWidth={2} />
              {isChallenge ? 'Restart' : 'Menu'}
            </button>
            <ScoreCard
              score={state.score}
              round={state.round}
              totalRounds={state.totalRounds}
              totalScore={state.totalScore}
            />
          </div>
          {isPlay && cfg && <DartHud darts={state.darts} beam={cfg.beam} />}
        </motion.div>
      )}

      <div className={isMenu || isEnd ? undefined : 'min-h-[26rem] sm:min-h-[30rem]'}>
        <AnimatePresence mode="wait">
          {/* ── Free-play menu ── */}
          {state.phase === 'selecting-difficulty' && (
            <motion.div
              key={`menu-${menuView}`}
              exit={{ opacity: 0, y: -12, transition: CARD_EXIT }}
              className="flex flex-col gap-6 fade-up"
            >
              {menuView === 'mode' && (
                <ModeSelector
                  accent="#F43F5E"
                  soloHint="Three rounds of five darts"
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
                    className="btn btn-sm btn-ghost mx-auto"
                  >
                    <ArrowLeft strokeWidth={2} />
                    Back
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Challenge intro ── */}
          {state.phase === 'challenge-intro' && challengeCode && challengeRounds && (
            <motion.div key="challenge-intro" exit={{ opacity: 0, y: -12, transition: CARD_EXIT }} className="fade-up">
              <ChallengeIntro
                gameId={GAME_ID}
                code={challengeCode}
                difficulties={challengeRounds.map((r) => r.difficulty)}
                onStart={startChallenge}
              />
            </motion.div>
          )}

          {/* ── Throw: aim, lock, land ── */}
          {isPlay && cfg && (
            <motion.div
              key={`play-${state.round}`}
              className="glass-card flex flex-col items-center justify-center gap-5 py-8 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: CARD_EXIT }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <div className="flex flex-col items-center gap-1.5">
                <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
                  Dart {state.dartIndex} of {DARTS_PER_ROUND}
                </p>
                <p className="font-display text-xl sm:text-2xl">
                  {state.phase === 'landing'
                    ? 'Thunk!'
                    : AIM_HINT[state.phase as 'aiming-y' | 'aiming-x']}
                </p>
              </div>

              <button
                type="button"
                onPointerDown={handlePointerDown}
                onKeyDown={handleKeyDown}
                aria-label="Tap to lock the current aim line"
                className="relative w-full py-2 rounded-2xl cursor-pointer select-none touch-manipulation"
              >
                <Dartboard
                  phase={state.phase}
                  aimPosition={state.aimPosition}
                  lockedY={state.lockedY}
                  darts={state.darts}
                  lastDart={state.lastDart}
                  beam={cfg.beam}
                  reducedMotion={reducedMotion}
                />
              </button>

              <p className="font-ui text-xs sm:text-sm flex items-center gap-1.5 text-ink-3 flex-wrap justify-center">
                {state.phase === 'landing' ? (
                  <span>Next dart incoming…</span>
                ) : (
                  <>
                    Tap the board, or press <kbd className="px-2 py-0.5 rounded-md border border-white/10 bg-white/5">Space</kbd>
                  </>
                )}
              </p>
            </motion.div>
          )}

          {/* ── Round result ── */}
          {state.phase === 'round-result' && cfg && (
            <motion.div
              key={`round-result-${state.round}`}
              className="glass-card flex flex-col justify-center py-8 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              role="status"
              aria-live="polite"
            >
              <RoundResultScreen
                darts={state.darts}
                score={state.score}
                roundAccuracy={state.roundAccuracy}
                accent={cfg.color}
                nextLabel={isFinalRound ? 'Results' : 'Next Round'}
                onNext={nextRound}
                onMenu={resetToMenu}
              />
            </motion.div>
          )}

          {/* ── Session complete (solo) ── */}
          {state.phase === 'session-complete' && cfg && (
            <motion.div
              key="session-complete"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            >
              <SessionSummary
                emoji="🏹"
                gameName="Bullseye"
                gamePath="/games/bullseye"
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

          {/* ── Challenge complete ── */}
          {state.phase === 'challenge-complete' && challengeCode && (
            <motion.div
              key="challenge-complete"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
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
      </div>

      {/* Footer: difficulty badge + sound */}
      <div className="flex justify-center items-center gap-3">
        {cfg && !isMenu && !isEnd && (
          <motion.span
            className="px-3 py-1 rounded-full text-xs font-ui border"
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
