'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
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
import { DigitSlots } from './components/DigitSlots';
import { NumberDisplay } from './components/NumberDisplay';
import { NumberPad } from './components/NumberPad';
import { RecallResultScreen } from './components/RecallResultScreen';
import { RECALL_DIFFICULTY, getDisplayMs } from './constants';
import { useNumberRecallGame } from './useNumberRecallGame';

const GAME_ID = 'number-recall';

interface NumberRecallGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map(
  (id) => {
    const cfg = RECALL_DIFFICULTY[id];
    return { id, label: cfg.label, qualifier: cfg.qualifier, color: cfg.color, glow: cfg.glow };
  }
);

const PHASE_TITLE: Record<string, string> = {
  display: 'Memorize the Number',
  input: 'Type It Back',
  'level-up': 'Correct!',
};

export function NumberRecallGame({ challengeCode }: NumberRecallGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    pressDigit,
    backspace,
    submitEntry,
    nextRound,
    replay,
    resetToMenu,
  } = useNumberRecallGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? RECALL_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const isPlaying =
    state.phase === 'display' || state.phase === 'input' || state.phase === 'level-up';

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
                accent="#14B8A6"
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

        {/* ── Display → input → level-up ── */}
        {isPlaying && cfg && state.difficulty && (
          <motion.div
            key={`play-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-8 px-4 sm:px-6"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="flex flex-col items-center gap-1">
              <p className="font-display text-xl">{PHASE_TITLE[state.phase]}</p>
              <p className="font-ui text-xs text-ink-3">
                Round {state.round}/{state.totalRounds} · {state.level} digit
                {state.level === 1 ? '' : 's'}
              </p>
            </div>

            {state.phase === 'display' && (
              <NumberDisplay
                digits={state.target}
                accent={cfg.color}
                displayMs={getDisplayMs(state.level, state.difficulty)}
                attemptKey={state.displayAttempt}
              />
            )}

            {(state.phase === 'input' || state.phase === 'level-up') && (
              <div className="flex flex-col items-center gap-6 w-full">
                <DigitSlots length={state.target.length} digits={state.entry} accent={cfg.color} />
                <NumberPad
                  onDigit={pressDigit}
                  onBackspace={backspace}
                  onSubmit={submitEntry}
                  canBackspace={state.entry.length > 0}
                  canSubmit={state.entry.length === state.target.length}
                  disabled={state.phase !== 'input'}
                  accent={cfg.color}
                />
              </div>
            )}

            <p className="font-ui text-xs text-ink-4 h-5 flex items-center text-center px-2">
              {state.phase === 'display'
                ? 'Watch closely — it only shows once'
                : state.phase === 'level-up'
                  ? 'Next number coming up…'
                  : 'Type it back, then submit'}
            </p>
          </motion.div>
        )}

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && cfg && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8 px-4 sm:px-6"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <RecallResultScreen
              result={state.result}
              accent={cfg.color}
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
              emoji="🔟"
              gameName="Number Recall"
              gamePath="/games/number-recall"
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
