'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bomb, Timer as TimerIcon } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { MineBoard } from './components/MineBoard';
import { MinesweeperResultScreen } from './components/MinesweeperResultScreen';
import { ACCENT, MINESWEEPER_DIFFICULTY } from './constants';
import { useMinesweeperGame } from './useMinesweeperGame';

const GAME_ID = 'minesweeper';

interface MinesweeperGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = MINESWEEPER_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: `${cfg.width}×${cfg.height} · ${cfg.mineCount} mines`,
    color: cfg.color,
    glow: cfg.glow,
  };
});

function formatElapsed(seconds: number): string {
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MinesweeperGame({ challengeCode }: MinesweeperGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    primaryAction,
    secondaryAction,
    toggleFlagMode,
    nextRound,
    replay,
    resetToMenu,
  } = useMinesweeperGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? MINESWEEPER_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const isPlaying = state.phase === 'playing';

  const flagsPlaced = state.board ? state.board.flagged.filter(Boolean).length : 0;
  const minesLeft = state.board ? state.board.mineCount - flagsPlaced : 0;

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
                soloHint="Three boards at your pace"
                accent={ACCENT}
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

        {/* ── Board ── */}
        {isPlaying && state.board && cfg && (
          <motion.div
            key={`play-${state.round}`}
            className="glass-card flex flex-col items-center gap-4 py-6 px-3 sm:px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            {/* HUD: mine counter, timer, flag-mode toggle */}
            <div className="flex items-center justify-between w-full max-w-[460px] px-1">
              <div
                className="flex items-center gap-1.5 font-score text-lg"
                aria-label={`${minesLeft} mines remaining`}
              >
                <Bomb className="w-4 h-4" strokeWidth={1.75} style={{ color: cfg.color }} />
                {minesLeft}
              </div>
              <p className="font-ui text-xs text-ink-3 uppercase tracking-widest">{cfg.label}</p>
              <div
                className="flex items-center gap-1.5 font-score text-lg tabular-nums"
                aria-label={`Elapsed time ${formatElapsed(state.elapsedSeconds)}`}
              >
                <TimerIcon className="w-4 h-4 text-ink-3" strokeWidth={1.75} />
                {formatElapsed(state.elapsedSeconds)}
              </div>
            </div>

            <MineBoard
              board={state.board}
              lostIndex={state.lostIndex}
              interactive={state.phase === 'playing'}
              onPrimary={primaryAction}
              onSecondary={secondaryAction}
            />

            <div className="flex items-center gap-3">
              <button
                onClick={toggleFlagMode}
                aria-pressed={state.flagMode}
                aria-label={state.flagMode ? 'Flag mode on — tap to switch to dig mode' : 'Dig mode on — tap to switch to flag mode'}
                className="btn btn-sm btn-secondary"
                style={{ '--btn-accent': state.flagMode ? '#F59E0B' : ACCENT } as React.CSSProperties}
              >
                <span aria-hidden="true">{state.flagMode ? '🚩' : '⛏️'}</span>
                {state.flagMode ? 'Flag mode' : 'Dig mode'}
              </button>
              <p className="font-ui text-2xs text-ink-4 hidden sm:block">
                Long-press or right-click to flag
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Round results ── */}
        {state.phase === 'round-complete' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8 px-4 sm:px-6"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <MinesweeperResultScreen
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
              emoji="💣"
              gameName="Minesweeper"
              gamePath="/games/minesweeper"
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
