'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Gamepad2, Home, Search } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Hub', Icon: Home },
];

export function Navigation() {
  const pathname = usePathname();
  const isGame = pathname !== '/';
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 glass-nav border-b border-white/5"
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
              <div className="absolute inset-0 blur-md bg-brand-purple opacity-20 group-hover:opacity-40 transition-opacity" />
            </div>
            <span className="font-display text-sm sm:text-lg font-bold tracking-wide whitespace-nowrap">
              <span className="text-brand-purple group-hover:text-brand-cyan transition-colors duration-300">
                Mini
              </span>
              <span className="text-white ml-1">Games</span>
            </span>
          </Link>

          {/* Center: Search (only on hub) */}
          {!isGame && (
            <div className="flex-1 max-w-xs mx-8 hidden sm:flex">
              <div className="relative w-full group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search games..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-purple/50 focus:bg-white/10 transition-all duration-200"
                />
              </div>
            </div>
          )}

          {/* Right: Nav links */}
          <div className="flex items-center gap-2">
            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="sm:hidden nav-link"
              aria-label="Search"
            >
              <Search className="w-4 h-4" strokeWidth={1.5} />
            </button>

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
              <Link href="/" className="nav-link ml-2 whitespace-nowrap text-sm">
                <span className="sm:hidden">← Back</span>
                <span className="hidden sm:inline">← All Games</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && !isGame && (
          <motion.div
            className="pb-4 sm:hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
              <input
                type="search"
                placeholder="Search games..."
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-brand-purple/50 focus:bg-white/10 transition-all duration-200"
              />
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
