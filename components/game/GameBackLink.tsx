'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function GameBackLink() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-ink-3 hover:text-ink-2 transition-colors text-sm font-ui cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
      Back
    </button>
  );
}
