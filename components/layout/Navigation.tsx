'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gamepad2, Home } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const isGame = pathname !== '/';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav slide-down">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="relative">
              <Gamepad2
                className="w-7 h-7 text-brand-purple transition-all duration-300 group-hover:text-brand-cyan"
                strokeWidth={1.5}
              />
              <div className="absolute inset-0 blur-md bg-brand-purple opacity-40 group-hover:opacity-70 transition-opacity" />
            </div>
            <span className="font-display text-sm sm:text-lg font-bold tracking-wide whitespace-nowrap">
              <span className="text-brand-purple group-hover:text-brand-cyan transition-colors duration-300">
                Tiny
              </span>
              <span className="text-white ml-1">Arcadium</span>
            </span>
          </Link>

          {/* Single, clearly-labelled control back to the hub — the logo
              already covers "go home", so this is the only other link
              pointing at "/" (M21). Only shown on game pages: on the hub
              itself there's nowhere else for it to go. */}
          {isGame && (
            <Link href="/" className="nav-link whitespace-nowrap">
              <Home className="w-4 h-4" strokeWidth={1.5} />
              <span>All Games</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
