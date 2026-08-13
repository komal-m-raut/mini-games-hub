'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Flame } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { MathResultScreen } from './components/MathResultScreen';
import { NumberPad } from './components/NumberPad';
import { QuestionCard } from './components/QuestionCard';
import { MATH_DIFFICULTY, ROUND_SECONDS } from './constants';
import { useMathSprintGame } from './useMathSprintGame';

const GAME_ID = 'math-sprint';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map(
  (id) => {
    const { label, qualifier, color, glow } = MATH_DIFFICULTY[id];
    return { id, label, qualifier, color, glow };
  }
);

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface MathSprintGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function MathSprintGame({ challengeCode }: MathSprintGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    pressDigit,
    pressBackspace,
    submitAnswer,
    skip,
    nextRound,
    replay,
    resetToMenu,
  } = useMathSprintGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  // Hardware keyboard: digits, Backspace and Enter work exactly like the
  // on-screen pad while a round is in progress.
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pressDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitAnswer();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, pressDigit, pressBackspace, submitAnswer]);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? MATH_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
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
        {state.phase === 'selecting-difficulty' && (
          <motion.div
            key={`menu-${menuView}`}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6 fade-up"
          >
            {menuView === 'mode' ? (
              <ModeSelector
                accent="#84CC16"
                onSolo={() => setMenuView('solo')}
                onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
                onFriendChallenge={() =>
                  router.push(challengePath(GAME_ID, generateChallengeCode()))
                }
              />
            ) : (
              <div className="flex flex-col gap-5">
                <DifficultySelector options={DIFFICULTY_OPTIONS} onSelect={selectDifficulty} />
                <button onClick={() => setMenuView('mode')} className="btn btn-sm btn-ghost mx-auto">
                  <ArrowLeft strokeWidth={2} />
                  Back
                </button>
              </div>
            )}
          </motion.div>
        )}

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

        {state.phase === 'countdown' && cfg && (
          <motion.div
            key={`countdown-${state.round}`}
            className="glass-card flex flex-col items-center justify-center gap-6 py-10"
            {...card}
          >
            <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
              Round {state.round} / {state.totalRounds} · {cfg.label}
            </p>
            <AnimatePresence mode="wait">
              <motion.span
                key={state.countdown}
                className="font-display text-7xl"
                style={{ color: cfg.color }}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.3, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 16 }}
              >
                {state.countdown}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        )}

        {state.phase === 'playing' && state.question && cfg && (
          <motion.div
            key={`playing-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <div className="flex items-center justify-between w-full">
              <GameTimer timeLeft={state.timeLeft} totalSeconds={ROUND_SECONDS} size="sm" />
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">
                    Correct
                  </p>
                  <p className="font-score text-2xl leading-none" style={{ color: cfg.color }}>
                    {state.correctCount}
                  </p>
                </div>
                <AnimatePresence>
                  {state.streak >= 2 && (
                    <motion.div
                      key={state.streak}
                      initial={{ opacity: 0, scale: 0.6, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      className="flex items-center gap-1 text-brand-yellow font-ui text-sm"
                      aria-label={`${state.streak} in a row`}
                    >
                      <Flame className="w-4 h-4" strokeWidth={2} fill="currentColor" />
                      {state.streak}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <QuestionCard
              question={state.question}
              input={state.input}
              isWrong={state.isWrong}
              accent={cfg.color}
            />

            <NumberPad
              onDigit={pressDigit}
              onBackspace={pressBackspace}
              onSubmit={submitAnswer}
              onSkip={skip}
              submitDisabled={state.input === ''}
              accent={cfg.color}
            />
          </motion.div>
        )}

        {state.phase === 'results' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <MathResultScreen
              result={state.result}
              nextLabel={isFinalRound ? 'Results' : 'Next Round'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="🔢"
              gameName="Math Sprint"
              gamePath="/games/math-sprint"
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

        {state.phase === 'challenge-complete' && challengeCode && (
          <motion.div key="challenge-complete" {...card}>
            <ChallengeComplete
              gameId={GAME_ID}
              code={challengeCode}
              roundScores={state.roundScores}
              onReplay={resetToMenu}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center items-center gap-3">
        {cfg && !isMenu && !isEnd && (
          <span
            className="px-3 py-1 rounded-full text-xs font-ui border"
            style={{
              color: cfg.color,
              borderColor: `${cfg.color}40`,
              background: `${cfg.color}10`,
            }}
          >
            {cfg.label}
          </span>
        )}
        <SoundToggle />
      </div>
    </div>
  );
}
