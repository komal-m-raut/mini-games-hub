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
import { HandButtons } from './components/HandButtons';
import { MatchResultScreen } from './components/MatchResultScreen';
import { RevealStage } from './components/RevealStage';
import { ScoreStrip } from './components/ScoreStrip';
import { RPS_DIFFICULTY } from './constants';
import { Throw } from './types';
import { useRpsArenaGame } from './useRpsArenaGame';

const GAME_ID = 'rps-arena';
const ACCENT = '#F59E0B';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map((id) => {
  const { label, qualifier, color, glow } = RPS_DIFFICULTY[id];
  return { id, label, qualifier, color, glow };
});

const KEY_TO_THROW: Record<string, Throw> = { '1': 'rock', '2': 'paper', '3': 'scissors' };

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface RpsArenaGameProps {
  /** When set, runs as a seeded 3-match challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function RpsArenaGame({ challengeCode }: RpsArenaGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    throwHand,
    nextRound,
    replay,
    resetToMenu,
  } = useRpsArenaGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  // Hardware keyboard: 1/2/3 mirror the on-screen hand buttons while a
  // throw is being chosen.
  useEffect(() => {
    if (state.phase !== 'choosing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const hand = KEY_TO_THROW[e.key];
      if (!hand) return;
      e.preventDefault();
      throwHand(hand);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, throwHand]);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? RPS_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalMatch = state.match >= state.totalRounds;
  const inMatch =
    state.phase === 'choosing' || state.phase === 'revealing' || state.phase === 'throw-result';

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
            round={state.match}
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
                soloHint="Three best-of-nine matches"
                accent={ACCENT}
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

        {inMatch && cfg && (
          <motion.div
            key={`match-${state.match}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <ScoreStrip
              match={state.match}
              totalMatches={state.totalRounds}
              playerWins={state.playerWins}
              botWins={state.botWins}
              playerStreak={state.playerStreak}
              accent={cfg.color}
            />

            <RevealStage
              playerThrow={state.playerThrow}
              botThrow={state.botThrow}
              revealCount={state.phase === 'choosing' ? 3 : state.revealCount}
              throwResult={state.phase === 'throw-result' ? state.throwResult : null}
              accent={cfg.color}
            />

            <HandButtons onThrow={throwHand} disabled={state.phase !== 'choosing'} accent={cfg.color} />
          </motion.div>
        )}

        {state.phase === 'match-result' && state.matchOutcome && (
          <motion.div
            key={`match-result-${state.match}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <MatchResultScreen
              outcome={state.matchOutcome}
              playerWins={state.playerWins}
              botWins={state.botWins}
              score={state.score}
              nextLabel={isFinalMatch ? 'Results' : 'Next Match'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="✊"
              gameName="RPS Arena"
              gamePath="/games/rps-arena"
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
