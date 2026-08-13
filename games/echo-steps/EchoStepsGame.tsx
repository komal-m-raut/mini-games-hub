'use client';

import { useEffect, useState } from 'react';
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
import { PadBoard } from './PadBoard';
import { EchoResultScreen } from './EchoResultScreen';
import { ACCENT, ECHO_STEPS_DIFFICULTY } from './constants';
import { useEchoStepsGame } from './useEchoStepsGame';

const GAME_ID = 'echo-steps';

interface EchoStepsGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = ECHO_STEPS_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: `Starts at ${cfg.start} · par ${cfg.par}`,
    color: cfg.color,
    glow: cfg.glow,
  };
});

const PHASE_TITLE: Record<string, string> = {
  playback: 'Watch & Listen',
  input: 'Repeat It Back',
  'level-complete': 'Sequence Locked In!',
};

export function EchoStepsGame({ challengeCode }: EchoStepsGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    tapPad,
    nextRound,
    replay,
    resetToMenu,
  } = useEchoStepsGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? ECHO_STEPS_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const isPlaying =
    state.phase === 'playback' || state.phase === 'input' || state.phase === 'level-complete';
  const interactive = state.phase === 'input';

  // Keyboard 1–4 maps to the four pads, only while input is being accepted.
  useEffect(() => {
    if (!interactive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const index = ['1', '2', '3', '4'].indexOf(e.key);
      if (index === -1) return;
      e.preventDefault();
      tapPad(index);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [interactive, tapPad]);

  const litPad =
    state.phase === 'playback' ? state.playbackIndex : state.phase === 'input' ? state.tappedPad : null;

  const subtitle =
    state.phase === 'playback'
      ? `${state.sequence.length} note${state.sequence.length === 1 ? '' : 's'} — watch closely`
      : state.phase === 'input'
        ? `${state.inputProgress}/${state.sequence.length} tapped`
        : `${state.length} notes locked in`;

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
                soloHint="Three sequence ladders"
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

        {/* ── Playback → input → level pause ── */}
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
              <p className="font-ui text-xs text-ink-3">{subtitle}</p>
            </div>

            <PadBoard
              litPad={litPad}
              wrongPad={state.wrongPad}
              revealPad={state.revealPad}
              interactive={interactive}
              onTap={tapPad}
            />

            <p className="font-ui text-xs text-ink-4 h-9 flex items-center text-center px-2">
              {state.phase === 'playback'
                ? 'Watch and listen — the whole sequence plays each time'
                : state.phase === 'level-complete'
                  ? 'Nice! One more note coming up…'
                  : "Tap the pads back in the same order — keys 1–4 work too"}
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
            <EchoResultScreen
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
              emoji="🚦"
              gameName="Echo Steps"
              gamePath="/games/echo-steps"
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
