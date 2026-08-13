'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Pause } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import {
  MAX_CHALLENGE_SCORE,
  challengePath,
  generateChallengeCode,
  getDailyChallengeCode,
} from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { formatScore } from '@/utils/scoring';
import { DPad } from './components/DPad';
import { SnakeCanvas } from './components/SnakeCanvas';
import { SnakeResultScreen } from './components/SnakeResultScreen';
import { SnakeRoundResult } from './components/SnakeRoundResult';
import { CHALLENGE_ROUND_SECONDS, GAME_ID, SNAKE_DIFFICULTY, scoreRound } from './constants';
import { Direction } from './engine';
import { useSnakeGame } from './useSnakeGame';

interface SnakeGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map(
  (id) => {
    const { label, qualifier, color, glow } = SNAKE_DIFFICULTY[id];
    return { id, label, qualifier, color, glow };
  }
);

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const SWIPE_THRESHOLD_PX = 24;

// Touch-device detection via useSyncExternalStore rather than a
// useState+useEffect pair — hydration-safe (server snapshot is always
// false, so there's no SSR/client mismatch) and reacts live if the pointer
// type ever changes (e.g. a 2-in-1 laptop folding into tablet mode). Same
// pattern as TypeStormGame's on-screen keyboard gating.
function subscribeCoarsePointer(callback: () => void): () => void {
  const mql = window.matchMedia('(pointer: coarse)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}
const getCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;
const getServerCoarsePointer = () => false;

export function SnakeGame({ challengeCode }: SnakeGameProps = {}) {
  const {
    state,
    reducedMotion,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    queueDirection,
    togglePause,
    resume,
    nextRound,
    replay,
    resetToMenu,
  } = useSnakeGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  const isCoarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointer,
    getServerCoarsePointer
  );

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? SNAKE_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'game-over' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

  // Hardware keyboard: arrows/WASD queue a turn, 'P'/Escape toggles pause,
  // and — while paused — any key at all resumes (see the overlay below for
  // the tap-to-resume half of that).
  useEffect(() => {
    if (state.phase !== 'running') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (state.paused) {
        e.preventDefault();
        resume();
        return;
      }
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          queueDirection('up');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          queueDirection('down');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          queueDirection('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          queueDirection('right');
          break;
        case 'p':
        case 'P':
        case 'Escape':
          e.preventDefault();
          togglePause();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.paused, queueDirection, togglePause, resume]);

  // Swipe: a drag past the 24px threshold queues a turn along its dominant
  // axis, then re-origins from the current point so one continuous drag can
  // chain several turns (mirrors the keyboard's 2-deep queue in feel).
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const handlePointerDown = (e: React.PointerEvent) => {
    if (state.phase !== 'running') return;
    if (state.paused) {
      resume();
      return;
    }
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    const start = swipeStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX && Math.abs(dy) < SWIPE_THRESHOLD_PX) return;
    const direction: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    queueDirection(direction);
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  };
  const handlePointerEnd = () => {
    swipeStartRef.current = null;
  };

  const liveScore = state.engine ? scoreRound(state.engine.foodEaten) : 0;
  const totalRoundScore =
    state.roundScores.reduce((a, b) => a + b, 0) + (state.phase === 'running' ? liveScore : 0);

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

          <div className="flex items-center gap-3">
            {isChallenge ? (
              <>
                <div className="text-right">
                  <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">
                    Round {state.round}/{state.totalRounds}
                  </p>
                  <p className="font-score text-lg leading-none">
                    {state.engine?.foodEaten ?? 0}
                    <span className="text-ink-3 text-xs"> food</span>
                  </p>
                  <p className="font-score text-2xs text-ink-3 leading-none mt-0.5">
                    {formatScore(totalRoundScore)}/{MAX_CHALLENGE_SCORE}
                  </p>
                </div>
                <GameTimer timeLeft={state.timeLeft} totalSeconds={CHALLENGE_ROUND_SECONDS} size="sm" />
              </>
            ) : (
              <div className="text-right">
                <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">
                  Food
                </p>
                <p className="font-score text-xl leading-none">{state.engine?.foodEaten ?? 0}</p>
                <p className="font-score text-2xs text-ink-3 leading-none mt-0.5">
                  Length {state.engine?.snake.length ?? 0}
                </p>
              </div>
            )}
            {state.phase === 'running' && (
              <button
                onClick={togglePause}
                className="btn btn-sm btn-ghost"
                aria-label={state.paused ? 'Resume' : 'Pause'}
                title={state.paused ? 'Resume (P)' : 'Pause (P)'}
              >
                <Pause strokeWidth={2} />
              </button>
            )}
          </div>
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
                accent="#4ADE80"
                soloHint="Endless run at your difficulty"
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

        {state.phase === 'running' && state.engine && cfg && (
          <motion.div
            key={`running-${state.round}`}
            className="glass-card flex flex-col items-center gap-4 py-6 px-4 sm:px-6"
            {...card}
          >
            <div
              className="relative w-full"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              style={{ touchAction: 'none' }}
            >
              <SnakeCanvas engine={state.engine} reducedMotion={reducedMotion} />
              {state.paused && (
                <button
                  type="button"
                  onClick={resume}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
                  style={{ background: isChallenge ? 'rgba(6,8,15,0.97)' : 'rgba(6,8,15,0.72)' }}
                >
                  <p className="font-display text-2xl text-white">Paused</p>
                  <p className="text-ink-3 text-sm font-ui px-4 text-center">
                    Tap or press any key to resume
                    {isChallenge && ' — the board stays hidden while paused'}
                  </p>
                </button>
              )}
            </div>

            {isCoarsePointer && !state.paused && <DPad onPress={queueDirection} accent={cfg.color} />}
          </motion.div>
        )}

        {state.phase === 'results' && (
          <motion.div key={`results-${state.round}`} className="glass-card py-8" {...card}>
            <SnakeRoundResult
              foodEaten={state.lastRoundFoodEaten}
              score={state.roundScores[state.roundScores.length - 1] ?? 0}
              survivedFullRound={!state.lastRoundDied}
              nextLabel={isFinalRound ? 'Results' : 'Next Round'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'game-over' && state.difficulty && state.engine && (
          <motion.div key="game-over" {...card}>
            <SnakeResultScreen
              difficulty={state.difficulty}
              length={state.engine.snake.length}
              foodEaten={state.engine.foodEaten}
              isNewBest={state.isNewBestSession}
              best={state.bestForDifficulty}
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
