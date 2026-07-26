import type { Metadata } from 'next';
import { MemoryPathGame } from '@/games/memory-path/MemoryPathGame';
import { AdBanner } from '@/components/ads/AdBanner';

const description =
  'A neon path lights up across the grid. Memorize it, then trace it back from memory.';

export const metadata: Metadata = {
  title: 'Memory Path',
  description,
  alternates: { canonical: '/games/memory-path' },
  openGraph: { title: 'Memory Path', description, url: '/games/memory-path' },
};

export default function MemoryPathPage() {
  return (
    <div className="page-container py-8 sm:py-12 flex flex-col gap-12">
      <MemoryPathGame />

      {/* Ad sits outside the game view — never during a round */}
      <div className="flex justify-center">
        <AdBanner placement="between-games-banner" format="leaderboard" />
      </div>
    </div>
  );
}
