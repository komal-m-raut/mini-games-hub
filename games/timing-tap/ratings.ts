import { TapRating } from './types';

export interface TapRatingMeta {
  /** Outcome colour — drives the result headline, the landing marker on the
   *  bar and the round pip, so a rating always reads as the same hue. */
  color: string;
  message: string;
  confetti: 'perfect' | 'great' | 'good' | null;
}

/**
 * Shared because the bar (marker tint), the result screen and the round
 * progress strip all key off the same rating, and a per-surface copy is how
 * they drift apart.
 */
export const TAP_RATING_META: Record<TapRating, TapRatingMeta> = {
  Perfect: {
    color: '#EAB308',
    message: 'Dead centre — flawless timing!',
    confetti: 'perfect',
  },
  Amazing: {
    color: '#F97316',
    message: 'Lightning-fast reflexes.',
    confetti: 'great',
  },
  Great: {
    color: '#06B6D4',
    message: 'Sharp timing.',
    confetti: 'good',
  },
  Good: {
    color: '#A78BFA',
    message: 'Decent tap.',
    confetti: null,
  },
  'Try Again': {
    color: '#94A3B8',
    message: 'Watch the sweep and try again.',
    confetti: null,
  },
};
