'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useSound } from '@/hooks/useSound';

/** Mute/unmute control. Preference persists in localStorage across games. */
export function SoundToggle({ className = '' }: { className?: string }) {
  const { muted, toggle, play } = useSound();

  return (
    <button
      onClick={() => {
        // Click first so unmuting is audible; muting stays silent
        if (muted) play('click');
        toggle();
      }}
      className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg text-white/55 hover:text-white/90 hover:bg-white/5 transition-all cursor-pointer ${className}`}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      aria-pressed={muted}
      title={muted ? 'Unmute' : 'Mute'}
    >
      {muted ? (
        <VolumeX className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Volume2 className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  );
}
