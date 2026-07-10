'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ScoreCard } from '@/components/game/ScoreCard';
import { usePressAndHold } from '@/hooks/usePressAndHold';
import { DIFFICULTY_CONFIG, UNIT_TO_PX } from '@/lib/constants';
import { Balloon } from './BalloonCanvas';
import { ResultScreen } from './ResultScreen';
import { useBalloonGame } from './useBalloonGame';

export function BalloonGame() {
  const { state, selectDifficulty, startInflating, stopInflating, playAgain, resetToMenu } =
    useBalloonGame();

  const holdHandlers = usePressAndHold({
    onStart: startInflating,
    onEnd: stopInflating,
    disabled: state.phase !== 'inflating',
  });

  const cfg = state.difficulty ? DIFFICULTY_CONFIG[state.difficulty] : null;
  const currentDiameterPx = state.currentUnits * UNIT_TO_PX;
  const maxDiameterPx = 100 * UNIT_TO_PX;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      {/* Top bar: back + score */}
      {state.phase !== 'selecting-difficulty' && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={resetToMenu}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Menu
          </button>
          <ScoreCard
            score={state.score}
            highScore={state.highScore}
            round={state.round}
            accuracy={state.result?.accuracy}
            isNewHighScore={state.isNewHighScore}
          />
        </motion.div>
      )}

      {/* Main game area */}
      <AnimatePresence mode="wait">
        {/* ── Difficulty selection ── */}
        {state.phase === 'selecting-difficulty' && (
          <motion.div
            key="difficulty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DifficultySelector onSelect={selectDifficulty} />
          </motion.div>
        )}

        {/* ── Observing: show target balloon + countdown ── */}
        {state.phase === 'observing' && cfg && (
          <motion.div
            key="observing"
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
              <p className="text-white/40 text-sm font-mono">
                Study its size carefully — it disappears soon!
              </p>
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

        {/* ── Inflating: hold to grow ── */}
        {state.phase === 'inflating' && (
          <motion.div
            key={`inflating-${state.round}`}
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
              <p className="font-display text-xl font-bold text-white mb-1">
                {state.isHolding ? 'Inflating… Release when ready!' : 'Hold to Inflate'}
              </p>
              <p className="text-white/40 text-sm font-mono">
                Press & hold anywhere below — release to lock in your size
              </p>
            </motion.div>

            {/* Inflate zone — balloon is pointer-events:none so it never triggers pointerleave */}
            <div
              {...holdHandlers}
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
            </div>

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

        {/* ── Results ── */}
        {state.phase === 'results' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultScreen
              result={state.result}
              targetColor={state.targetColor}
              isNewHighScore={state.isNewHighScore}
              onPlayAgain={playAgain}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Difficulty badge (during play) */}
      {cfg && state.phase !== 'selecting-difficulty' && (
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
            {cfg.label} · ±{cfg.tolerancePercent}% tolerance
          </span>
        </motion.div>
      )}
    </div>
  );
}
