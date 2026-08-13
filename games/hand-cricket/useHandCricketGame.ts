'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Difficulty } from '@/types/game';
import { useSound } from '@/hooks/useSound';
import { usePlayBeacon } from '@/hooks/usePlayBeacon';
import { CHALLENGE_ROUND_COUNT } from '@/lib/challenge';
import { getLocalBestSession, round2, saveBestSession } from '@/utils/scoring';
import { BallPhase, BallRecord, botBat, botBowl } from './bot';
import { HandCricketChallengeRound, getHandCricketChallengeRounds, makeHandCricketRand } from './challenge';
import {
  GAME_ID,
  MatchResult,
  REVEAL_MS,
  RESULT_LINGER_MS,
  TOTAL_MATCHES,
  getTarget,
  scoreMatch,
} from './constants';
import { BallState, HandCricketGameState, MatchRecord } from './types';

const INITIAL_MATCH_FIELDS = {
  history: [] as BallRecord[],
  playerRuns: 0,
  playerBalls: 0,
  botRuns: 0,
  botBalls: 0,
  target: 0,
  ballState: 'ready' as BallState,
  playerPick: null as number | null,
  botPick: null as number | null,
  isOut: false,
  matchResult: null as MatchResult | null,
  score: 0,
};

const INITIAL_STATE: HandCricketGameState = {
  phase: 'selecting-difficulty',
  mode: 'normal',
  difficulty: null,
  match: 1,
  totalMatches: TOTAL_MATCHES,
  ...INITIAL_MATCH_FIELDS,
  totalScore: 0,
  roundScores: [],
  result: null,
  isNewBestSession: false,
};

// localStorage best session, hydration-safe (server snapshot is 0)
const noopSubscribe = () => () => {};
const zeroSnapshot = () => 0;
const readBest = () => getLocalBestSession(GAME_ID);

export interface UseHandCricketGameOptions {
  /** When set, the game runs as a seeded 3-match challenge. */
  challengeCode?: string;
}

export function useHandCricketGame({ challengeCode }: UseHandCricketGameOptions = {}) {
  usePlayBeacon(GAME_ID);
  const isChallenge = Boolean(challengeCode);

  const challengeRounds = useMemo<HandCricketChallengeRound[] | null>(
    () => (challengeCode ? getHandCricketChallengeRounds() : null),
    [challengeCode]
  );
  // One seeded RNG for the whole challenge run (bot dice, both innings);
  // solo mode draws from Math.random. Stable for the life of this code via
  // useMemo, so it's never re-seeded mid-run.
  const rand = useMemo<() => number>(
    () => (challengeCode ? makeHandCricketRand(challengeCode) : Math.random),
    [challengeCode]
  );

  const [state, setState] = useState<HandCricketGameState>(() => ({
    ...INITIAL_STATE,
    mode: isChallenge ? 'challenge' : 'normal',
    phase: isChallenge ? 'challenge-intro' : 'selecting-difficulty',
    totalMatches: isChallenge ? CHALLENGE_ROUND_COUNT : TOTAL_MATCHES,
  }));
  const { play } = useSound();

  const bestSession = useSyncExternalStore(noopSubscribe, readBest, zeroSnapshot);

  // Mirror of the latest state for callbacks/timeouts, updated in an effect
  // (never during render) so it can't trip the refs-during-render rule.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealDeadlineRef = useRef(0);
  const revealPayloadRef = useRef<{ pick: number; botPick: number; ballPhase: BallPhase } | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advanceDeadlineRef = useRef(0);
  const transitioningRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    revealPayloadRef.current = null;
  }, []);

  // ── Match lifecycle ──────────────────────────────────────────────

  const startMatch = useCallback(
    (difficulty: Difficulty, matchNumber: number) => {
      clearTimers();
      setState((s) => ({
        ...s,
        ...INITIAL_MATCH_FIELDS,
        phase: 'innings1',
        difficulty,
        match: matchNumber,
        result: null,
      }));
    },
    [clearTimers]
  );

  const selectDifficulty = useCallback(
    (difficulty: Difficulty) => {
      play('click');
      setState((s) => ({ ...s, totalScore: 0, roundScores: [], isNewBestSession: false }));
      startMatch(difficulty, 1);
    },
    [startMatch, play]
  );

  const startChallenge = useCallback(() => {
    if (!challengeRounds) return;
    setState((s) => ({ ...s, totalScore: 0, roundScores: [] }));
    startMatch(challengeRounds[0].difficulty, 1);
  }, [startMatch, challengeRounds]);

  const resetToMenu = useCallback(() => {
    clearTimers();
    play('click');
    setState((s) => ({
      ...INITIAL_STATE,
      mode: s.mode,
      phase: s.mode === 'challenge' ? 'challenge-intro' : 'selecting-difficulty',
      totalMatches: s.totalMatches,
    }));
  }, [clearTimers, play]);

  // ── Match end ─────────────────────────────────────────────────────

  const finishMatch = useCallback(
    (result: MatchResult, target: number) => {
      const { playerRuns, botRuns, difficulty, totalScore, roundScores } = stateRef.current;
      if (!difficulty) return;
      const score = scoreMatch(result, playerRuns, botRuns, target);
      const record: MatchRecord = { difficulty, result, playerRuns, botRuns, target, score };

      play(result === 'win' ? 'celebrate' : result === 'tie' ? 'success' : 'fail');

      setState((s) => ({
        ...s,
        phase: 'match-result',
        matchResult: result,
        score,
        result: record,
        totalScore: round2(totalScore + score),
        roundScores: [...roundScores, score],
      }));
    },
    [play]
  );

  // ── Ball resolution ──────────────────────────────────────────────

  /** Runs once a ball's outcome has lingered on screen: continue the
   *  current innings, break to innings 2, or end the match. */
  const advanceAfterBall = useCallback(() => {
    const { phase, isOut, playerRuns, botRuns, target, difficulty } = stateRef.current;
    if (!difficulty) return;

    if (phase === 'innings1') {
      if (isOut) {
        setState((s) => ({
          ...s,
          phase: 'innings-break',
          target: getTarget(playerRuns),
          ballState: 'ready',
          playerPick: null,
          botPick: null,
        }));
      } else {
        setState((s) => (s.phase !== 'innings1' ? s : { ...s, ballState: 'ready', playerPick: null, botPick: null }));
      }
      return;
    }

    if (phase === 'innings2') {
      if (isOut) {
        const result: MatchResult = botRuns === playerRuns ? 'tie' : 'win';
        finishMatch(result, target);
        return;
      }
      if (botRuns >= target) {
        finishMatch('loss', target);
        return;
      }
      setState((s) => (s.phase !== 'innings2' ? s : { ...s, ballState: 'ready', playerPick: null, botPick: null }));
    }
  }, [finishMatch]);

  const scheduleAdvance = useCallback(() => {
    advanceDeadlineRef.current = performance.now() + RESULT_LINGER_MS;
    advanceTimeoutRef.current = setTimeout(advanceAfterBall, RESULT_LINGER_MS);
  }, [advanceAfterBall]);

  /** Applies a resolved ball's outcome to the score/history and queues the
   *  next transition once it's had time to be seen. */
  const resolveBall = useCallback(
    (pick: number, botPick: number, ballPhase: BallPhase) => {
      const out = pick === botPick;
      play(out ? 'fail' : 'confirm');

      setState((prev) => {
        const record: BallRecord = { playerPick: pick, botPick, phase: ballPhase };
        const history = [...prev.history, record];
        const base = { ...prev, ballState: 'revealed' as BallState, botPick, isOut: out, history };

        if (ballPhase === 'innings1') {
          const playerBalls = prev.playerBalls + 1;
          const playerRuns = out ? prev.playerRuns : prev.playerRuns + pick;
          return { ...base, playerBalls, playerRuns };
        }
        const botBalls = prev.botBalls + 1;
        const botRuns = out ? prev.botRuns : prev.botRuns + pick;
        return { ...base, botBalls, botRuns };
      });

      scheduleAdvance();
    },
    [play, scheduleAdvance]
  );

  const scheduleReveal = useCallback(
    (pick: number, botPick: number, ballPhase: BallPhase) => {
      revealPayloadRef.current = { pick, botPick, ballPhase };
      revealDeadlineRef.current = performance.now() + REVEAL_MS;
      revealTimeoutRef.current = setTimeout(() => {
        const payload = revealPayloadRef.current;
        revealPayloadRef.current = null;
        revealTimeoutRef.current = null;
        if (payload) resolveBall(payload.pick, payload.botPick, payload.ballPhase);
      }, REVEAL_MS);
    },
    [resolveBall]
  );

  /** Player commits a pick (batting in innings 1, bowling in innings 2).
   *  The bot's pick is drawn immediately — from history only, never this
   *  pick — but stays hidden until the reveal fires. */
  const playBall = useCallback(
    (pick: number) => {
      const { phase, ballState, difficulty, history } = stateRef.current;
      if (!difficulty) return;
      if (phase !== 'innings1' && phase !== 'innings2') return;
      if (ballState !== 'ready') return;

      const ballPhase: BallPhase = phase;
      const botPick =
        ballPhase === 'innings1' ? botBowl(history, difficulty, rand) : botBat(history, difficulty, rand);

      setState((prev) =>
        prev.ballState !== 'ready' || prev.phase !== phase
          ? prev
          : { ...prev, ballState: 'revealing', playerPick: pick, botPick: null }
      );

      scheduleReveal(pick, botPick, ballPhase);
    },
    [rand, scheduleReveal]
  );

  const startInnings2 = useCallback(() => {
    setState((s) => (s.phase !== 'innings-break' ? s : { ...s, phase: 'innings2' }));
  }, []);

  // ── Advance between matches ───────────────────────────────────────

  const nextMatch = useCallback(() => {
    if (transitioningRef.current) return;
    const { match, totalMatches, phase, mode, totalScore, difficulty } = stateRef.current;
    if (phase !== 'match-result' || !difficulty) return;
    transitioningRef.current = true;
    play('click');

    if (match >= totalMatches) {
      if (mode === 'challenge') {
        setState((s) => ({ ...s, phase: 'challenge-complete' }));
      } else {
        const isNewBestSession = saveBestSession(GAME_ID, totalScore);
        setState((s) => ({ ...s, phase: 'session-complete', isNewBestSession }));
      }
      play('celebrate');
    } else {
      const nextDifficulty = challengeRounds?.[match]?.difficulty ?? difficulty;
      startMatch(nextDifficulty, match + 1);
    }

    setTimeout(() => {
      transitioningRef.current = false;
    }, 500);
  }, [play, challengeRounds, startMatch]);

  const replay = useCallback(() => {
    const { difficulty } = stateRef.current;
    if (difficulty) selectDifficulty(difficulty);
  }, [selectDifficulty]);

  // A backgrounded tab must not resolve a ball's reveal/advance the player
  // never actually watched — push whichever deadline is active forward by
  // exactly how long the tab was hidden and reschedule from there, the same
  // pattern the round timers in other games use for their own deadlines.
  useEffect(() => {
    let hiddenAt: number | null = null;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenAt = performance.now();
        return;
      }
      if (hiddenAt === null) return;
      const hiddenMs = performance.now() - hiddenAt;
      hiddenAt = null;

      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
        revealDeadlineRef.current += hiddenMs;
        const remaining = Math.max(0, revealDeadlineRef.current - performance.now());
        revealTimeoutRef.current = setTimeout(() => {
          const payload = revealPayloadRef.current;
          revealPayloadRef.current = null;
          revealTimeoutRef.current = null;
          if (payload) resolveBall(payload.pick, payload.botPick, payload.ballPhase);
        }, remaining);
      }
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceDeadlineRef.current += hiddenMs;
        const remaining = Math.max(0, advanceDeadlineRef.current - performance.now());
        advanceTimeoutRef.current = setTimeout(advanceAfterBall, remaining);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [resolveBall, advanceAfterBall]);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  return {
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
  };
}
