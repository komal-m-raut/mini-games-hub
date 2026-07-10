import { Difficulty, GameResult, Rating } from '@/types/game';
import { SCORE_VALUES } from '@/lib/constants';

/** Base score before multipliers. */
function baseScore(rating: Rating): number {
  return SCORE_VALUES[rating] ?? 100;
}

/** Bonus for accuracy above the base value for the rating. */
function accuracyBonus(accuracy: number): number {
  return Math.round(accuracy * 2);
}

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2.5,
};

export function calculateScore(
  rating: Rating,
  accuracy: number,
  difficulty: Difficulty
): number {
  const raw = (baseScore(rating) + accuracyBonus(accuracy)) * DIFFICULTY_MULTIPLIER[difficulty];
  return Math.round(raw);
}

export function formatScore(score: number): string {
  return score.toLocaleString();
}

/** Simple session high-score stored in localStorage. */
const LS_KEY = 'mgh_balloon_highscore';

export function getLocalHighScore(): number {
  if (typeof window === 'undefined') return 0;
  return Number(localStorage.getItem(LS_KEY) ?? 0);
}

export function saveHighScore(score: number): boolean {
  if (typeof window === 'undefined') return false;
  const prev = getLocalHighScore();
  if (score > prev) {
    localStorage.setItem(LS_KEY, String(score));
    return true;
  }
  return false;
}
