'use client';

import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, Volume2, X } from 'lucide-react';
import { DifficultyOption, DifficultySelector } from '@/components/game/DifficultySelector';
import { ModeSelector } from '@/components/game/ModeSelector';
import { ScoreCard } from '@/components/game/ScoreCard';
import { SessionSummary } from '@/components/game/SessionSummary';
import { ChallengeComplete } from '@/components/challenge/ChallengeComplete';
import { ChallengeIntro } from '@/components/challenge/ChallengeIntro';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { NeonButton } from '@/components/ui/NeonButton';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { Difficulty } from '@/types/game';
import { EchoResultScreen } from './components/EchoResultScreen';
import { ListenOrb } from './components/ListenOrb';
import { PitchSlider } from './components/PitchSlider';
import { ECHO_DIFFICULTY, GAME_ID, TONE_DURATION_MS } from './constants';
import { useEchoEarGame } from './useEchoEarGame';

const DIFFICULTY_OPTIONS: DifficultyOption[] = (['easy', 'medium', 'hard'] as Difficulty[]).map(
  (id) => {
    const { label, qualifier, color, glow } = ECHO_DIFFICULTY[id];
    return { id, label, qualifier, color, glow };
  }
);

/** Ranked off the real `divisor` values, so the copy can't drift from them. */
const FORGIVENESS = ['most forgiving', 'middling', 'least forgiving'];
const DIFFICULTY_EXPLAINER = Object.values(ECHO_DIFFICULTY)
  .sort((a, b) => b.divisor - a.divisor)
  .map((cfg, i) => ({ ...cfg, forgiveness: FORGIVENESS[i] }));

const TIP_DISMISSED_KEY = 'mgh_echo_ear_tip_dismissed';

// localStorage read, hydration-safe (server snapshot is "not dismissed" —
// same noopSubscribe/useSyncExternalStore pattern the hooks use for best
// sessions, so this needs no effect to pick up the stored preference).
const noopSubscribe = () => () => {};
const notDismissed = () => false;
const readDismissed = () =>
  typeof window !== 'undefined' && localStorage.getItem(TIP_DISMISSED_KEY) === '1';

/** Dismissible "bring headphones" nudge — pitch matching is far easier with
 *  them, but the game works fine on speakers too. A quiet single line, not
 *  a boxy callout: it's a nice-to-know, not a warning. */
function HeadphonesTip() {
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, notDismissed);
  const [justDismissed, setJustDismissed] = useState(false);

  if (storedDismissed || justDismissed) return null;

  return (
    <div className="flex items-center justify-center gap-2 text-xs font-ui text-ink-4">
      <span>🎧 Headphones recommended</span>
      <button
        onClick={() => {
          localStorage.setItem(TIP_DISMISSED_KEY, '1');
          setJustDismissed(true);
        }}
        aria-label="Dismiss headphones tip"
        className="text-ink-4 hover:text-ink-2 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

const EASE_STANDARD = [0.2, 0, 0, 1] as const;

/** Shared entrance/exit for every phase card, so they can't drift apart. */
const card = {
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.25, ease: EASE_STANDARD },
};

interface EchoEarGameProps {
  /** When set, runs as a seeded 3-round challenge with a shared leaderboard. */
  challengeCode?: string;
}

export function EchoEarGame({ challengeCode }: EchoEarGameProps = {}) {
  const {
    state,
    bestSession,
    challengeRounds,
    selectDifficulty,
    startChallenge,
    listenToTarget,
    proceedToMatch,
    setGuess,
    submit,
    previewPitch,
    nextRound,
    replay,
    resetToMenu,
  } = useEchoEarGame({ challengeCode });

  const router = useRouter();
  const [menuView, setMenuView] = useState<'mode' | 'solo'>('mode');

  const backToMenu = () => {
    setMenuView('mode');
    resetToMenu();
  };

  const cfg = state.difficulty ? ECHO_DIFFICULTY[state.difficulty] : null;
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
                accent="#A78BFA"
                onSolo={() => setMenuView('solo')}
                onDailyChallenge={() => router.push(challengePath(GAME_ID, getDailyChallengeCode()))}
                onFriendChallenge={() =>
                  router.push(challengePath(GAME_ID, generateChallengeCode()))
                }
              />
            ) : (
              <div className="flex flex-col gap-6">
                <HeadphonesTip />

                <details className="glass-card how-to-play">
                  <summary className="how-to-play-summary font-display text-base sm:text-lg">
                    <span>What do the difficulty modes mean?</span>
                    <ChevronDown className="how-to-play-chevron w-5 h-5 shrink-0" strokeWidth={1.5} />
                  </summary>
                  <ol className="how-to-play-steps text-base text-ink-2">
                    {DIFFICULTY_EXPLAINER.map((d) => (
                      <li key={d.label}>
                        <strong className="text-ink-1">{d.label}</strong> — {d.replays}{' '}
                        {d.replays === 1 ? 'replay' : 'replays'}, {d.forgiveness} scoring.
                      </li>
                    ))}
                  </ol>
                </details>

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

        {state.phase === 'listening' && cfg && (
          <motion.div
            key={`listen-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-10 sm:py-12"
            {...card}
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-ink-4 text-2xs font-ui uppercase tracking-[0.3em]">Listen</p>
              <p className="font-score text-xs text-ink-4">
                {state.round} / {state.totalRounds}
              </p>
            </div>

            {state.audioBlocked ? (
              <div className="flex flex-col items-center gap-3 text-center max-w-sm py-4">
                <span className="text-4xl" aria-hidden="true">🔇</span>
                <p className="text-ink-2 font-ui text-sm">
                  We couldn&apos;t start audio in this browser. Check that this site isn&apos;t
                  blocked from playing sound, then try again.
                </p>
                <NeonButton variant="secondary" size="md" onClick={listenToTarget}>
                  Try Again
                </NeonButton>
              </div>
            ) : (
              <>
                <ListenOrb
                  accent={cfg.color}
                  disabled={state.hasListened && state.replaysLeft <= 0}
                  onPlay={listenToTarget}
                  durationMs={TONE_DURATION_MS}
                  replaysLeft={state.replaysLeft}
                  totalReplays={cfg.replays}
                  hasListened={state.hasListened}
                />
                <NeonButton
                  variant="primary"
                  size="lg"
                  onClick={proceedToMatch}
                  disabled={!state.hasListened}
                  className="w-full"
                >
                  I remember it — match it
                </NeonButton>
              </>
            )}
          </motion.div>
        )}

        {state.phase === 'matching' && cfg && (
          <motion.div
            key={`match-${state.round}`}
            className="glass-card flex flex-col items-center gap-6 py-8"
            {...card}
          >
            <div className="flex items-center justify-between w-full">
              <p className="text-ink-4 text-2xs font-ui uppercase tracking-[0.3em]">Match</p>
              <p className="font-score text-xs text-ink-4">
                {state.round} / {state.totalRounds}
              </p>
            </div>

            <div className="relative flex items-center justify-center w-full">
              {cfg.replays > 0 && (
                <button
                  onClick={() => previewPitch(state.target)}
                  aria-label="Hear the target pitch again"
                  className="absolute left-0 sm:left-2 top-1/2 -translate-y-1/2 grid place-items-center w-14 h-14 rounded-full bg-white/5 active:scale-95 transition-transform"
                  style={{ color: cfg.color }}
                >
                  <Volume2 className="w-5 h-5" strokeWidth={2} />
                </button>
              )}
              <PitchSlider value={state.guess} onChange={setGuess} accent={cfg.color} />
            </div>

            <NeonButton
              variant="primary"
              size="lg"
              onClick={submit}
              className="w-full flex items-center justify-center gap-2"
            >
              <Check strokeWidth={2.5} />
              Confirm
            </NeonButton>
          </motion.div>
        )}

        {state.phase === 'results' && state.result && cfg && (
          <motion.div
            key={`results-${state.round}`}
            className="glass-card py-8"
            {...card}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <p className="text-ink-4 text-2xs font-ui uppercase tracking-[0.3em]">Result</p>
              <p className="font-score text-xs text-ink-4">
                {state.round} / {state.totalRounds}
              </p>
            </div>
            <EchoResultScreen
              result={state.result}
              maxCents={cfg.divisor * 100}
              nextLabel={isFinalRound ? 'Results' : 'Next Pitch'}
              onNext={nextRound}
              onMenu={resetToMenu}
              onPreview={previewPitch}
            />
          </motion.div>
        )}

        {state.phase === 'session-complete' && cfg && (
          <motion.div key="session-complete" {...card}>
            <SessionSummary
              emoji="🎵"
              gameName="Echo Ear"
              gamePath="/games/echo-ear"
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

      <div className="flex justify-center items-center gap-4">
        {cfg && !isMenu && !isEnd && (
          <span className="flex items-center gap-1.5 text-xs font-ui text-ink-3">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: cfg.color }}
              aria-hidden="true"
            />
            {cfg.label}
          </span>
        )}
        <SoundToggle />
      </div>
    </div>
  );
}
