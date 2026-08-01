const publisherId = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID ?? '';

if (process.env.NODE_ENV === 'production' && !publisherId) {
  // Runs once at module init (not per-render) — flags a misconfigured
  // production build where ads silently fall back to the dev placeholder.
  console.warn(
    '[AdConfig] NEXT_PUBLIC_ADSENSE_PUBLISHER_ID is not set in production — ad placeholders will render instead of real ads.'
  );
}

export const ADSENSE_CONFIG = {
  publisherId,

  slots: {
    'below-hub-banner': '3890552192',
    'between-games-banner': '1381873156',
    'footer-banner': '5129546472',
  } as Record<string, string>,

  /** Ads only run in production when the publisher ID is set. */
  enabled: process.env.NODE_ENV === 'production' && !!publisherId,
} as const;

export type AdPlacementId = keyof typeof ADSENSE_CONFIG.slots;
