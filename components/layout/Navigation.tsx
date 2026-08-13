'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, CalendarDays, BookOpen, Flame } from 'lucide-react';
import { useProgress, levelForXp, xpIntoLevel } from '@/lib/progress';
import { useStreak } from '@/lib/streak';
import { useQuests } from '@/lib/quests';

/** Small ring + level number for the profile chip. A dedicated conic-gradient
 *  ring rather than reusing `<LevelRing>` — that component's internal type
 *  scale ("Lvl" label + a 2xl number) is tuned for a 96px profile-page ring
 *  and doesn't hold up shrunk to a 28px nav chip. */
function NavLevelRing({ xp }: { xp: number }) {
  const level = levelForXp(xp);
  const { into, needed } = xpIntoLevel(xp);
  const pct = needed > 0 ? Math.min(100, Math.round((into / needed) * 100)) : 100;

  return (
    <span className="hub-level-chip" style={{ '--pct': pct } as React.CSSProperties} aria-hidden="true">
      <span className="hub-level-chip__inner">{level}</span>
    </span>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const progress = useProgress();
  const streak = useStreak();
  const quests = useQuests();
  const incompleteQuests = quests.filter((q) => !q.done).length;

  const isDaily = pathname === '/daily';
  const isGuides = pathname.startsWith('/guides');
  const isProfile = pathname === '/profile';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav slide-down" aria-label="Primary">
      <div className="page-container">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo — also the "back to hub" affordance on every page, so a
              separate "All Games" link would just be a second route to the
              same place (M21). */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative">
              <Gamepad2
                className="w-7 h-7 text-brand-purple transition-all duration-300 group-hover:text-brand-cyan"
                strokeWidth={1.5}
              />
              <div className="absolute inset-0 blur-md bg-brand-purple opacity-40 group-hover:opacity-70 transition-opacity" />
            </div>
            <span className="font-display text-sm sm:text-lg tracking-wide whitespace-nowrap">
              <span className="text-brand-purple group-hover:text-brand-cyan transition-colors duration-300">
                Tiny
              </span>
              <span className="text-white ml-1">Arcadium</span>
            </span>
          </Link>

          {/* Desktop links — the bottom tab bar covers the same three
              destinations below `sm`. */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/daily"
              className="nav-link whitespace-nowrap"
              aria-current={isDaily ? 'page' : undefined}
            >
              <CalendarDays className="w-4 h-4" strokeWidth={1.5} />
              <span>Daily</span>
              {incompleteQuests > 0 && (
                <span className="hub-nav-pip" aria-label={`${incompleteQuests} quests left today`}>
                  {incompleteQuests}
                </span>
              )}
            </Link>
            <Link
              href="/guides"
              className="nav-link whitespace-nowrap"
              aria-current={isGuides ? 'page' : undefined}
            >
              <BookOpen className="w-4 h-4" strokeWidth={1.5} />
              <span>Guides</span>
            </Link>
            <Link
              href="/profile"
              className="nav-profile-chip"
              aria-current={isProfile ? 'page' : undefined}
              aria-label={`Profile — level ${progress.level}${streak.current >= 1 ? `, ${streak.current} day streak` : ''}`}
            >
              <NavLevelRing xp={progress.xp} />
              {streak.current >= 1 && (
                <span className="hub-flame-chip" aria-hidden="true">
                  <Flame className="w-3.5 h-3.5" fill="#F97316" strokeWidth={0} />
                  {streak.current}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
