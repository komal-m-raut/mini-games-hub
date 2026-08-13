'use client';

import { useEffect, useRef, useState } from 'react';
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
  // AdSense marks a slot it couldn't fill with data-ad-status="unfilled" on
  // the <ins> element itself, asynchronously and with no prop/callback —
  // the only way to know is to watch the DOM. Left alone, an unfilled slot
  // keeps its reserved width/height forever: a visible empty box (issues.md
  // #1/#8). Once we see that status, stop rendering the container entirely.
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    if (!ADSENSE_CONFIG.enabled || !slot) return;
    const el = adRef.current;

    try {
      // @ts-expect-error — adsbygoogle is injected by the AdSense script
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // AdSense script not yet loaded — silently skip
    }

    if (!el) return undefined;

    const checkStatus = () => {
      if (el.getAttribute('data-ad-status') === 'unfilled') {
        setUnfilled(true);
      }
    };
    // A fast response can set the attribute before the observer below is
    // even attached, so check once up front...
    checkStatus();
    // ...then keep watching — the usual case is AdSense setting it some
    // time after the push above resolves.
    const observer = new MutationObserver(checkStatus);
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
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

  // Confirmed unfilled — render nothing rather than leave a dead,
  // ad-shaped hole in the page.
  if (unfilled) return null;

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
      />
    </div>
  );
}
