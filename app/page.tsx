'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Sparkles,
  Swords,
} from 'lucide-react';
import { CATEGORY_META, GAME_REGISTRY } from '@/lib/gameRegistry';
import { challengePath, generateChallengeCode, getDailyChallengeCode } from '@/lib/challenge';
import { useQuests } from '@/lib/quests';
import { useStreak } from '@/lib/streak';
import { GameCategory, GameMeta } from '@/types/game';
import { cn } from '@/lib/utils';

const FEATURED_GAME_ID = 'fading-xo';

const FILTERS: Array<{ id: GameCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All games' },
  { id: 'duel', label: 'Duels' },
  { id: 'precision', label: 'Precision' },
  { id: 'memory', label: 'Memory' },
  { id: 'perception', label: 'Perception' },
  { id: 'reflex', label: 'Reflex' },
];

const PLAY_TIMES: Partial<Record<GameCategory, string>> = {
  duel: '3 min',
  precision: '2 min',
  memory: '2 min',
  perception: '90 sec',
  reflex: '60 sec',
  speed: '60 sec',
};

function GameCard({ game, index }: { game: GameMeta; index: number }) {
  return (
    <Link
      href={game.href}
      className="club-game-card"
      style={{ '--game': game.accent, '--delay': `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}
      aria-label={`Play ${game.title}`}
    >
      <div className="club-game-card__top">
        <span className="club-game-card__number">{String(index + 1).padStart(2, '0')}</span>
        <span className="club-game-card__time">
          <Clock3 aria-hidden="true" /> {PLAY_TIMES[game.category] ?? '2 min'}
        </span>
      </div>
      <div className="club-game-card__mark" aria-hidden="true">
        {game.emoji}
      </div>
      <div className="club-game-card__copy">
        <p>{CATEGORY_META[game.category].label}</p>
        <h3>{game.title}</h3>
        <span>{game.tagline}</span>
      </div>
      <span className="club-game-card__arrow" aria-hidden="true">
        <ArrowRight />
      </span>
    </Link>
  );
}

function GhostGridPreview() {
  const cells = ['X', 'O', '', '', 'X', 'O', 'O', '', 'X'];
  return (
    <div className="ghost-preview" aria-hidden="true">
      {cells.map((cell, index) => (
        <span
          key={index}
          className={cn(
            'ghost-preview__cell',
            cell === 'X' && 'is-x',
            cell === 'O' && 'is-o',
            index === 1 && 'is-fading'
          )}
        >
          {cell}
        </span>
      ))}
    </div>
  );
}

export default function HubPage() {
  const router = useRouter();
  const [category, setCategory] = useState<GameCategory | 'all'>('all');
  const quests = useQuests();
  const streak = useStreak();
  const completedQuests = quests.filter((quest) => quest.done).length;

  const games = useMemo(
    () => (category === 'all' ? GAME_REGISTRY : GAME_REGISTRY.filter((game) => game.category === category)),
    [category]
  );

  const createFriendRoom = () => router.push(challengePath(FEATURED_GAME_ID, generateChallengeCode()));

  return (
    <div className="club-home">
      <section className="club-hero page-container">
        <div className="club-hero__copy">
          <div className="club-eyebrow club-reveal">
            <span className="club-live-dot" /> Season 01 · Open now
          </div>
          <h1 className="club-reveal" style={{ '--delay': '70ms' } as React.CSSProperties}>
            Small games.
            <br />
            <em>Real bragging rights.</em>
          </h1>
          <p className="club-reveal" style={{ '--delay': '130ms' } as React.CSSProperties}>
            A curated club of quick skill games. Play in a minute, challenge a friend with one link,
            and settle the score on your own leaderboard.
          </p>
          <div className="club-hero__actions club-reveal" style={{ '--delay': '190ms' } as React.CSSProperties}>
            <Link href={challengePath(FEATURED_GAME_ID, getDailyChallengeCode())} className="club-button club-button--primary">
              <CalendarDays aria-hidden="true" /> Play today&apos;s run
            </Link>
            <button type="button" onClick={createFriendRoom} className="club-button club-button--quiet">
              <Swords aria-hidden="true" /> Challenge a friend
            </button>
          </div>
          <div className="club-proof club-reveal" style={{ '--delay': '250ms' } as React.CSSProperties}>
            <span><Check aria-hidden="true" /> No account</span>
            <span><Check aria-hidden="true" /> No download</span>
            <span><Check aria-hidden="true" /> Made for touch</span>
          </div>
        </div>

        <Link
          href="/games/fading-xo"
          className="feature-duel club-reveal"
          style={{ '--delay': '140ms' } as React.CSSProperties}
          aria-label="Play Ghost Grid, the featured duel"
        >
          <div className="feature-duel__head">
            <span>Featured duel</span>
            <span>01 / {String(GAME_REGISTRY.length).padStart(2, '0')}</span>
          </div>
          <GhostGridPreview />
          <div className="feature-duel__footer">
            <div>
              <p>1 vs 1 · strategy</p>
              <h2>Ghost Grid</h2>
            </div>
            <span className="feature-duel__play"><ArrowRight /></span>
          </div>
        </Link>
      </section>

      <section className="club-daily page-container" aria-label="Daily progress">
        <div>
          <span className="club-daily__icon"><Sparkles aria-hidden="true" /></span>
          <div>
            <p>Today&apos;s club card</p>
            <h2>{completedQuests === quests.length && quests.length > 0 ? 'Daily card complete' : 'Three quick goals. One clean streak.'}</h2>
          </div>
        </div>
        <div className="club-daily__stats">
          <span><strong>{streak.current}</strong> day streak</span>
          <span><strong>{completedQuests}/{quests.length || 3}</strong> goals</span>
        </div>
        <Link href="/daily">View today <ArrowRight aria-hidden="true" /></Link>
      </section>

      <section className="club-library page-container" id="games">
        <div className="club-section-head">
          <div>
            <p className="club-kicker">The game room</p>
            <h2>Pick your edge.</h2>
          </div>
          <p>Original, replayable trials—curated down to the ones worth mastering.</p>
        </div>

        <div className="club-filters" role="group" aria-label="Filter games by skill">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setCategory(filter.id)}
              className={cn(category === filter.id && 'is-active')}
              aria-pressed={category === filter.id}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {games.length > 0 ? (
          <div className="club-game-grid">
            {games.map((game, index) => <GameCard key={game.id} game={game} index={index} />)}
          </div>
        ) : (
          <div className="club-empty">More original games in this skill are being prototyped.</div>
        )}
      </section>

      <section className="club-rivalry page-container">
        <div className="club-rivalry__copy">
          <span className="club-kicker">Private rivalry</span>
          <h2>Your link. Your people. Your leaderboard.</h2>
          <p>
            Create a room, send one link, and everyone plays the same seeded run on their own time.
            No lobby, login, or scheduling required.
          </p>
        </div>
        <div className="club-rivalry__steps">
          <span><strong>01</strong> Pick a game</span>
          <span><strong>02</strong> Copy the link <Copy aria-hidden="true" /></span>
          <span><strong>03</strong> Climb your board</span>
        </div>
        <button type="button" onClick={createFriendRoom} className="club-button club-button--light">
          Start with Ghost Grid <ArrowRight aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
