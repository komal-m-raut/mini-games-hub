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
import { HandPicker } from './components/HandPicker';
import { HandReveal } from './components/HandReveal';
import { InningsSummary } from './components/InningsSummary';
import { MatchResultScreen } from './components/MatchResultScreen';
import { Scoreboard } from './components/Scoreboard';
import { GAME_ID, HAND_CRICKET_DIFFICULTY } from './constants';
import { useHandCricketGame } from './useHandCricketGame';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map((id) => {
  const { label, qualifier, color, glow } = HAND_CRICKET_DIFFICULTY[id];
  return { id, label, qualifier, color, glow };
});

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface HandCricketGameProps {
  /** When set, runs as a seeded 3-match challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function HandCricketGame({ challengeCode }: HandCricketGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    playBall,
    startInnings2,
    nextMatch,
    replay,
    resetToMenu,
  } = useHandCricketGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  // Hardware keys 1–6 throw exactly like the on-screen hand picker while a
  // ball is live and ready to be played.
  useEffect(() => {
    if (state.phase !== 'innings1' && state.phase !== 'innings2') return;
    if (state.ballState !== 'ready') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (/^[1-6]$/.test(e.key)) {
        e.preventDefault();
        playBall(Number(e.key));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state.phase, state.ballState, playBall]);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? HAND_CRICKET_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalMatch = state.match >= state.totalMatches;

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
            round={state.match}
            totalRounds={state.totalMatches}
            totalScore={state.totalScore}
          />
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {state.phase === 'selecting-difficulty' && (
          <motion.div key={`menu-${menuView}`} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6 fade-up">
            {menuView === 'mode' ? (
              <ModeSelector
                soloHint="Three quick matches"
                accent="#10B981"
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

        {state.phase === 'innings1' && cfg && (
          <motion.div
            key={`innings1-${state.match}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
                  Match {state.match} / {state.totalMatches} · {cfg.label}
                </p>
                <p className="font-display text-lg">Innings 1 — you&apos;re batting</p>
              </div>
              <Scoreboard runs={state.playerRuns} balls={state.playerBalls} accent={cfg.color} />
            </div>

            <HandReveal
              ballState={state.ballState}
              playerPick={state.playerPick}
              botPick={state.botPick}
              runsPick={state.playerPick}
              isOut={state.isOut}
              accent={cfg.color}
              playerLabel="You"
              botLabel="Bot"
            />

            <HandPicker onPick={playBall} disabled={state.ballState !== 'ready'} accent={cfg.color} action="Bat" />
          </motion.div>
        )}

        {state.phase === 'innings-break' && cfg && (
          <motion.div key={`break-${state.match}`} className="glass-card py-8" {...card}>
            <InningsSummary
              playerRuns={state.playerRuns}
              playerBalls={state.playerBalls}
              target={state.target}
              accent={cfg.color}
              onContinue={startInnings2}
            />
          </motion.div>
        )}

        {state.phase === 'innings2' && cfg && (
          <motion.div
            key={`innings2-${state.match}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
                  Match {state.match} / {state.totalMatches} · {cfg.label}
                </p>
                <p className="font-display text-lg">Innings 2 — you&apos;re bowling</p>
              </div>
              <Scoreboard runs={state.botRuns} balls={state.botBalls} target={state.target} accent={cfg.color} />
            </div>

            <HandReveal
              ballState={state.ballState}
              playerPick={state.playerPick}
              botPick={state.botPick}
              runsPick={state.botPick}
              isOut={state.isOut}
              accent={cfg.color}
              playerLabel="You"
              botLabel="Bot"
            />

            <HandPicker onPick={playBall} disabled={state.ballState !== 'ready'} accent={cfg.color} action="Bowl" />
          </motion.div>
        )}

        {state.phase === 'match-result' && state.result && (
          <motion.div
            key={`result-${state.match}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <MatchResultScreen
              result={state.result}
              nextLabel={isFinalMatch ? 'Results' : 'Next Match'}
              onNext={nextMatch}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="🏏"
              gameName="Hand Cricket"
              gamePath="/games/hand-cricket"
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
