'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Undo2 } from 'lucide-react';
import { ModeSelector } from '@/components/game/ModeSelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { Board } from './components/Board';
import { Controls } from './components/Controls';
import { RoundResultScreen } from './components/RoundResultScreen';
import { SoloResultScreen } from './components/SoloResultScreen';
import { WonBanner } from './components/WonBanner';
import { GAME_ID, SPRINT_SECONDS, SWIPE_THRESHOLD_PX } from './constants';
import { Direction } from './engine';
import { use2048Game } from './use2048Game';

const ACCENT = '#FB923C';

// ChallengeIntro's round-preview chips are shared UI built around a
// Difficulty per round; 2048's 3 challenge rounds are actually identical
// 90-second sprints with no difficulty ladder of their own (see content.ts's
// FAQ), so this is a fixed, cosmetic label sequence purely to match the
// site-wide "Round 1/2/3" convention every other challenge intro shows —
// not a claim that round 3 is harder than round 1.
const ROUND_LABELS: Difficulty[] = ['easy', 'medium', 'hard'];

const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
};

interface Game2048Props {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function Game2048({ challengeCode }: Game2048Props = {}) {
  const {
    state,
    rawBest,
    challengeRounds,
    startSolo,
    startChallenge,
    move,
    undo,
    dismissWonBanner,
    nextRound,
    replaySolo,
    resetToMenu,
  } = use2048Game({ challengeCode });

  const router = useRouter();

  // Hardware keyboard: arrow keys and WASD both move, mirroring the
  // on-screen chevrons and swipe. preventDefault stops the page itself from
  // scrolling on the arrow keys/space, which it otherwise would.
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = DIRECTION_KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      move(dir);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, move]);

  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'menu' || state.phase === 'challenge-intro';
  const canUndo = state.mode === 'solo' && Boolean(state.undoSnapshot) && !state.undoUsed;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {!isMenu && state.phase !== 'game-over' && state.phase !== 'challenge-complete' && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={resetToMenu} className="btn btn-sm btn-ghost -ml-3.5">
            <ArrowLeft strokeWidth={2} />
            {isChallenge ? 'Restart' : 'Menu'}
          </button>

          {state.phase === 'playing' && (
            <div className="flex items-center gap-3">
              {isChallenge && (
                <GameTimer timeLeft={state.timeLeft} totalSeconds={SPRINT_SECONDS} size="sm" />
              )}
              <div className="text-right">
                <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">
                  Score
                </p>
                <p className="font-score text-2xl leading-none" style={{ color: ACCENT }}>
                  {state.score.toLocaleString()}
                </p>
                {!isChallenge && (
                  <p className="font-score text-2xs text-ink-3 leading-none mt-0.5">
                    Best {rawBest.toLocaleString()}
                  </p>
                )}
                {isChallenge && (
                  <p className="font-score text-2xs text-ink-3 leading-none mt-0.5">
                    Round {state.round}/{state.totalRounds}
                  </p>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {state.phase === 'menu' && (
          <motion.div key="menu" exit={{ opacity: 0, y: -20 }} className="fade-up">
            <ModeSelector
              soloHint="Endless classic run"
              accent={ACCENT}
              onSolo={startSolo}
              onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
              onFriendChallenge={() => router.push(challengePath(GAME_ID, generateChallengeCode()))}
            />
          </motion.div>
        )}

        {state.phase === 'challenge-intro' && challengeCode && challengeRounds && (
          <motion.div key="challenge-intro" exit={{ opacity: 0, y: -20 }} className="fade-up">
            <ChallengeIntro
              gameId={GAME_ID}
              code={challengeCode}
              difficulties={ROUND_LABELS}
              onStart={startChallenge}
            />
          </motion.div>
        )}

        {state.phase === 'countdown' && (
          <motion.div
            key={`countdown-${state.round}`}
            className="glass-card flex flex-col items-center justify-center gap-6 py-10"
            {...card}
          >
            <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
              Round {state.round} / {state.totalRounds} · 90s sprint
            </p>
            <AnimatePresence mode="wait">
              <motion.span
                key={state.countdown}
                className="font-display text-7xl"
                style={{ color: ACCENT }}
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

        {state.phase === 'playing' && (
          <motion.div key="playing" className="flex flex-col items-center gap-5" {...card}>
            <Board
              board={state.board}
              lastMoveDir={state.lastMoveDir}
              moveSeq={state.moves}
              interactive
              swipeThreshold={SWIPE_THRESHOLD_PX}
              onMove={move}
            />
            <Controls accent={ACCENT} disabled={false} onMove={move} />
            {state.mode === 'solo' && (
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className="btn btn-sm btn-ghost disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Undo2 strokeWidth={1.5} />
                Undo
              </button>
            )}
            <WonBanner visible={state.showWonBanner} onKeepGoing={dismissWonBanner} />
          </motion.div>
        )}

        {state.phase === 'round-results' && state.result && (
          <motion.div key={`results-${state.round}`} className="glass-card py-8" {...card} role="status" aria-live="polite">
            <RoundResultScreen
              result={state.result}
              nextLabel={state.round >= state.totalRounds ? 'Results' : 'Next Round'}
              onNext={nextRound}
            />
          </motion.div>
        )}

        {state.phase === 'game-over' && (
          <motion.div key="game-over" {...card}>
            <SoloResultScreen
              score={state.score}
              bestTile={state.bestTileThisRun}
              moves={state.moves}
              isNewBest={state.isNewBestScore}
              onReplay={replaySolo}
              onMenu={resetToMenu}
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
        <SoundToggle />
      </div>
    </div>
  );
}
