'use client';

import { ArrowRight, CalendarDays, Play, Swords } from 'lucide-react';

interface ModeSelectorProps {
  accent?: string;
  soloHint?: string;
  onSolo: () => void;
  onDailyChallenge: () => void;
  onFriendChallenge: () => void;
  friendLabel?: string;
  friendHint?: string;
  friendBusy?: boolean;
}

export function ModeSelector({
  accent = '#D7FF64',
  soloHint = 'Five rounds at your own pace',
  onSolo,
  onDailyChallenge,
  onFriendChallenge,
  friendLabel = 'Friend room',
  friendHint = 'One link, one private board',
  friendBusy = false,
}: ModeSelectorProps) {
  return (
    <section className="mode-dock" style={{ '--mode-accent': accent } as React.CSSProperties}>
      <header>
        <p>Choose a way to play</p>
        <h2>Ready when you are.</h2>
      </header>

      <div className="mode-dock__grid">
        <button type="button" onClick={onSolo} className="mode-card mode-card--primary">
          <span className="mode-card__icon"><Play fill="currentColor" aria-hidden="true" /></span>
          <span className="mode-card__copy">
            <strong>Warm-up run</strong>
            <small>{soloHint}</small>
          </span>
          <ArrowRight className="mode-card__arrow" aria-hidden="true" />
        </button>

        <button type="button" onClick={onDailyChallenge} className="mode-card">
          <span className="mode-card__icon"><CalendarDays aria-hidden="true" /></span>
          <span className="mode-card__copy">
            <strong>Today&apos;s run</strong>
            <small>One shared board worldwide</small>
          </span>
          <ArrowRight className="mode-card__arrow" aria-hidden="true" />
        </button>

        <button type="button" onClick={onFriendChallenge} className="mode-card" disabled={friendBusy}>
          <span className="mode-card__icon"><Swords aria-hidden="true" /></span>
          <span className="mode-card__copy">
            <strong>{friendBusy ? 'Opening room…' : friendLabel}</strong>
            <small>{friendHint}</small>
          </span>
          <ArrowRight className="mode-card__arrow" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
