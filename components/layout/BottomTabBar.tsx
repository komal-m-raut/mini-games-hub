'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, User } from 'lucide-react';
import { useQuests } from '@/lib/quests';
import { cn } from '@/lib/utils';

interface Tab {
  href: string;
  label: string;
  Icon: typeof Home;
  /** Active whenever the pathname matches exactly, or (for section roots)
   *  starts with the href — Guides-style nested routes don't live under
   *  these three, so exact match is enough for all of them today. */
  match: (pathname: string) => boolean;
}

const TABS: Tab[] = [
  { href: '/', label: 'Home', Icon: Home, match: (p) => p === '/' },
  { href: '/daily', label: 'Daily', Icon: CalendarDays, match: (p) => p === '/daily' },
  { href: '/profile', label: 'Profile', Icon: User, match: (p) => p === '/profile' },
];

/**
 * Fixed bottom tab bar, phones only (`sm:hidden` — the desktop nav carries
 * these same three destinations above `sm`). Kept visible on every route,
 * including game pages, per the redesign brief: games already scroll under
 * a fixed top nav, so a fixed bottom bar is consistent rather than jarring.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  const quests = useQuests();
  const incomplete = quests.filter((q) => !q.done).length;

  return (
    <nav className="tabbar sm:hidden" aria-label="Bottom navigation">
      <div className="tabbar-inner">
        {TABS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className="tabbar-link"
              aria-current={active ? 'page' : undefined}
            >
              <span className="tabbar-icon-wrap">
                <Icon strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                {href === '/daily' && incomplete > 0 && (
                  <span className={cn('hub-nav-pip', 'tabbar-pip')}>{incomplete}</span>
                )}
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
