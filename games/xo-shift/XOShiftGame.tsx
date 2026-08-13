'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bot, User } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { GameResultCard } from './components/GameResultCard';
import { LastMove, XOBoard } from './components/XOBoard';
import { RoundPips } from './components/RoundPips';
import { RoundResultScreen } from './components/RoundResultScreen';
import { GAMES_PER_ROUND, GAME_ID, XO_DIFFICULTY } from './constants';
import { BoardState, Move, legalMoves } from './engine';
import { useXOShiftGame } from './useXOShiftGame';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map((id) => {
  const { label, qualifier, color, glow } = XO_DIFFICULTY[id];
  return { id, label, qualifier, color, glow };
});

/** Shared entrance/exit for every phase card. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface TurnIndicatorProps {
  isPlayerTurn: boolean;
  botThinking: boolean;
  accent: string;
}

function TurnIndicator({ isPlayerTurn, botThinking, accent }: TurnIndicatorProps) {
  const Icon = isPlayerTurn ? User : Bot;
  const label = botThinking ? 'Bot is thinking…' : isPlayerTurn ? 'Your move' : "Bot's move";

  return (
    <div className="flex items-center gap-2 font-ui text-sm" style={{ color: isPlayerTurn ? accent : 'var(--ink-2, #cbd5e1)' }}>
      <motion.span
        className="grid place-items-center w-7 h-7 rounded-full"
        style={{ background: `${accent}1c`, border: `1px solid ${accent}40` }}
        animate={botThinking ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
        transition={botThinking ? { duration: 1.1, repeat: Infinity } : undefined}
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      </motion.span>
      {label}
    </div>
  );
}

/** Diffs two boards to find the single cell that changed, so the board can
 *  slide/pop the mark that just landed instead of redrawing everything. */
function deriveLastMove(prev: BoardState | null, next: BoardState): LastMove | null {
  if (!prev || next.ply === 0) return null;
  let from: number | null = null;
  let to: number | null = null;
  for (let i = 0; i < prev.cells.length; i++) {
    if (prev.cells[i] === next.cells[i]) continue;
    if (prev.cells[i] !== null && next.cells[i] === null) from = i;
    if (prev.cells[i] === null && next.cells[i] !== null) to = i;
  }
  if (to === null) return null;
  return from !== null ? { type: 'move', from, to } : { type: 'place', to };
}

interface XOShiftGameProps {
  /** When set, runs as a seeded 3-round (9-game) challenge. */
  challengeCode?: string;
}

export function XOShiftGame({ challengeCode }: XOShiftGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    tapCell,
    continueAfterGame,
    continueAfterRound,
    replay,
    resetToMenu,
  } = useXOShiftGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const prevBoardRef = useRef<BoardState | null>(null);
  const [lastMove, setLastMove] = useState<LastMove | null>(null);
  useEffect(() => {
    setLastMove(deriveLastMove(prevBoardRef.current, state.board));
    prevBoardRef.current = state.board;
  }, [state.board]);

  const legalDestinations = useMemo(() => {
    if (state.selected === null || state.board.phase !== 'movement') return [];
    return legalMoves(state.board)
      .filter((m): m is Extract<Move, { type: 'move' }> => m.type === 'move' && m.from === state.selected)
      .map((m) => m.to);
  }, [state.board, state.selected]);

  const blockedCell = useMemo(() => {
    if (state.selected === null) return null;
    const forbidden = state.board.blockedReturn[state.selected];
    if (forbidden === undefined) return null;
    return state.board.cells[forbidden] === null ? forbidden : null;
  }, [state.board, state.selected]);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? XO_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const isRoundComplete = state.roundGames.length >= GAMES_PER_ROUND;

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
          {cfg && (
            <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
              Round {state.round}/{state.totalRounds} · {cfg.label}
            </p>
          )}
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {state.phase === 'selecting-difficulty' && (
          <motion.div key={`menu-${menuView}`} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 fade-up">
            {menuView === 'mode' ? (
              <ModeSelector
                soloHint="Three best-of-three duels"
                accent="#8B5CF6"
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
            <div className="flex items-center justify-between w-full px-1">
              <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
                Game {state.gameIndex}/{GAMES_PER_ROUND}
              </p>
              <RoundPips games={state.roundGames} />
            </div>

            <TurnIndicator
              isPlayerTurn={state.board.turn === 'X'}
              botThinking={state.botThinking}
              accent={cfg.color}
            />

            <XOBoard
              board={state.board}
              selected={state.selected}
              legalDestinations={legalDestinations}
              blockedCell={blockedCell}
              interactive={state.board.turn === 'X' && !state.botThinking}
              lastMove={lastMove}
              accent={cfg.color}
              onCellTap={tapCell}
            />

            <p className="text-2xs text-ink-4 font-ui text-center">
              {state.board.phase === 'placement'
                ? 'Tap an empty cell to place your mark.'
                : 'Tap your mark, then tap an empty cell to slide it there.'}
            </p>
          </motion.div>
        )}

        {state.phase === 'game-result' && state.lastGame && cfg && (
          <motion.div
            key={`game-result-${state.round}-${state.gameIndex}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <GameResultCard
              result={state.lastGame}
              roundGames={state.roundGames}
              isRoundComplete={isRoundComplete}
              accent={cfg.color}
              onNext={continueAfterGame}
            />
          </motion.div>
        )}

        {state.phase === 'round-result' && cfg && (
          <motion.div
            key={`round-result-${state.round}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <RoundResultScreen
              score={state.roundScores[state.roundScores.length - 1] ?? 0}
              games={state.roundGames}
              nextLabel={isFinalRound ? 'Results' : 'Next Round'}
              accent={cfg.color}
              onNext={continueAfterRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="⚔️"
              gameName="XO Shift"
              gamePath="/games/xo-shift"
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
