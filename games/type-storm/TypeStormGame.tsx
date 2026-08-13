'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Keyboard, SkipForward } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { TypeStormResultScreen } from './components/TypeStormResultScreen';
import { WordDisplay } from './components/WordDisplay';
import { GAME_ID, ROUND_SECONDS, TYPE_DIFFICULTY, scoreRound } from './constants';
import { useTypeStormGame } from './useTypeStormGame';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map((id) => {
  const { label, qualifier, color, glow } = TYPE_DIFFICULTY[id];
  return { id, label, qualifier, color, glow };
});

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// Touch-device detection via useSyncExternalStore rather than a
// useState+useEffect pair — hydration-safe (server snapshot is always
// false, so there's no SSR/client mismatch) and reacts live if the pointer
// type ever changes (e.g. a 2-in-1 laptop folding into tablet mode).
function subscribeCoarsePointer(callback: () => void): () => void {
  const mql = window.matchMedia('(pointer: coarse)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}
const getCoarsePointer = () => window.matchMedia('(pointer: coarse)').matches;
const getServerCoarsePointer = () => false;

interface TypeStormGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function TypeStormGame({ challengeCode }: TypeStormGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    inputRef,
    selectDifficulty,
    startChallenge,
    setInput,
    submitWord,
    skipWord,
    nextRound,
    replay,
    resetToMenu,
  } = useTypeStormGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  // Touch devices can still play Type Storm — a friendly heads-up, not a gate.
  const isCoarsePointer = useSyncExternalStore(subscribeCoarsePointer, getCoarsePointer, getServerCoarsePointer);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? TYPE_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

  const currentWord = state.words[state.wordIndex] ?? '';
  const queue = [state.words[state.wordIndex + 1], state.words[state.wordIndex + 2]].filter(
    (w): w is string => Boolean(w)
  );
  const live = scoreRound({ correctChars: state.correctChars, typedChars: state.typedChars });

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      submitWord();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      skipWord();
    }
  };

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
            score={state.score}
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
                soloHint="Three 30-second sprints"
                accent="#06B6D4"
                onSolo={() => setMenuView('solo')}
                onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
                onFriendChallenge={() => router.push(challengePath(GAME_ID, generateChallengeCode()))}
              />
            ) : (
              <div className="flex flex-col gap-5">
                <DifficultySelector options={DIFFICULTY_OPTIONS} onSelect={selectDifficulty} />
                {isCoarsePointer && (
                  <p className="flex items-center justify-center gap-2 text-ink-3 text-xs font-ui text-center">
                    <Keyboard className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                    Best with a physical keyboard — still fully playable.
                  </p>
                )}
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
            {isCoarsePointer && (
              <p className="flex items-center justify-center gap-2 text-ink-3 text-xs font-ui text-center mt-4">
                <Keyboard className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                Best with a physical keyboard — still fully playable.
              </p>
            )}
          </motion.div>
        )}

        {state.phase === 'countdown' && cfg && (
          <motion.div
            key={`countdown-${state.round}`}
            className="glass-card flex flex-col items-center justify-center gap-6 py-10"
            {...card}
          >
            <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
              Round {state.round} / {state.totalRounds} · {cfg.label}
            </p>
            <AnimatePresence mode="wait">
              <motion.span
                key={state.countdown}
                className="font-display text-7xl"
                style={{ color: cfg.color }}
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

        {state.phase === 'playing' && cfg && (
          <motion.div
            key={`playing-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <div className="flex items-center justify-between w-full">
              <GameTimer timeLeft={state.timeLeft} totalSeconds={ROUND_SECONDS} size="sm" />
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">WPM</p>
                  <p className="font-score text-2xl leading-none" style={{ color: cfg.color }}>
                    {Math.round(live.wpm)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xs text-ink-3 font-ui uppercase tracking-wide leading-none mb-0.5">Accuracy</p>
                  <p className="font-score text-2xl leading-none" style={{ color: cfg.color }}>
                    {Math.round(live.accuracy * 100)}%
                  </p>
                </div>
              </div>
            </div>

            <WordDisplay word={currentWord} input={state.input} isWrong={state.isWrong} queue={queue} accent={cfg.color} />

            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              aria-label="Type the word"
              value={state.input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onInputKeyDown}
              autoFocus
              className="w-full max-w-md text-center rounded-2xl border-2 px-6 py-3 bg-white/5 outline-none font-score text-ink-1 transition-colors duration-200"
              style={{
                fontSize: 16,
                borderColor: state.isWrong ? '#EF4444' : `${cfg.color}40`,
                background: state.isWrong ? 'rgba(239, 68, 68, 0.14)' : `${cfg.color}0F`,
              }}
            />

            <button type="button" onClick={skipWord} aria-label="Skip this word" className="btn btn-sm btn-ghost">
              <SkipForward strokeWidth={2} className="w-4 h-4" />
              Skip
            </button>
          </motion.div>
        )}

        {state.phase === 'results' && state.result && (
          <motion.div key={`results-${state.round}`} className="glass-card py-8" {...card} role="status" aria-live="polite">
            <TypeStormResultScreen
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
              emoji="⌨️"
              gameName="Type Storm"
              gamePath="/games/type-storm"
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
            <ChallengeComplete gameId={GAME_ID} code={challengeCode} roundScores={state.roundScores} onReplay={resetToMenu} />
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
