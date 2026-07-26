const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? '';

export const ADSENSE_CONFIG = {
  publisherId,

  slots: {
    'below-hub-banner': 'XXXXXXXXXX',
    'between-games-banner': 'XXXXXXXXXX',
    'footer-banner': 'XXXXXXXXXX',
  } as Record<string, string>,

  /** Ads only run in production when the publisher ID is set. */
  enabled: process.env.NODE_ENV === 'production' && !!publisherId,
} as const;

export type AdPlacementId = keyof typeof ADSENSE_CONFIG.slots;
