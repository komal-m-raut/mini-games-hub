'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Eraser } from 'lucide-react';
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
import { PathGrid } from './PathGrid';
import { PathResultScreen } from './PathResultScreen';
import { PATH_DIFFICULTY } from './constants';
import { useMemoryPathGame } from './useMemoryPathGame';

const GAME_ID = 'memory-path';

interface MemoryPathGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = PATH_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: `${cfg.size}×${cfg.size} grid`,
    color: cfg.color,
    glow: cfg.glow,
  };
});

const PHASE_TITLE: Record<string, string> = {
  revealing: 'Watch the Path',
  memorize: 'Memorize It!',
  fading: 'Get Ready…',
  tracing: 'Trace the Path',
};

export function MemoryPathGame({ challengeCode }: MemoryPathGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    traceCell,
    clearTrace,
    submitTrace,
    nextRound,
    replay,
    resetToMenu,
  } = useMemoryPathGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? PATH_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const isWatching =
    state.phase === 'revealing' || state.phase === 'memorize' || state.phase === 'fading';
  const isTracing = state.phase === 'tracing';

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
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            {menuView === 'mode' && (
              <ModeSelector
                accent="#A855F7"
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
                  className="mx-auto flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
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
          <motion.div
            key="challenge-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ChallengeIntro
              gameId={GAME_ID}
              code={challengeCode}
              difficulties={challengeRounds.map((r) => r.difficulty)}
              onStart={startChallenge}
            />
          </motion.div>
        )}

        {/* ── Reveal → memorize → fade → trace ── */}
        {(isWatching || isTracing) && cfg && (
          <motion.div
            key={`play-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8 px-4 sm:px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="font-display text-xl font-bold text-white">
                {PHASE_TITLE[state.phase]}
              </p>
              <p className="font-mono text-xs text-white/40">
                {isTracing
                  ? `${state.traced.length}/${state.path.length} cells · ${(
                      state.traceMs / 1000
                    ).toFixed(1)}s`
                  : `${state.revealCount}/${state.path.length} cells`}
              </p>
            </div>

            {/* Memorize countdown — the bar drains over the viewing window */}
            <div className="w-full max-w-[400px] h-1 rounded-full bg-white/5 overflow-hidden">
              {state.phase === 'memorize' && (
                <motion.div
                  key={`memo-${state.round}`}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${cfg.neon}, ${cfg.neon}55)`,
                    boxShadow: `0 0 10px ${cfg.neon}80`,
                  }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: cfg.memorizeMs / 1000, ease: 'linear' }}
                />
              )}
            </div>

            <PathGrid
              size={cfg.size}
              neon={cfg.neon}
              revealed={isTracing ? [] : state.path.slice(0, state.revealCount)}
              traced={state.traced}
              startCell={
                isTracing && cfg.showStartHint && state.traced.length === 0 ? state.path[0] : null
              }
              interactive={isTracing}
              fading={state.phase === 'fading'}
              onTraceCell={traceCell}
            />

            {isTracing ? (
              <div className="flex gap-3 w-full max-w-sm">
                <NeonButton
                  variant="ghost"
                  size="sm"
                  onClick={clearTrace}
                  disabled={state.traced.length === 0 || state.locked}
                  className="flex-1 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Eraser className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  Clear
                </NeonButton>
                <NeonButton
                  variant="primary"
                  size="sm"
                  onClick={submitTrace}
                  disabled={state.traced.length === 0}
                  className="flex-1 whitespace-nowrap"
                  glow="rgba(124, 58, 237, 0.5)"
                >
                  Submit
                </NeonButton>
              </div>
            ) : (
              <p className="font-mono text-xs text-white/25 h-9 flex items-center">
                {state.phase === 'fading' ? 'Drag to retrace it…' : 'Follow the glow'}
              </p>
            )}
          </motion.div>
        )}

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && cfg && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8 px-4 sm:px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <PathResultScreen
              result={state.result}
              path={state.path}
              traced={state.traced}
              size={cfg.size}
              neon={cfg.neon}
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
              emoji="🧠"
              gameName="Memory Path"
              gamePath="/games/memory-path"
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
