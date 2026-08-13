'use client';

import { useState } from 'react';
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
import { usePressAndHold } from '@/hooks/usePressAndHold';
import { Difficulty } from '@/types/game';
import { DurationBar } from './components/DurationBar';
import { HoldButton } from './components/HoldButton';
import { TimeSenseResultScreen } from './TimeSenseResultScreen';
import { DECOY_HZ, TIME_SENSE_DIFFICULTY, formatSeconds } from './constants';
import { useTimeSenseGame } from './useTimeSenseGame';

const GAME_ID = 'time-sense';

interface TimeSenseGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_QUALIFIER: Record<Difficulty, string> = {
  easy: 'Glow while you hold',
  medium: 'No feedback while holding',
  hard: 'No feedback + a decoy pulse',
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = TIME_SENSE_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: DIFFICULTY_QUALIFIER[id],
    color: cfg.color,
    glow: cfg.glow,
  };
});

export function TimeSenseGame({ challengeCode }: TimeSenseGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    startHold,
    endHold,
    nextRound,
    replay,
    resetToMenu,
  } = useTimeSenseGame({ challengeCode });

  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const holdHandlers = usePressAndHold({
    onStart: startHold,
    onEnd: endHold,
    disabled: state.phase !== 'recreate',
  });

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? TIME_SENSE_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

  const showPercent =
    state.targetMs > 0 ? Math.min(100, (state.showElapsedMs / state.targetMs) * 100) : 0;

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
                accent="#38BDF8"
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
          <motion.div key="challenge-intro" exit={{ opacity: 0, y: -20 }} className="fade-up">
            <ChallengeIntro
              gameId={GAME_ID}
              code={challengeCode}
              difficulties={challengeRounds.map((r) => r.difficulty)}
              onStart={startChallenge}
            />
          </motion.div>
        )}

        {/* ── SHOW: watch the bar fill over the exact target duration ── */}
        {state.phase === 'show' && cfg && (
          <motion.div
            key={`show-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="font-display text-xl">Watch the duration</p>
            <DurationBar
              percent={showPercent}
              secondsLabel={formatSeconds(Math.min(state.showElapsedMs, state.targetMs))}
              color={cfg.color}
              glow={cfg.glow}
            />
          </motion.div>
        )}

        {/* ── RECREATE: hold the button for what felt like the same length ── */}
        {state.phase === 'recreate' && cfg && (
          <motion.div
            key={`recreate-${state.round}`}
            className="glass-card relative overflow-hidden flex flex-col items-center gap-6 py-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* Hard's decoy: a background pulse at a fixed, wrong tempo,
                deliberately unrelated to any target — dropped entirely under
                reduced motion rather than merely slowed down. */}
            {cfg.decoy && !reducedMotion && (
              <motion.div
                aria-hidden
                className="absolute inset-0 pointer-events-none -z-10"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${cfg.glow}, transparent 70%)`,
                }}
                animate={{ opacity: [0.15, 0.6, 0.15], scale: [0.95, 1.05, 0.95] }}
                transition={{ duration: 1 / DECOY_HZ, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            <p className="font-display text-xl">
              {state.isHolding ? 'Release when it feels right' : 'Hold to recreate it'}
            </p>

            <DurationBar percent={0} secondsLabel={null} color={cfg.color} glow={cfg.glow} />

            <HoldButton
              holdHandlers={holdHandlers}
              isHolding={state.isHolding}
              accent={cfg.color}
              showGlow={cfg.showHoldGlow}
              holdElapsedMs={state.holdElapsedMs}
            />

            <p className="text-ink-3 text-xs font-ui">Press and hold, or use Space / Enter</p>
          </motion.div>
        )}

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
          >
            <TimeSenseResultScreen
              result={state.result}
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
              emoji="⏱️"
              gameName="Time Sense"
              gamePath="/games/time-sense"
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
