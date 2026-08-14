import { describe, expect, it } from 'vitest';
import { createInitialState } from '@/games/fading-xo/engine';
import {
  LIVE_DUEL_CODE_PATTERN,
  type LiveDuelRoom,
  playerRole,
  publicRoom,
} from '@/lib/liveDuel';

function room(): LiveDuelRoom {
  return {
    code: 'ab2cd3',
    players: {
      X: { playerId: 'host-secret-id', name: 'Asha' },
      O: { playerId: 'guest-secret-id', name: 'Ravi' },
    },
    engine: createInitialState('X'),
    status: 'playing',
    version: 2,
    createdAt: '2026-08-14T10:00:00.000Z',
    updatedAt: '2026-08-14T10:00:01.000Z',
  };
}

describe('live duel room helpers', () => {
  it('recognizes both players without assigning spectators a role', () => {
    const liveRoom = room();
    expect(playerRole(liveRoom, 'host-secret-id')).toBe('X');
    expect(playerRole(liveRoom, 'guest-secret-id')).toBe('O');
    expect(playerRole(liveRoom, 'spectator-id')).toBeNull();
  });

  it('never exposes private player ids in a public room', () => {
    const result = publicRoom(room());
    expect(result.players).toEqual({ X: { name: 'Asha' }, O: { name: 'Ravi' } });
    expect(JSON.stringify(result)).not.toContain('secret-id');
  });

  it('accepts unambiguous six-character room codes only', () => {
    expect(LIVE_DUEL_CODE_PATTERN.test('ab2cd3')).toBe(true);
    expect(LIVE_DUEL_CODE_PATTERN.test('AB2CD3')).toBe(false);
    expect(LIVE_DUEL_CODE_PATTERN.test('room01')).toBe(false);
    expect(LIVE_DUEL_CODE_PATTERN.test('short')).toBe(false);
  });
});
