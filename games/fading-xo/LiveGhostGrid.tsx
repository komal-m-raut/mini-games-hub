'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, LoaderCircle, RefreshCw, Swords, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Player } from './engine';
import type { PublicLiveDuelRoom } from '@/lib/liveDuel';
import { getPlayerId, getPlayerName } from '@/lib/player';
import { FadingXoBoard } from './components/FadingXoBoard';
import { SoundToggle } from '@/components/ui/SoundToggle';

const MARK_COLOR = { X: '#D7FF64', O: '#74DCD0' } as const;

interface RoomPayload {
  room: PublicLiveDuelRoom;
  role: Player | null;
}

function localPlayer() {
  const playerId = getPlayerId();
  return {
    playerId,
    name: getPlayerName() || `Player ${playerId.slice(0, 4).toUpperCase()}`,
  };
}

export function LiveGhostGrid({ code }: { code: string }) {
  const router = useRouter();
  const [payload, setPayload] = useState<RoomPayload | null>(null);
  const [error, setError] = useState('');
  const [pendingMove, setPendingMove] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    const { playerId } = localPlayer();
    const response = await fetch(`/api/duels/${code}?playerId=${encodeURIComponent(playerId)}`, {
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(response.status === 404 ? 'This room has expired.' : 'Could not load the room.');
    const next = await response.json() as RoomPayload;
    setPayload((current) => {
      if (current?.room.version === next.room.version && current.role === next.role) return current;
      return next;
    });
    setError('');
    return next;
  }, [code]);

  useEffect(() => {
    let cancelled = false;
    const player = localPlayer();
    (async () => {
      try {
        const response = await fetch(`/api/duels/${code}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', ...player }),
        });
        const data = await response.json();
        if (!response.ok) {
          // A full room can still be watched as a spectator.
          if (response.status === 409) {
            if (!cancelled) await refresh();
            return;
          }
          throw new Error(data.error || 'Could not join the room.');
        }
        if (!cancelled) {
          setPayload(data as RoomPayload);
          setError('');
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Could not join the room.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, refresh]);

  const roomStatus = payload?.room.status;

  useEffect(() => {
    if (!roomStatus || roomStatus === 'complete') return;
    const interval = setInterval(() => {
      if (!document.hidden) refresh().catch(() => undefined);
    }, 650);
    return () => clearInterval(interval);
  }, [roomStatus, refresh]);

  useEffect(() => () => {
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  const move = async (cell: number) => {
    if (!payload || pendingMove) return;
    const player = localPlayer();
    setPendingMove(true);
    try {
      const response = await fetch(`/api/duels/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          playerId: player.playerId,
          cell,
          version: payload.room.version,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Move failed.');
      setPayload(data as RoomPayload);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Move failed.');
      await refresh().catch(() => undefined);
    } finally {
      setPendingMove(false);
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy the link.');
    }
  };

  const newRoom = async () => {
    try {
      const player = localPlayer();
      const response = await fetch('/api/duels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(player),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create a room.');
      router.push(`/games/fading-xo/live/${data.room.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create a room.');
    }
  };

  if (!payload) {
    return (
      <div className="live-duel-state glass-card">
        {error ? <p>{error}</p> : <><LoaderCircle className="animate-spin" /><p>Joining room…</p></>}
        {error ? <button className="btn btn-primary" onClick={() => refresh().catch(() => undefined)}>Try again</button> : null}
      </div>
    );
  }

  const { room, role } = payload;
  const yourTurn = Boolean(role) && room.engine.turn === role && room.status === 'playing';
  const interactive = yourTurn && !pendingMove && !room.engine.winner;
  const opponentName = role === 'X' ? room.players.O?.name : room.players.X.name;
  const winnerName =
    room.engine.winner === 'draw'
      ? null
      : room.engine.winner
        ? room.players[room.engine.winner]?.name
        : null;

  let status = 'Watching live';
  if (room.status === 'waiting') status = 'Waiting for your rival';
  else if (room.engine.winner === 'draw') status = 'Draw — nothing between you';
  else if (winnerName) status = role === room.engine.winner ? 'You won the room' : `${winnerName} won the room`;
  else if (!role) status = `${room.players[room.engine.turn]?.name}'s turn`;
  else status = yourTurn ? 'Your move' : `${opponentName || 'Your rival'} is thinking`;

  return (
    <section className="live-duel">
      <div className="live-duel__top">
        <div>
          <p><span /> Live room</p>
          <h2>{code.toUpperCase()}</h2>
        </div>
        <div className="live-duel__actions">
          <button type="button" onClick={() => refresh().catch(() => undefined)} aria-label="Refresh room">
            <RefreshCw aria-hidden="true" />
          </button>
          <button type="button" onClick={copyInvite}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Copied' : 'Invite'}
          </button>
          <SoundToggle />
        </div>
      </div>

      {room.status === 'waiting' ? (
        <div className="live-duel__waiting">
          <span><UsersRound aria-hidden="true" /></span>
          <h3>Your room is ready.</h3>
          <p>Send the link to one friend. The board starts the moment they join.</p>
          <button type="button" onClick={copyInvite} className="club-button club-button--primary">
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? 'Link copied' : 'Copy invite link'}
          </button>
        </div>
      ) : (
        <div className="live-duel__arena">
          <div className="ghost-game-players" aria-label="Players">
            <span className={room.engine.turn === 'X' && !room.engine.winner ? 'is-active' : undefined}>
              <strong>X</strong> {room.players.X.name}
            </span>
            <em>vs</em>
            <span className={room.engine.turn === 'O' && !room.engine.winner ? 'is-active' : undefined}>
              {room.players.O?.name} <strong>O</strong>
            </span>
          </div>

          <FadingXoBoard
            engine={room.engine}
            interactive={interactive}
            onCellTap={move}
            markColor={MARK_COLOR}
            markLabel={{ X: `${room.players.X.name}'s`, O: `${room.players.O?.name || 'Player O'}'s` }}
          />

          <div className="live-duel__status" role="status" aria-live="polite">
            <Swords aria-hidden="true" />
            <strong>{status}</strong>
            <span>{role ? `You are ${role}` : 'Spectator mode'}</span>
          </div>
        </div>
      )}

      {error ? <p className="live-duel__error">{error}</p> : null}
      {room.status === 'complete' ? (
        <button type="button" onClick={newRoom} className="btn btn-primary">Start a new room</button>
      ) : null}
    </section>
  );
}
