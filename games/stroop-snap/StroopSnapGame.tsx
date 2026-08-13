'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Flame } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { GameTimer } from '@/components/game/GameTimer';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { Difficulty } from '@/types/game';
import { ColorGrid } from './components/ColorGrid';
import { StroopResultScreen } from './components/StroopResultScreen';
import { TrialCard } from './components/TrialCard';
import { COLOR_POOL, GAME_ID, ROUND_SECONDS, STROOP_DIFFICULTY, getNetScore } from './constants';
import { useStroopSnapGame } from './useStroopSnapGame';

interface StroopSnapGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = STROOP_DIFFICULTY[id];
  return { id, label: cfg.label, qualifier: cfg.qualifier, color: cfg.color, glow: cfg.glow };
});

/** `mode="wait"` — see Timing Tap's identical note: the exit duration is the
 *  blank gap between phases, so it stays short and enter stays springy. */
const CARD_ENTER = { type: 'spring', stiffness: 280, damping: 28 } as const;
const CARD_EXIT = { duration: 0.16, ease: 'easeIn' } as const;

export function StroopSnapGame({ challengeCode }: StroopSnapGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    currentTrial,
    selectDifficulty,
    startChallenge,
    resolveTrial,
    nextRound,
    replay,
    resetToMenu,
  } = useStroopSnapGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  // 1–6 hotkeys, mapped to the pool in its fixed on-screen order — active
  // only while trials are live, exactly like the on-screen buttons.
  useEffect(() => {
    if (state.phase !== 'running' || !state.difficulty) return;
    const pool = COLOR_POOL[state.difficulty];
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const idx = Number(e.key) - 1;
      if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length) return;
      e.preventDefault();
      resolveTrial(pool[idx]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.difficulty, resolveTrial]);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? STROOP_DIFFICULTY[state.difficulty] : null;
  const pool = state.difficulty ? COLOR_POOL[state.difficulty] : [];
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const net = getNetScore(state.correct, state.wrong);

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
        </motion.div>
      )}

      {/* Countdown, running and results swap inside a floor-height stage so
          the page doesn't jump between the HUD, the button grid and the
          result card. */}
      <div className={isMenu || isEnd ? undefined : 'min-h-[26rem] sm:min-h-[30rem]'}>
        <AnimatePresence mode="wait">
          {/* ── Free-play menu: mode picker → solo difficulty ── */}
          {state.phase === 'selecting-difficulty' && (
            <motion.div
              key={`menu-${menuView}`}
              exit={{ opacity: 0, y: -12, transition: CARD_EXIT }}
              className="flex flex-col gap-6 fade-up"
            >
              {menuView === 'mode' && (
                <ModeSelector
                soloHint="Three 30-second sprints"
                  accent="#D946EF"
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
            <motion.div
              key="challenge-intro"
              exit={{ opacity: 0, y: -12, transition: CARD_EXIT }}
              className="fade-up"
            >
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
              className="glass-card flex flex-col items-center justify-center gap-6 py-8 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: CARD_EXIT }}
              transition={CARD_ENTER}
            >
              <div className="flex flex-col items-center gap-1.5">
                <p className="tap-eyebrow">Round {state.round}</p>
                <p className="font-display text-xl sm:text-2xl">Get Ready…</p>
              </div>
              <AnimatePresence mode="wait">
                <motion.span
                  key={state.countdown}
                  className="font-display text-6xl"
                  style={{ color: cfg.color }}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                >
                  {state.countdown}
                </motion.span>
              </AnimatePresence>
              <p className="tap-hint">Tap the INK colour — never the word</p>
            </motion.div>
          )}

          {/* ── Running: 30s of trials ── */}
          {state.phase === 'running' && cfg && currentTrial && (
            <motion.div
              key={`running-${state.round}`}
              className="glass-card flex flex-col items-center gap-5 py-6 px-4 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: CARD_EXIT }}
              transition={CARD_ENTER}
            >
              <div className="flex items-center justify-between w-full max-w-sm">
                <GameTimer timeLeft={state.timeLeft} totalSeconds={ROUND_SECONDS} size="sm" />
                <div className="flex flex-col items-center">
                  <p className="stat-label">Net</p>
                  <p className="font-score text-2xl leading-none" style={{ color: cfg.color }}>
                    {net}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 min-w-[3.5rem] justify-end text-brand-yellow font-ui text-sm">
                  <Flame className="w-4 h-4" strokeWidth={2} aria-hidden />
                  {state.streak}
                </div>
              </div>

              <TrialCard
                trial={currentTrial}
                trialIndex={state.trialIndex}
                lastAnswer={state.lastAnswer}
                flashSeq={state.flashSeq}
              />

              <ColorGrid pool={pool} onPick={resolveTrial} />
            </motion.div>
          )}

          {/* ── Results ── */}
          {state.phase === 'results' && state.result && (
            <motion.div
              key={`results-${state.round}`}
              className="glass-card flex flex-col justify-center py-8 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={CARD_ENTER}
              role="status"
              aria-live="polite"
            >
              <StroopResultScreen
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={CARD_ENTER}
            >
              <SessionSummary
                emoji="🎭"
                gameName="Stroop Snap"
                gamePath="/games/stroop-snap"
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
              transition={CARD_ENTER}
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
