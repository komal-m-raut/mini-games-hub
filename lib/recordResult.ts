/**
 * THE single entry point every completed game flows through: XP, streaks,
 * quests and achievements all update from here, and every use* hook across
 * the meta layer re-renders from the one META_EVENT this dispatches at the
 * end. SessionSummary and ChallengeComplete call it once per mount; freeform
 * games with custom result screens (future work) would call it directly.
 */
import { clamp } from '@/lib/utils';
import { AVAILABLE_GAMES, getGameMeta } from '@/lib/gameRegistry';
import { GameCategory } from '@/types/game';
import { META_EVENT, ProgressState, addXp, getProgress, recordPlay } from './progress';
import { StreakState, recordPlayedToday } from './streak';
import { QuestProgress, applyPlayToQuests, hasPlayedToday } from './quests';
import {
  AchievementDef,
  bumpDailyChallengeCount,
  evaluateAchievements,
  getDailyChallengeCount,
} from './achievements';

export interface GameResultInput {
  gameId: string;
  mode: 'solo' | 'daily' | 'friend';
  /** Present for the shared 0–10-per-round model; freeform games may omit it. */
  roundScores?: number[];
  totalScore: number;
  maxScore: number;
  isNewBest?: boolean;
}

export interface GameResultOutcome {
  xpGained: number;
  leveledUpTo?: number;
  questsCompleted: QuestProgress[];
  achievementsUnlocked: AchievementDef[];
  streak: StreakState;
}

const ZERO_STREAK: StreakState = { current: 0, best: 0, lastDay: '' };

/** Module-level constant — RewardToast treats this as "render nothing". */
export const ZERO_OUTCOME: GameResultOutcome = {
  xpGained: 0,
  questsCompleted: [],
  achievementsUnlocked: [],
  streak: ZERO_STREAK,
};

/**
 * Pure XP math for one completed game, factored out so the curve is
 * testable without touching localStorage: base 20, up to +30 scaled by how
 * close totalScore got to maxScore, +15 for the first play of this game
 * today, +10 for a daily-challenge run.
 */
export function computeXpGain(input: GameResultInput, isFirstPlayToday: boolean): number {
  const pct = input.maxScore > 0 ? clamp(input.totalScore / input.maxScore, 0, 1) : 0;
  let xp = 20 + Math.floor(pct * 30);
  if (isFirstPlayToday) xp += 15;
  if (input.mode === 'daily') xp += 10;
  return xp;
}

function resolveCategory(gameId: string): GameCategory {
  return getGameMeta(gameId)?.category ?? 'arcade';
}

export function recordGameResult(input: GameResultInput): GameResultOutcome {
  if (typeof window === 'undefined') return ZERO_OUTCOME;

  try {
    const isFirstPlayToday = !hasPlayedToday(input.gameId);
    const beforeLevel = getProgress().level;

    recordPlay(input.gameId);

    const scorePct =
      input.maxScore > 0 ? clamp((input.totalScore / input.maxScore) * 100, 0, 100) : 0;
    const { completed: questsCompleted, xpFromQuests } = applyPlayToQuests({
      gameId: input.gameId,
      category: resolveCategory(input.gameId),
      mode: input.mode,
      scorePct,
      isNewBest: Boolean(input.isNewBest),
    });

    const xpGained = computeXpGain(input, isFirstPlayToday) + xpFromQuests;
    const afterProgress: ProgressState = addXp(xpGained);

    const streak = recordPlayedToday();

    const dailyChallengeCount =
      input.mode === 'daily' ? bumpDailyChallengeCount() : getDailyChallengeCount();

    const achievementsUnlocked = evaluateAchievements({
      input,
      progress: afterProgress,
      streak,
      dailyChallengeCount,
      now: new Date(),
      availableGameIds: AVAILABLE_GAMES().map((g) => g.id),
    });

    window.dispatchEvent(new Event(META_EVENT));

    return {
      xpGained,
      leveledUpTo: afterProgress.level > beforeLevel ? afterProgress.level : undefined,
      questsCompleted,
      achievementsUnlocked,
      streak,
    };
  } catch {
    return ZERO_OUTCOME;
  }
}
