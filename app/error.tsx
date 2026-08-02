'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { NeonButton } from '@/components/ui/NeonButton';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="page-container py-12 sm:py-16 flex-1 flex items-center justify-center">
      <GlassCard className="max-w-md w-full text-center py-10">
        <h1 className="font-display font-bold text-xl sm:text-2xl text-white mb-3">
          Something went wrong
        </h1>
        <p className="text-white/60 mb-8 leading-relaxed">
          An unexpected error interrupted the game. Give it another shot, or head back to the
          hub.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <NeonButton variant="primary" size="lg" onClick={() => reset()}>
            Try again
          </NeonButton>
          <Link
            href="/"
            className="text-sm text-white/55 hover:text-white/80 transition-colors -my-3 py-3"
          >
            Back to Games
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
