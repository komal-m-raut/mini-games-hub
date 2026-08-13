'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { NeonButton } from '@/components/ui/NeonButton';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { FlashRing } from './components/FlashRing';
import { ShapeDragStage } from './components/ShapeDragStage';
import { ShapeFlashStage } from './components/ShapeFlashStage';
import { ShapeResultScreen } from './components/ShapeResultScreen';
import { ShapeSliders } from './components/ShapeSliders';
import { GAME_ID, SHAPE_DIFFICULTY } from './constants';
import { useShapeEchoGame } from './useShapeEchoGame';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map((id) => {
  const { label, qualifier, color, glow } = SHAPE_DIFFICULTY[id];
  return { id, label, qualifier, color, glow };
});

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface ShapeEchoGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function ShapeEchoGame({ challengeCode }: ShapeEchoGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    flashKey,
    selectDifficulty,
    startChallenge,
    setGuess,
    submit,
    nextRound,
    replay,
    resetToMenu,
  } = useShapeEchoGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? SHAPE_DIFFICULTY[state.difficulty] : null;
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
                accent="#0EA5E9"
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

        {state.phase === 'flashing' && cfg && (
          <motion.div
            key={`flash-${state.round}`}
            className="glass-card p-0 overflow-hidden flex flex-col"
            {...card}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <p className="font-display text-3xl sm:text-4xl lowercase">memorise</p>
              <p className="font-score text-sm text-ink-3">
                {state.round} / {state.totalRounds}
              </p>
            </div>
            <div className="relative">
              <ShapeFlashStage target={state.target} color={cfg.color} />
              <FlashRing
                totalSeconds={cfg.flashSeconds}
                timeLeft={state.flashTimeLeft}
                flashKey={flashKey}
                color={cfg.color}
                className="absolute top-3 right-3"
              />
            </div>
          </motion.div>
        )}

        {state.phase === 'recreating' && cfg && (
          <motion.div
            key={`recreate-${state.round}`}
            className="glass-card p-0 overflow-hidden flex flex-col"
            {...card}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
              <p className="font-display text-3xl sm:text-4xl lowercase">recreate</p>
              <p className="font-score text-sm text-ink-3">
                {state.round} / {state.totalRounds}
              </p>
            </div>

            <ShapeDragStage
              type={state.target.type}
              ratio={state.target.ratio}
              guess={state.guess}
              color={cfg.color}
              onChange={setGuess}
            />

            <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6">
              <ShapeSliders
                guess={state.guess}
                showRotation={cfg.rotationEnabled}
                color={cfg.color}
                onChange={setGuess}
              />

              <NeonButton
                variant="primary"
                size="lg"
                onClick={submit}
                fullWidth
                className="flex items-center justify-center gap-2"
              >
                <Check strokeWidth={2.5} />
                Confirm
              </NeonButton>
            </div>
          </motion.div>
        )}

        {state.phase === 'results' && state.result && cfg && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card p-0 overflow-hidden flex flex-col"
            {...card}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-2 sm:px-6 sm:pt-6">
              <p className="font-display text-3xl sm:text-4xl lowercase">result</p>
              <p className="font-score text-sm text-ink-3">
                {state.round} / {state.totalRounds}
              </p>
            </div>
            <ShapeResultScreen
              result={state.result}
              color={cfg.color}
              nextLabel={isFinalRound ? 'Results' : 'Next Shape'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="🔷"
              gameName="Shape Echo"
              gamePath="/games/shape-echo"
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
