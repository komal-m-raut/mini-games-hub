import { MAX_ROUND_SCORE, formatScore, round2 } from '@/utils/scoring';

/**
 * Emoji tier for a single round score out of 10. Bands were originally
 * integer-only (10 / 8-9 / 6-7 / 3-5 / 0-2); re-tuned to the same score
 * curve as `ratingFromScore` (H3) now that scores carry 2dp, so e.g. a
 * 9.7 (barely short of a clean 10) still reads as the top tier.
 */
export function scoreEmoji(score: number): string {
  if (score >= 9.5) return '🎯';
  if (score >= 8) return '🟢';
  if (score >= 6) return '🟡';
  if (score >= 3) return '🟠';
  return '🔴';
}

interface SessionShareInput {
  emoji: string;
  game: string;
  /** Difficulty or mode line, e.g. "Hard". */
  subtitle: string;
  roundScores: number[];
  /** Game path, e.g. "/games/perfect-pour". */
  path: string;
  origin: string;
}

/**
 * Wordle-style result summary shared by every round-based game:
 * a title line, an emoji grid with the total, and a play link.
 */
export function buildSessionShare({
  emoji,
  game,
  subtitle,
  roundScores,
  path,
  origin,
}: SessionShareInput): string {
  const total = round2(roundScores.reduce((a, b) => a + b, 0));
  const max = roundScores.length * MAX_ROUND_SCORE;
  const grid = roundScores.map(scoreEmoji).join(' ');
  return [
    `${emoji} ${game} — ${subtitle}`,
    `${grid}  ${formatScore(total)}/${max}`,
    `Play: ${origin}${path}`,
  ].join('\n');
}
