/**
 * Google AdSense Configuration
 *
 * Replace ADSENSE_PUBLISHER_ID with your actual publisher ID before going live.
 * Replace each slot value with the Ad Unit ID from your AdSense dashboard.
 *
 * Format: ca-pub-XXXXXXXXXXXXXXXXX
 */
export const ADSENSE_CONFIG = {
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXXX',

  slots: {
    'below-hub-banner': 'XXXXXXXXXX',
    'between-games-banner': 'XXXXXXXXXX',
    'footer-banner': 'XXXXXXXXXX',
  } as Record<string, string>,

  /** Set to false to hide all ads during development or testing. */
  enabled: process.env.NODE_ENV === 'production',
} as const;

export type AdPlacementId = keyof typeof ADSENSE_CONFIG.slots;
