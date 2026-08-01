import { Rating } from '@/types/game';
import { calculateScore, ratingFromScore } from '@/utils/scoring';

/**
 * Returns accuracy percentage (0–100) comparing actual vs target size.
 * 100 = perfect match, 0 = completely off.
 */
export function calculateAccuracy(targetUnits: number, actualUnits: number): number {
  if (targetUnits === 0) return 0;
  const diff = Math.abs(targetUnits - actualUnits);
  const raw = Math.max(0, 100 - (diff / targetUnits) * 100);
  return Math.round(raw * 10) / 10;
}

/**
 * Returns a rating for a round's accuracy. Derived from the same score
 * curve as `calculateScore` (H3) — previously this used a separate,
 * difficulty-tolerance-based formula that could disagree with the score
 * shown beside it (e.g. Hard rating "Try Again" next to an 8/10).
 */
export function getRating(accuracy: number): Rating {
  return ratingFromScore(calculateScore(accuracy));
}
