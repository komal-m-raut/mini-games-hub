'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { CHALLENGE_DIFFICULTIES, challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Keyboard } from './components/Keyboard';
import { SoloResultScreen } from './components/SoloResultScreen';
import { WordGrid } from './components/WordGrid';
import { WordQuestRoundResult } from './components/WordQuestRoundResult';
import { ACCENT, MAX_GUESSES } from './constants';
import { aggregateKeyboardState } from './engine';
import { useWordQuestGame } from './useWordQuestGame';

const GAME_ID = 'word-quest';

interface WordQuestGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function WordQuestGame({ challengeCode }: WordQuestGameProps = {}) {
  const {
    state,
    bestSession,
    challengeWords,
    startSolo,
    startChallenge,
    typeLetter,
    backspace,
    submitGuess,
    nextRound,
    replay,
    resetToMenu,
  } = useWordQuestGame({ challengeCode });

  const router = useRouter();

  // Hardware keyboard: letters, Backspace and Enter work exactly like the
  // on-screen keyboard while a round is in progress.
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        typeLetter(e.key.toLowerCase());
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitGuess();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, typeLetter, backspace, submitGuess]);

  const keyState = useMemo(() => aggregateKeyboardState(state.rows), [state.rows]);

  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'menu' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'solo-result' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;
  const solved = state.rows.some((r) => r.result.every((t) => t === 'correct'));

  const onKey = (key: string) => {
    if (key === 'enter') submitGuess();
    else if (key === 'backspace') backspace();
    else typeLetter(key);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {!isMenu && !isEnd && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button onClick={resetToMenu} className="btn btn-sm btn-ghost -ml-3.5">
            <ArrowLeft strokeWidth={2} />
            {isChallenge ? 'Restart' : 'Menu'}
          </button>
          <ScoreCard
            score={state.score}
            round={state.round}
            totalRounds={isChallenge ? state.totalRounds : null}
            totalScore={state.totalScore}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Free-play menu: solo starts immediately (no difficulty step) ── */}
        {state.phase === 'menu' && (
          <motion.div key="menu" exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 fade-up">
            <ModeSelector
              soloHint="One word, six guesses"
              accent={ACCENT}
              onSolo={startSolo}
              onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
              onFriendChallenge={() => router.push(challengePath(GAME_ID, generateChallengeCode()))}
            />
          </motion.div>
        )}

        {/* ── Challenge intro ── */}
        {state.phase === 'challenge-intro' && challengeCode && challengeWords && (
          <motion.div key="challenge-intro" exit={{ opacity: 0, y: -20 }} className="fade-up">
            <ChallengeIntro
              gameId={GAME_ID}
              code={challengeCode}
              difficulties={CHALLENGE_DIFFICULTIES}
              onStart={startChallenge}
            />
          </motion.div>
        )}

        {/* ── Playing: grid + keyboard ── */}
        {state.phase === 'playing' && (
          <motion.div
            key={`playing-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8 px-3 sm:px-6 relative"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <AnimatePresence>
              {state.toast && (
                <motion.p
                  key={state.invalidNonce}
                  className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-white text-xs font-ui whitespace-nowrap"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  role="alert"
                >
                  {state.toast}
                </motion.p>
              )}
            </AnimatePresence>

            <WordGrid
              rows={state.rows}
              currentGuess={state.currentGuess}
              invalidNonce={state.invalidNonce}
              solved={solved}
            />

            <Keyboard keyState={keyState} onKey={onKey} />
          </motion.div>
        )}

        {/* ── Challenge round result ── */}
        {state.phase === 'round-result' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8 px-3 sm:px-6"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <WordQuestRoundResult
              result={state.result}
              nextLabel={isFinalRound ? 'Results' : 'Next Word'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {/* ── Solo result (custom terminal screen) ── */}
        {state.phase === 'solo-result' && state.result && (
          <motion.div
            key="solo-result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <SoloResultScreen
              result={state.result}
              bestSession={bestSession}
              isNewBest={state.isNewBestSession}
              onReplay={replay}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {/* ── Challenge complete ── */}
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

      <div className="flex justify-center items-center gap-3">
        {state.phase === 'playing' && (
          <span
            className="px-3 py-1 rounded-full text-xs font-ui border"
            style={{ color: ACCENT, borderColor: `${ACCENT}40`, background: `${ACCENT}10` }}
          >
            {state.rows.length}/{MAX_GUESSES} guesses
          </span>
        )}
        <SoundToggle />
      </div>
    </div>
  );
}
