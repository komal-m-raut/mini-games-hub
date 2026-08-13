import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { AdBanner } from '@/components/ads/AdBanner';
import { GAME_REGISTRY, CATEGORY_META, CATEGORY_ORDER } from '@/lib/gameRegistry';
import { groupByCategory } from '@/components/layout/hubSearch';

/** Registry-driven, so a footer column gains a link the moment a game's
 *  `isAvailable` flips true — no manual edit needed as the roster grows. */
export function Footer() {
  const categoryGroups = groupByCategory(GAME_REGISTRY, CATEGORY_ORDER);

  return (
    <footer className="site-footer relative z-10 mt-auto border-t border-white/5">
      {/* Footer Ad */}
      <div className="py-4 flex justify-center">
        <AdBanner placement="footer-banner" format="leaderboard" />
      </div>

      <div className="page-container py-10">
        <div className="footer-directory">
          {categoryGroups.map(({ category, games }) => (
            <div key={category}>
              <h3 className="footer-col-title">{CATEGORY_META[category].label}</h3>
              <ul className="flex flex-col">
                {games.map((game) => (
                  <li key={game.id}>
                    {game.isAvailable ? (
                      <Link href={game.href} className="footer-game-link">
                        <span aria-hidden="true">{game.emoji}</span> {game.title}
                      </Link>
                    ) : (
                      <span className="footer-game-soon">
                        <span aria-hidden="true">{game.emoji}</span> {game.title}{' '}
                        <em>soon</em>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="footer-col-title">Explore</h3>
            <ul className="flex flex-col">
              <li>
                <Link href="/daily" className="footer-game-link">
                  Daily Quests
                </Link>
              </li>
              <li>
                <Link href="/guides" className="footer-game-link">
                  Guides
                </Link>
              </li>
              <li>
                <Link href="/profile" className="footer-game-link">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/about" className="footer-game-link">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="footer-col-title">Legal</h3>
            <ul className="flex flex-col">
              <li>
                <Link href="/privacy" className="footer-game-link">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="footer-game-link">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-game-link">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* -my-3 py-3 grows the tap target to 44px+ tall without changing
              the visible line height — this anchor has no background/
              border, so the extra padding renders invisibly (M6). */}
          <Link href="/about" className="-my-3 py-3 flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-brand-purple" strokeWidth={1.5} />
            <span className="font-display text-sm text-ink-3">
              Tiny Arcadium · Quick free mini-games, no downloads
            </span>
          </Link>

          <p className="text-center text-xs text-ink-3">
            © {new Date().getFullYear()} Tiny Arcadium. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
