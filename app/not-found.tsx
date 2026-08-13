import type { Metadata } from 'next';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';

// A 404 should never be indexed, and it shouldn't inherit the hub's title.
export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="page-container py-12 sm:py-16 flex-1 flex items-center justify-center">
      <GlassCard className="max-w-md w-full text-center py-10">
        <p className="font-display text-6xl sm:text-7xl mb-2">404</p>
        <h1 className="font-display text-xl sm:text-2xl mb-3">
          Lost in the arcade
        </h1>
        <p className="text-ink-3 mb-8 leading-relaxed">
          We couldn’t find the page you were looking for. It may have moved, or never existed.
        </p>
        {/* A real link rather than NeonButton: this is navigation, so it should
            survive a failed hydration and support middle-click/open-in-new-tab.
            Borrows the button's classes so it stays visually identical. */}
        <Link
          href="/"
          className="neon-btn neon-btn-primary px-8 py-4 text-lg inline-flex items-center justify-center"
        >
          Back to Games
        </Link>
      </GlassCard>
    </div>
  );
}
