'use client';

import { useEffect, useRef } from 'react';
import { ADSENSE_CONFIG, AdPlacementId } from './AdConfig';

type AdFormat = 'banner' | 'rectangle' | 'leaderboard';

interface AdBannerProps {
  placement: AdPlacementId;
  format?: AdFormat;
  className?: string;
}

const FORMAT_DIMENSIONS: Record<AdFormat, { width: number; height: number }> = {
  banner: { width: 468, height: 60 },
  rectangle: { width: 336, height: 280 },
  leaderboard: { width: 728, height: 90 },
};

/**
 * Reusable AdSense banner component.
 *
 * In development: renders a labeled placeholder so layout can be validated.
 * In production: injects the AdSense <ins> element and calls adsbygoogle.push({}).
 *
 * Never renders during gameplay — only place this component outside game views.
 */
export function AdBanner({ placement, format = 'banner', className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const { width, height } = FORMAT_DIMENSIONS[format];
  const slot = ADSENSE_CONFIG.slots[placement];

  useEffect(() => {
    if (!ADSENSE_CONFIG.enabled || !slot) return;
    try {
      // @ts-expect-error — adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not yet loaded — silently skip
    }
  }, [slot]);

  // Development placeholder
  if (!ADSENSE_CONFIG.enabled || !slot) {
    return (
      <div
        className={`ad-placeholder ${className}`}
        style={{ width: `min(100%, ${width}px)`, height }}
        aria-label={`Advertisement space: ${placement}`}
      >
        <span className="ad-placeholder-label">
          Ad · {format} · {placement}
        </span>
        <span className="ad-placeholder-size">
          {width}×{height}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`ad-container ${className}`}
      style={{ width: `min(100%, ${width}px)`, height, overflow: 'hidden' }}
    >
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
