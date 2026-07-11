'use client';

import { useEffect, useState } from 'react';

export interface SiteStats {
  totalPlayers: number;
  totalPlays: number;
}

/** Live site totals (unique players, completed plays). Null while loading. */
export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStats(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return stats;
}
