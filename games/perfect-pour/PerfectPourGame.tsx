'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { usePressAndHold } from '@/hooks/usePressAndHold';
import { Difficulty } from '@/types/game';
import { Glass } from './GlassCanvas';
import { PourResultScreen } from './PourResultScreen';
import { POUR_DIFFICULTY } from './constants';
import { usePourGame } from './usePourGame';

const GAME_ID = 'perfect-pour';

interface PerfectPourGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const GLASS_LABEL: Record<Difficulty, string> = {
  easy: 'Large glass',
  medium: 'Medium glass',
  hard: 'Small glass',
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = POUR_DIFFICULTY[id];
  return {
    id,
    label: cfg.label,
    qualifier: GLASS_LABEL[id],
    color: cfg.color,
    glow: cfg.glow,
  };
});

export function PerfectPourGame({ challengeCode }: PerfectPourGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    startPouring,
    stopPouring,
    nextRound,
    replay,
    resetToMenu,
  } = usePourGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const holdHandlers = usePressAndHold({
    onStart: startPouring,
    onEnd: stopPouring,
    disabled: state.phase !== 'pouring',
  });

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? POUR_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

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
            className="flex items-center gap-1.5 -ml-3 px-3 py-2.5 min-h-11 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
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
                // Not the game's cyan: Daily Challenge hardcodes #06B6D4, so a
                // cyan accent here made the two cards indistinguishable. Rose is
                // already in Perfect Pour's palette (its Hard liquid).
                accent="#F43F5E"
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
                  className="mx-auto flex items-center gap-1.5 px-3 py-2.5 min-h-11 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
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
            exit={{ opacity: 0, y: -20 }}
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

        {/* ── Filling + observing: memorize the level ── */}
        {(state.phase === 'filling' || state.phase === 'observing') && cfg && (
          <motion.div
            key={`observe-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="font-display text-xl font-bold text-white">Memorize This Level</p>

            <Glass
              fill={state.currentFill}
              color={cfg.liquid}
              scale={cfg.glassScale}
              faucet
              animateFill
            />

            {state.phase === 'observing' && (
              <GameTimer
                timeLeft={state.observeTimeLeft}
                totalSeconds={cfg.observeSeconds}
                label="Observe"
                size="sm"
              />
            )}
          </motion.div>
        )}

        {/* ── Pouring: hold anywhere in the zone ── */}
        {state.phase === 'pouring' && cfg && (
          <motion.div
            key={`pour-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <p className="font-display text-xl font-bold text-white">
              {state.isPouring ? 'Release when ready!' : 'Hold the Tap to Pour'}
            </p>

            {/* Glass under the faucet — pointer-events:none so the stream and
                growing liquid never interfere with the lever hold */}
            <div className="pointer-events-none">
              <Glass
                fill={state.currentFill}
                color={cfg.liquid}
                scale={cfg.glassScale}
                faucet
                pouring={state.isPouring}
              />
            </div>

            {/* Tap lever — press and hold to open the faucet */}
            <button
              type="button"
              {...holdHandlers}
              aria-label={state.isPouring ? 'Release to stop pouring' : 'Hold to pour water'}
              aria-pressed={state.isPouring}
              className={`pour-lever ${state.isPouring ? 'pour-lever-active' : ''}`}
              style={
                {
                  '--lever-accent': cfg.liquid,
                } as React.CSSProperties
              }
            >
              <span className="pour-lever-dot" />
              {state.isPouring ? 'Pouring…' : 'Hold to Pour'}
            </button>

            {/* Fill readout */}
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs font-mono text-white/30 mb-1">
                <span>Empty</span>
                <span>Fill: {Math.round(state.currentFill)}%</span>
                <span>Full</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${cfg.liquid}, ${cfg.liquid}aa)`,
                    boxShadow: `0 0 8px ${cfg.liquid}80`,
                  }}
                  animate={{ width: `${state.currentFill}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && cfg && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
          >
            <PourResultScreen
              result={state.result}
              liquidColor={cfg.liquid}
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
              emoji="🥤"
              gameName="Perfect Pour"
              gamePath="/games/perfect-pour"
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
            className="px-3 py-1 rounded-full text-xs font-mono border"
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
