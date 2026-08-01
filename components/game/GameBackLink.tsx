'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function GameBackLink() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm font-mono cursor-pointer"
    >
      <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
      Back
    </button>
  );
}
