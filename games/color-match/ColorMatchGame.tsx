'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { GameTimer } from '@/components/game/GameTimer';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { NeonButton } from '@/components/ui/NeonButton';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { ColorPanel } from './components/ColorPanel';
import { ColorResultScreen } from './components/ColorResultScreen';
import { ColorSliders } from './components/ColorSliders';
import { MixPreview } from './components/MixPreview';
import { COLOR_DIFFICULTY } from './constants';
import { useColorMatchGame } from './useColorMatchGame';

const GAME_ID = 'color-match';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map(
  (id) => {
    const { label, qualifier, color, glow } = COLOR_DIFFICULTY[id];
    return { id, label, qualifier, color, glow };
  }
);

/** Ranked off the real `tolerance` values, so the copy can't drift from them. */
const FORGIVENESS = ['most forgiving', 'middling', 'least forgiving'];
const DIFFICULTY_EXPLAINER = Object.values(COLOR_DIFFICULTY)
  .sort((a, b) => b.tolerance - a.tolerance)
  .map((cfg, i) => ({ ...cfg, forgiveness: FORGIVENESS[i] }));

const ROUND_COUNT_OPTIONS = [1, 3, 5] as const;

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

interface ColorMatchGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function ColorMatchGame({ challengeCode }: ColorMatchGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    roundCount,
    setRoundCount,
    selectDifficulty,
    startChallenge,
    setChannel,
    submit,
    nextRound,
    replay,
    resetToMenu,
  } = useColorMatchGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');
  // The mixing preview's DOM node — ColorSliders writes to it directly on
  // every drag tick, so the swatch fill can't lag behind the thumb even if
  // something upstream is slow to re-render (see MixPreview).
  const previewRef = useRef<HTMLDivElement>(null);

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? COLOR_DIFFICULTY[state.difficulty] : null;
  const isChallenge = state.mode === 'challenge';
  const isMenu = state.phase === 'selecting-difficulty' || state.phase === 'challenge-intro';
  const isEnd = state.phase === 'session-complete' || state.phase === 'challenge-complete';
  const isFinalRound = state.round >= state.totalRounds;

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
            round={state.round}
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
                accent="#EC4899"
                onSolo={() => setMenuView('solo')}
                onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
                onFriendChallenge={() =>
                  router.push(challengePath(GAME_ID, generateChallengeCode()))
                }
              />
            ) : (
              <div className="flex flex-col gap-5">
                <details className="glass-card how-to-play">
                  <summary className="how-to-play-summary font-display text-base sm:text-lg">
                    <span>What do the difficulty modes mean?</span>
                    <ChevronDown className="how-to-play-chevron w-5 h-5 shrink-0" strokeWidth={1.5} />
                  </summary>
                  <ol className="how-to-play-steps text-base text-ink-2">
                    {DIFFICULTY_EXPLAINER.map((d) => (
                      <li key={d.label}>
                        <strong className="text-ink-1">{d.label}</strong> — {d.observeSeconds}s to
                        remember, {d.forgiveness} scoring.
                      </li>
                    ))}
                  </ol>
                </details>

                <div className="flex flex-col items-center gap-2">
                  <p className="text-ink-3 text-sm font-ui">Rounds</p>
                  <div className="flex gap-2">
                    {ROUND_COUNT_OPTIONS.map((n) => (
                      <button
                        key={n}
                        onClick={() => setRoundCount(n)}
                        aria-pressed={roundCount === n}
                        className="btn btn-sm btn-secondary"
                        style={
                          roundCount === n ? ({ '--btn-accent': '#EC4899' } as React.CSSProperties) : undefined
                        }
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

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

        {state.phase === 'observing' && cfg && (
          <motion.div
            key={`observe-${state.round}`}
            className="glass-card flex flex-col items-center gap-5 py-8"
            {...card}
          >
            <div className="flex items-start justify-between w-full">
              <p className="font-display text-3xl sm:text-4xl lowercase">memorise</p>
              <p className="font-score text-sm text-ink-3">
                {state.round} / {state.totalRounds}
              </p>
            </div>
            <ColorPanel color={state.target} />
            <GameTimer
              timeLeft={state.observeTimeLeft}
              totalSeconds={cfg.observeSeconds}
              label="Seconds to remember"
              size="sm"
            />
          </motion.div>
        )}

        {state.phase === 'matching' && cfg && (
          <motion.div
            key={`match-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <div className="flex items-start justify-between w-full">
              <p className="font-display text-3xl sm:text-4xl lowercase">recreate</p>
              <p className="font-score text-sm text-ink-3">
                {state.round} / {state.totalRounds}
              </p>
            </div>

            {/* The player's mix only — the target is gone until they submit.
                The ghost ring just echoes where it sat, in the difficulty's
                colour, never the target's own hue. */}
            <MixPreview ref={previewRef} color={state.current} accent={cfg.color} />
            <ColorSliders color={state.current} onChange={setChannel} previewRef={previewRef} />

            <NeonButton
              variant="primary"
              size="lg"
              onClick={submit}
              className="w-full max-w-xs flex items-center justify-center gap-2"
            >
              <Check strokeWidth={2.5} />
              Submit
            </NeonButton>
          </motion.div>
        )}

        {state.phase === 'results' && state.result && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start justify-between w-full mb-2">
              <p className="font-display text-3xl sm:text-4xl lowercase">result</p>
              <p className="font-score text-sm text-ink-3">
                {state.round} / {state.totalRounds}
              </p>
            </div>
            <ColorResultScreen
              result={state.result}
              nextLabel={isFinalRound ? 'Results' : 'Next Colour'}
              onNext={nextRound}
              onMenu={resetToMenu}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="🎨"
              gameName="Color Match"
              gamePath="/games/color-match"
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
