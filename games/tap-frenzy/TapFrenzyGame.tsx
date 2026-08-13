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
import { Arena } from './components/Arena';
import { FrenzyHud } from './components/FrenzyHud';
import { FrenzyResultScreen } from './components/FrenzyResultScreen';
import { GAME_ID, TAP_FRENZY_DIFFICULTY } from './constants';
import { useTapFrenzyGame } from './useTapFrenzyGame';

const ACCENT = '#EAB308';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map(
  (id) => {
    const cfg = TAP_FRENZY_DIFFICULTY[id];
    return { id, label: cfg.label, qualifier: cfg.qualifier, color: cfg.color, glow: cfg.glow };
  }
);

interface TapFrenzyGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

/**
 * `mode="wait"` runs the outgoing card's exit to completion before the next
 * one mounts — matches every other round-based game here, so the blank gap
 * between phases stays the same short beat throughout the app.
 */
const CARD_ENTER = { type: 'spring', stiffness: 280, damping: 28 } as const;
const CARD_EXIT = { duration: 0.16, ease: 'easeIn' } as const;

export function TapFrenzyGame({ challengeCode }: TapFrenzyGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    progress,
    selectDifficulty,
    startChallenge,
    hit,
    emptyTap,
    nextRound,
    replay,
    resetToMenu,
  } = useTapFrenzyGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? TAP_FRENZY_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Top bar */}
      {!isMenu && !isEnd && (
        <motion.div
          className="flex items-center justify-between gap-3"
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

      {/* Countdown, running and results swap inside a floor-height stage so
          the page doesn't jump between phases. */}
      <div className={isMenu || isEnd ? undefined : 'min-h-[26rem] sm:min-h-[30rem]'}>
        <AnimatePresence mode="wait">
          {/* ── Free-play menu: mode picker → solo difficulty ── */}
          {state.phase === 'selecting-difficulty' && (
            <motion.div
              key={`menu-${menuView}`}
              exit={{ opacity: 0, y: -12, transition: CARD_EXIT }}
              className="flex flex-col gap-6 fade-up"
            >
              {menuView === 'mode' && (
                <ModeSelector
                soloHint="Three 30-second rounds"
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
            <motion.div
              key="challenge-intro"
              exit={{ opacity: 0, y: -12, transition: CARD_EXIT }}
              className="fade-up"
            >
              <ChallengeIntro
                gameId={GAME_ID}
                code={challengeCode}
                difficulties={challengeRounds.map((r) => r.difficulty)}
                onStart={startChallenge}
              />
            </motion.div>
          )}

          {/* ── Countdown: same "3 · 2 · 1" rhythm before every round ── */}
          {state.phase === 'countdown' && cfg && (
            <motion.div
              key={`countdown-${state.round}`}
              className="glass-card flex flex-col items-center justify-center gap-6 py-8 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: CARD_EXIT }}
              transition={CARD_ENTER}
            >
              <div className="flex flex-col items-center gap-1.5">
                <p className="font-ui text-xs uppercase tracking-widest text-ink-3">
                  Round {state.round}
                </p>
                <p className="font-display text-xl sm:text-2xl">Get Ready…</p>
              </div>
              <div className="relative w-full max-w-md mx-auto">
                <Arena target={null} progress={progress} accent={cfg.color} onHit={() => {}} onEmptyTap={() => {}} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={state.countdown}
                      className="neon-text font-display text-6xl"
                      style={{ '--neon': cfg.color } as React.CSSProperties}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.3, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                    >
                      {state.countdown}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Running: tap each target the instant it appears ── */}
          {state.phase === 'running' && cfg && (
            <motion.div
              key={`running-${state.round}`}
              className="glass-card flex flex-col items-center gap-4 py-6 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97, transition: CARD_EXIT }}
              transition={CARD_ENTER}
            >
              <FrenzyHud timeLeft={state.timeLeft} hits={state.hits} combo={state.combo} />
              <Arena
                target={state.target}
                progress={progress}
                accent={cfg.color}
                onHit={hit}
                onEmptyTap={emptyTap}
              />
              <p className="text-xs text-ink-3 font-ui text-center">
                Tap the target — an empty tap breaks your combo, but never counts as a miss.
              </p>
            </motion.div>
          )}

          {/* ── Results ── */}
          {state.phase === 'results' && state.result && (
            <motion.div
              key={`results-${state.round}`}
              className="glass-card flex flex-col justify-center py-8 min-h-[inherit]"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={CARD_ENTER}
              role="status"
              aria-live="polite"
            >
              <FrenzyResultScreen
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
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={CARD_ENTER}
            >
              <SessionSummary
                emoji="⚡"
                gameName="Tap Frenzy"
                gamePath="/games/tap-frenzy"
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

          {/* ── Challenge complete ── */}
          {state.phase === 'challenge-complete' && challengeCode && (
            <motion.div
              key="challenge-complete"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: CARD_EXIT }}
              transition={CARD_ENTER}
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
      </div>

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
