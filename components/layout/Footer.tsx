import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';
import { AdBanner } from '@/components/ads/AdBanner';

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/5">
      {/* Footer Ad */}
      <div className="py-4 flex justify-center">
        <AdBanner placement="footer-banner" format="leaderboard" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-brand-purple" strokeWidth={1.5} />
            <span className="font-display text-sm text-white/60">
              Mini Games Hub · Stress relief, one game at a time
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="#" className="hover:text-white/70 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white/70 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white/70 transition-colors">Contact</Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-white/20">
          © {new Date().getFullYear()} Mini Games Hub. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
