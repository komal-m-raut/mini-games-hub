'use client';

import { useEffect } from 'react';
import { getPlayerId } from '@/lib/player';

/**
 * Fire-and-forget play beacon: POSTs /api/events once on mount so hub stats
 * count this game. Generalized from balloon-match's original inline effect
 * so every game reports the same way — including future freeform games
 * (endless Snake, a full 2048 run) that have no discrete "round" to key off.
 */
export function usePlayBeacon(gameId: string): void {
  useEffect(() => {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'play', gameId, playerId: getPlayerId() }),
      keepalive: true,
    }).catch(() => {});
  }, [gameId]);
}
