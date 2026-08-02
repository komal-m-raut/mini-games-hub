import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { AdBanner } from '@/components/ads/AdBanner';

export function Footer() {
  return (
    <footer className="site-footer relative z-10 mt-auto border-t border-white/5">
      {/* Footer Ad */}
      <div className="py-4 flex justify-center">
        <AdBanner placement="footer-banner" format="leaderboard" />
      </div>

      <div className="page-container py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-brand-purple" strokeWidth={1.5} />
            <span className="font-display text-sm text-white/60">
              Tiny Arcadium · Stress relief, one game at a time
            </span>
          </div>

          {/* -my-3 py-3 grows the tap target to 44px+ tall without changing
              the visible line height — these anchors have no background/
              border, so the extra padding renders invisibly (M6). */}
          <div className="flex items-center gap-6 text-sm text-white/55">
            <Link href="/privacy" className="-my-3 py-3 hover:text-white/80 transition-colors">
              Privacy Policy
            </Link>
            <a href="/privacy#contact" className="-my-3 py-3 hover:text-white/80 transition-colors">
              Contact
            </a>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/55">
          © {new Date().getFullYear()} Tiny Arcadium. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
