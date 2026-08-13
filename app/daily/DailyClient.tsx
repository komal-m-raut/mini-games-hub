'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { AVAILABLE_GAMES } from '@/lib/gameRegistry';
import { challengePath, getDailyChallengeCode } from '@/lib/challenge';
import { useQuests } from '@/lib/quests';
import { localDateString, useDaysPlayed, useStreak } from '@/lib/streak';
import { QuestList } from '@/components/meta/QuestList';
import { StreakFlame } from '@/components/meta/StreakFlame';
import { cn } from '@/lib/utils';

// "Has this component hydrated on the client yet?" — deliberately not a
// useState+useEffect toggle (React's set-state-in-effect rule flags that
// pattern); useSyncExternalStore's server/client snapshot split already
// exists for exactly this, matching lib/{progress,streak}.ts's own hooks.
const subscribeNever = () => () => {};
const getHydratedTrue = () => true;
const getHydratedFalse = () => false;
function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, getHydratedTrue, getHydratedFalse);
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * This month's grid, marking locally-played days. Reads wall-clock "now" in
 * the visitor's own timezone (unlike the UTC-dated daily challenge code), so
 * DailyClient only mounts this once hydrated — a server (typically UTC) and
 * a visitor west of it can disagree on "today" for a large chunk of every
 * day, which would otherwise mismatch the grid's shape, not just its data.
 */
function MonthCalendar({ playedDays }: { playedDays: string[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const todayStr = localDateString(now);
  const playedSet = new Set(playedDays);

  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="font-ui text-xs text-ink-3 uppercase tracking-widest mb-3">
        {MONTH_NAMES[month]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-2xs text-ink-4 font-ui">
            {label}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`pad-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const played = playedSet.has(dateStr);
          const isToday = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={cn(
                'aspect-square rounded-lg grid place-items-center text-xs font-score',
                played ? 'bg-brand-purple/30 text-ink-1' : 'bg-white/5 text-ink-4',
                isToday && 'ring-1 ring-brand-cyan'
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DailyClient() {
  const quests = useQuests();
  const streak = useStreak();
  const daysPlayed = useDaysPlayed();
  const dailyCode = getDailyChallengeCode();
  const mounted = useHydrated();

  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-10">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl mb-2">Daily Quests &amp; Challenges</h1>
        <p className="text-ink-3 text-sm max-w-2xl">
          Three fresh quests every day, a streak that rewards showing up, and a seeded Daily
          Gauntlet — the same rounds for every player, in every game, until the day resets.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-[260px_1fr] items-start">
        <div className="glass-card flex flex-col gap-6 py-6 px-6">
          <div>
            <p className="font-ui text-xs text-ink-3 uppercase tracking-widest mb-3">Streak</p>
            <StreakFlame streak={streak} />
          </div>
          <div className="border-t border-white/5 pt-5">
            {mounted ? (
              <MonthCalendar playedDays={daysPlayed} />
            ) : (
              <p className="text-ink-4 text-xs font-ui">Loading calendar…</p>
            )}
          </div>
        </div>

        <div className="glass-card">
          <p className="font-ui text-xs text-ink-3 uppercase tracking-widest mb-4">
            Today&apos;s Quests
          </p>
          <QuestList quests={quests} />
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-brand-cyan" strokeWidth={1.5} />
          <h2 className="font-display text-xl">Daily Gauntlet</h2>
        </div>
        <p className="text-ink-3 text-sm mb-5">
          Every game&apos;s Daily Challenge for today: 3 seeded rounds, identical for every
          player, with a shared leaderboard.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {AVAILABLE_GAMES().map((game) => (
            <Link
              key={game.id}
              href={challengePath(game.id, dailyCode)}
              className="glass-card flex flex-col items-center gap-2 py-5 px-3 text-center hover:bg-white/10 transition-colors"
            >
              <span className="text-3xl" aria-hidden="true">
                {game.emoji}
              </span>
              <span className="font-ui text-sm text-ink-1">{game.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
