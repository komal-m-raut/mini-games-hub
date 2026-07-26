'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gamepad2, Home, Swords, Trophy } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Hub', Icon: Home },
  { href: '/#challenge', label: 'Challenge', Icon: Swords },
  { href: '/#leaderboard', label: 'Leaderboard', Icon: Trophy },
];

export function Navigation() {
  const pathname = usePathname();
  const isGame = pathname !== '/';

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 glass-nav"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                Mini
              </span>
              <span className="text-white ml-1">Games Hub</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}

            {isGame && (
              <Link href="/" className="nav-link ml-2 whitespace-nowrap">
                <span className="sm:hidden">← Back</span>
                <span className="hidden sm:inline">← All Games</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
