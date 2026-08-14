import type { FadingXoState, Player } from '@/games/fading-xo/engine';

export const LIVE_DUEL_TTL_MS = 24 * 60 * 60 * 1000;
export const LIVE_DUEL_CODE_PATTERN = /^[a-z2-9]{6}$/;

export interface LiveDuelPlayer {
  playerId: string;
  name: string;
}

export interface LiveDuelRoom {
  code: string;
  players: {
    X: LiveDuelPlayer;
    O: LiveDuelPlayer | null;
  };
  engine: FadingXoState;
  status: 'waiting' | 'playing' | 'complete';
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PublicLiveDuelRoom extends Omit<LiveDuelRoom, 'players'> {
  players: {
    X: { name: string };
    O: { name: string } | null;
  };
}

export function playerRole(room: LiveDuelRoom, playerId: string): Player | null {
  if (room.players.X.playerId === playerId) return 'X';
  if (room.players.O?.playerId === playerId) return 'O';
  return null;
}

export function publicRoom(room: LiveDuelRoom): PublicLiveDuelRoom {
  return {
    ...room,
    players: {
      X: { name: room.players.X.name },
      O: room.players.O ? { name: room.players.O.name } : null,
    },
  };
}
