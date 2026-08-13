'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Heart } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { FlashGrid } from './FlashGrid';
import { GridResultScreen } from './GridResultScreen';
import { ACCENT, GRID_FLASH_DIFFICULTY, LIVES_PER_ROUND } from './constants';
import { useGridFlashGame } from './useGridFlashGame';

const GAME_ID = 'grid-flash';

interface GridFlashGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = GRID_FLASH_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: `${cfg.gridSize}×${cfg.gridSize} grid`,
    color: cfg.color,
    glow: cfg.glow,
  };
});

const PHASE_TITLE: Record<string, string> = {
  flash: 'Memorize the Pattern',
  recall: 'Tap It Back',
  'level-complete': 'Level Cleared!',
};

function LivesRow({ lives, total }: { lives: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`${lives} of ${total} lives remaining`}>
      {Array.from({ length: total }, (_, i) => {
        const alive = i < lives;
        return (
          <Heart
            key={i}
            className="w-4 h-4"
            strokeWidth={1.75}
            style={{ color: alive ? '#EF4444' : 'rgba(255,255,255,0.15)' }}
            fill={alive ? '#EF4444' : 'none'}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

export function GridFlashGame({ challengeCode }: GridFlashGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    tapTile,
    nextRound,
    replay,
    resetToMenu,
  } = useGridFlashGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? GRID_FLASH_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const isPlaying =
    state.phase === 'flash' || state.phase === 'recall' || state.phase === 'level-complete';

  const subtitle =
    state.phase === 'flash'
      ? `${state.pattern.length} tile${state.pattern.length === 1 ? '' : 's'} to remember`
      : state.phase === 'recall'
        ? `${state.selected.length}/${state.pattern.length} tiles`
        : `Level ${state.level} cleared`;

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
                soloHint="Three ladder rounds at your pace"
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

        {/* ── Flash → recall → level pause ── */}
        {isPlaying && cfg && (
          <motion.div
            key={`play-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8 px-4 sm:px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="font-display text-xl">{PHASE_TITLE[state.phase]}</p>
              <p className="font-ui text-xs text-ink-3">
                Level {state.level} · {subtitle}
              </p>
            </div>

            <LivesRow lives={state.lives} total={LIVES_PER_ROUND} />

            {/* Memorize countdown — the bar drains over the flash window */}
            <div className="w-full max-w-[400px] h-1 rounded-full bg-white/5 overflow-hidden">
              {state.phase === 'flash' && (
                <motion.div
                  key={state.flashKey}
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}55)`,
                    boxShadow: `0 0 10px ${ACCENT}80`,
                  }}
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: cfg.flashMs / 1000, ease: 'linear' }}
                />
              )}
            </div>

            <FlashGrid
              size={cfg.gridSize}
              lit={state.phase === 'flash' ? state.pattern : []}
              selected={state.selected}
              wrongCell={state.wrongCell}
              interactive={state.phase === 'recall' && state.lives > 0}
              onTap={tapTile}
            />

            <p className="font-ui text-xs text-ink-4 h-9 flex items-center text-center px-2">
              {state.phase === 'flash'
                ? 'Watch closely — it goes dark fast'
                : state.phase === 'level-complete'
                  ? 'Nice! Next pattern coming up…'
                  : 'Tap every tile that lit up — order doesn\'t matter'}
            </p>
          </motion.div>
        )}

        {/* ── Round results ── */}
        {state.phase === 'results' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8 px-4 sm:px-6"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <GridResultScreen
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
              emoji="🟦"
              gameName="Grid Flash"
              gamePath="/games/grid-flash"
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
