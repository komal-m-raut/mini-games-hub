'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Flame, UserRound } from 'lucide-react';
import { useStreak } from '@/lib/streak';

export function Navigation() {
  const pathname = usePathname();
  const streak = useStreak();

  return (
    <nav className="club-nav" aria-label="Primary">
      <div className="page-container club-nav__inner">
        <Link href="/" className="club-wordmark" aria-label="Mettle home">
          <span aria-hidden="true">M</span>
          <strong>Mettle</strong>
        </Link>

        <div className="club-nav__links">
          <Link href="/#games" className={pathname === '/' ? 'is-active' : undefined}>
            Games
          </Link>
          <Link href="/daily" className={pathname === '/daily' ? 'is-active' : undefined}>
            <CalendarDays aria-hidden="true" /> Daily
          </Link>
          <Link
            href="/profile"
            className={pathname === '/profile' ? 'club-profile is-active' : 'club-profile'}
            aria-label={`Profile${streak.current > 0 ? `, ${streak.current} day streak` : ''}`}
          >
            <UserRound aria-hidden="true" />
            <span>Profile</span>
            {streak.current > 0 ? (
              <em><Flame aria-hidden="true" /> {streak.current}</em>
            ) : null}
          </Link>
        </div>
      </div>
    </nav>
  );
}
