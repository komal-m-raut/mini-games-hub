import { Rating } from '@/types/game';

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
 * Returns a rating based on accuracy vs the difficulty's tolerance.
 */
export function getRating(accuracy: number, tolerancePercent: number): Rating {
  const base = 100 - tolerancePercent;
  if (accuracy >= base + tolerancePercent * 0.5) return 'Perfect';
  if (accuracy >= base) return 'Great';
  if (accuracy >= base - tolerancePercent) return 'Good';
  return 'Try Again';
}
