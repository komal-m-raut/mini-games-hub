'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { NeonButton } from '@/components/ui/NeonButton';
import { usePressAndHold, useHoldRepeat } from '@/hooks/usePressAndHold';
import { SessionSummary } from '@/components/game/SessionSummary';
import { DIFFICULTY_CONFIG, UNIT_TO_PX } from '@/lib/constants';
import { Difficulty } from '@/types/game';
import { Balloon } from './BalloonCanvas';
import { ResultScreen } from './ResultScreen';
import { BALLOON_ADJUST_STEP, useBalloonGame } from './useBalloonGame';

const GAME_ID = 'balloon-match';

interface BalloonGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

const SPEED_LABEL: Record<Difficulty, string> = {
  easy: 'Slow',
  medium: 'Medium',
  hard: 'Fast',
};

const DIFFICULTY_OPTIONS: DifficultyOption[] = (
  ['easy', 'medium', 'hard'] as Difficulty[]
).map((id) => {
  const cfg = DIFFICULTY_CONFIG[id];
  return {
    id,
    label: cfg.label,
    qualifier: SPEED_LABEL[id],
    color: cfg.color,
    glow: cfg.glow,
  };
});

export function BalloonGame({ challengeCode }: BalloonGameProps) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    startInflating,
    stopInflating,
    adjustUnits,
    lockIn,
    playAgain,
    resetToMenu,
  } = useBalloonGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const holdHandlers = usePressAndHold({
    onStart: startInflating,
    onEnd: stopInflating,
    disabled: state.phase !== 'inflating',
  });

  const adjustStep = state.difficulty ? BALLOON_ADJUST_STEP[state.difficulty] : 1;
  // Match the readout's decimal places to the step size (1 → whole units,
  // 0.5 → one decimal, 0.25 → two) so it never shows more precision than a
  // nudge can actually produce.
  const adjustDecimals = adjustStep >= 1 ? 0 : adjustStep === 0.5 ? 1 : 2;
  const decHandlers = useHoldRepeat({
    onStep: () => adjustUnits(-adjustStep),
    disabled: state.phase !== 'adjusting',
  });
  const incHandlers = useHoldRepeat({
    onStep: () => adjustUnits(adjustStep),
    disabled: state.phase !== 'adjusting',
  });

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const isChallenge = state.mode === 'challenge';
  const isMenuPhase = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEndScreen =
    state.phase === 'challenge-complete' || state.phase === 'session-complete';
  const isFinalRound = state.totalRounds !== null && state.round >= state.totalRounds;

  const cfg = state.difficulty ? DIFFICULTY_CONFIG[state.difficulty] : null;
  const currentDiameterPx = state.currentUnits * UNIT_TO_PX;
  const maxDiameterPx = 100 * UNIT_TO_PX;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Top bar: back + score */}
      {!isMenuPhase && !isEndScreen && (
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

      {/* Main game area */}
      <AnimatePresence mode="wait">
        {/* ── Free-play menu: mode picker → solo or multiplayer ── */}
        {state.phase === 'selecting-difficulty' && (
          <motion.div
            key={`menu-${menuView}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            {menuView === 'mode' && (
              <ModeSelector
                accent="#EC4899"
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ChallengeIntro
              gameId={GAME_ID}
              code={challengeCode}
              difficulties={challengeRounds.map((r) => r.difficulty)}
              onStart={startChallenge}
            />
          </motion.div>
        )}

        {/* ── Observing: show target balloon + countdown ── */}
        {state.phase === 'observing' && cfg && (
          <motion.div
            key={`observing-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="font-display text-xl font-bold text-white mb-1">Memorize This Balloon</p>
            </motion.div>

            <Balloon
              units={state.targetUnits}
              color={state.targetColor}
              id="target"
              visible
              pulse
            />

            <GameTimer
              timeLeft={state.observeTimeLeft}
              totalSeconds={cfg.observeSeconds}
              label="Observe"
              size="md"
            />
          </motion.div>
        )}

        {/* ── Inflating: hold to grow, beat the clock ── */}
        {state.phase === 'inflating' && cfg && (
          <motion.div
            key={`inflating-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="font-display text-xl font-bold text-white mb-1">
                {state.isHolding ? 'Release when ready!' : 'Hold to Inflate'}
              </p>
            </motion.div>

            {/* Time pressure: locks in automatically at zero (Easy has no limit) */}
            {cfg.inflateSeconds !== null && (
              <GameTimer
                timeLeft={state.inflateTimeLeft}
                totalSeconds={cfg.inflateSeconds}
                size="sm"
              />
            )}

            {/* Inflate zone — a real button so keyboard/switch users can
                reach it (C4): Space/Enter start and release the hold via
                usePressAndHold's key handlers. Balloon is pointer-events:none
                so it never triggers pointerleave. */}
            <button
              type="button"
              {...holdHandlers}
              aria-label={
                state.isHolding
                  ? 'Release to stop inflating and adjust the size'
                  : 'Hold to inflate the balloon'
              }
              aria-pressed={state.isHolding}
              className={`inflate-zone ${state.isHolding ? 'inflate-zone-active' : ''}`}
            >
              <div className="pointer-events-none">
                <Balloon
                  units={state.currentUnits}
                  color={state.targetColor}
                  id="player"
                  visible
                />
              </div>

              {state.currentUnits < 5 && (
                <motion.p
                  className="absolute text-white/20 font-mono text-sm pointer-events-none select-none"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Hold to start
                </motion.p>
              )}
            </button>

            {/* Progress bar */}
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-xs font-mono text-white/30 mb-1">
                <span>0%</span>
                <span>Size: {Math.round((currentDiameterPx / maxDiameterPx) * 100)}%</span>
                <span>Max</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${state.targetColor}, ${state.targetColor}aa)`,
                    boxShadow: `0 0 8px ${state.targetColor}80`,
                  }}
                  animate={{ width: `${(state.currentUnits / 100) * 100}%` }}
                  transition={{ duration: 0.05 }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Adjusting: fine-adjust the released size, then confirm (U8) ── */}
        {state.phase === 'adjusting' && cfg && (
          <motion.div
            key={`adjusting-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <p className="font-display text-xl font-bold text-white mb-1">
                Fine-Tune, Then Lock In
              </p>
            </motion.div>

            {/* Same inflate timer, still running — auto-locks at zero even
                mid-adjust (Easy has no timer, so its adjust step is untimed) */}
            {cfg.inflateSeconds !== null && (
              <GameTimer
                timeLeft={state.inflateTimeLeft}
                totalSeconds={cfg.inflateSeconds}
                size="sm"
              />
            )}

            <div className="pointer-events-none">
              <Balloon
                units={state.currentUnits}
                color={state.targetColor}
                id="player"
                visible
              />
            </div>

            {/* Fine-adjust controls: real buttons with descriptive labels —
                this is what gives keyboard/switch users access to the value. */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                {...decHandlers}
                aria-label={`Decrease size by ${adjustStep} unit${adjustStep === 1 ? '' : 's'}`}
                className="step-btn"
              >
                −
              </button>
              <span className="font-score text-2xl text-white min-w-[5ch] text-center">
                {state.currentUnits.toFixed(adjustDecimals)}
              </span>
              <button
                type="button"
                {...incHandlers}
                aria-label={`Increase size by ${adjustStep} unit${adjustStep === 1 ? '' : 's'}`}
                className="step-btn"
              >
                +
              </button>
            </div>

            <NeonButton variant="primary" size="md" onClick={lockIn} glow="rgba(124, 58, 237, 0.5)">
              Lock In
            </NeonButton>
          </motion.div>
        )}

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            aria-live="polite"
          >
            <ResultScreen
              result={state.result}
              targetColor={state.targetColor}
              isNewHighScore={state.isNewHighScore}
              nextLabel={isFinalRound ? 'Results' : 'Next'}
              onPlayAgain={playAgain}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {/* ── Session complete (normal mode): total, share, replay ── */}
        {state.phase === 'session-complete' && state.difficulty && cfg && (
          <motion.div
            key="session-complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <SessionSummary
              emoji="🎈"
              gameName="Balloon Match"
              gamePath="/games/balloon-match"
              subtitle={cfg.label}
              accent={cfg.color}
              roundScores={state.roundScores}
              isNewBest={state.isNewBestSession}
              bestSession={bestSession}
              onReplay={() => selectDifficulty(state.difficulty!)}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {/* ── Challenge complete: total, share, shared leaderboard ── */}
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

      {/* Difficulty badge (during play) */}
      {cfg && !isMenuPhase && !isEndScreen && (
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span
            className="px-3 py-1 rounded-full text-xs font-mono border"
            style={{
              color: cfg.color,
              borderColor: `${cfg.color}40`,
              background: `${cfg.color}10`,
            }}
          >
            {cfg.label}
          </span>
        </motion.div>
      )}
    </div>
  );
}
