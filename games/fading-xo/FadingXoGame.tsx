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
import { FadingXoBoard } from './components/FadingXoBoard';
import { GameResultBanner } from './components/GameResultBanner';
import { MatchPips } from './components/MatchPips';
import { RoundResultScreen } from './components/RoundResultScreen';
import { FADING_XO_DIFFICULTY, GAMES_PER_ROUND, PLAYER_MARK } from './constants';
import { isMovementPhase } from './engine';
import { useFadingXoGame } from './useFadingXoGame';

const GAME_ID = 'fading-xo';

const MARK_COLOR = { X: '#38BDF8', O: '#FB7185' } as const;

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map((id) => {
  const { label, qualifier, color, glow } = FADING_XO_DIFFICULTY[id];
  return { id, label, qualifier, color, glow };
});

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface FadingXoGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function FadingXoGame({ challengeCode }: FadingXoGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    playerMove,
    continueAfterGame,
    nextRound,
    replay,
    resetToMenu,
  } = useFadingXoGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? FADING_XO_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const latestScore = state.roundScores[state.roundScores.length - 1] ?? 0;

  const engine = state.engine;
  const isPlayerTurn = engine.turn === PLAYER_MARK && !engine.winner;
  const interactive = state.phase === 'playing' && isPlayerTurn && !state.isBotThinking;
  const playerInMovementPhase = isMovementPhase(engine, PLAYER_MARK);

  let statusLine: string;
  if (state.isBotThinking) {
    statusLine = "Bot is thinking…";
  } else if (isPlayerTurn && playerInMovementPhase) {
    statusLine = 'Your ghost moves next — tap an empty cell to teleport it';
  } else if (isPlayerTurn) {
    statusLine = 'Your turn — tap an empty cell to place a mark';
  } else {
    statusLine = "Bot's turn";
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {!isMenu && !isEnd && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={isChallenge ? resetToMenu : backToMenu} className="btn btn-sm btn-ghost -ml-3.5">
            <ArrowLeft strokeWidth={2} />
            {isChallenge ? 'Restart' : 'Menu'}
          </button>
          <ScoreCard
            score={latestScore}
            round={state.round}
            totalRounds={state.totalRounds}
            totalScore={state.totalScore}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {state.phase === 'selecting-difficulty' && (
          <motion.div key={`menu-${menuView}`} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 fade-up">
            {menuView === 'mode' ? (
              <ModeSelector
                soloHint="Three best-of-three duels"
                accent="#64748B"
                onSolo={() => setMenuView('solo')}
                onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
                onFriendChallenge={() => router.push(challengePath(GAME_ID, generateChallengeCode()))}
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

        {state.phase === 'playing' && cfg && (
          <motion.div
            key={`playing-${state.round}-${state.gameIndex}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            {...card}
          >
            <div className="flex items-center justify-between w-full px-2">
              <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
                Game {state.gameIndex} / {GAMES_PER_ROUND} · {cfg.label}
              </p>
              <MatchPips outcomes={state.outcomes} totalGames={GAMES_PER_ROUND} accent={cfg.color} />
            </div>

            <FadingXoBoard engine={engine} interactive={interactive} onCellTap={playerMove} markColor={MARK_COLOR} />

            <p
              className="font-ui text-sm text-center min-h-[1.5em]"
              style={{ color: isPlayerTurn ? MARK_COLOR.X : MARK_COLOR.O }}
              role="status"
              aria-live="polite"
            >
              {statusLine}
            </p>
          </motion.div>
        )}

        {state.phase === 'game-result' && state.lastOutcome && (
          <motion.div key={`game-result-${state.round}-${state.gameIndex}`} {...card}>
            <GameResultBanner
              outcome={state.lastOutcome}
              gameIndex={state.gameIndex}
              totalGames={GAMES_PER_ROUND}
              onContinue={continueAfterGame}
            />
          </motion.div>
        )}

        {state.phase === 'round-result' && state.result && (
          <motion.div
            key={`round-result-${state.round}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <RoundResultScreen
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
              emoji="👻"
              gameName="Fading XO"
              gamePath="/games/fading-xo"
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
            style={{ color: cfg.color, borderColor: `${cfg.color}40`, background: `${cfg.color}10` }}
          >
            {cfg.label}
          </span>
        )}
        <SoundToggle />
      </div>
    </div>
  );
}
