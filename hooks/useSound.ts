'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  LoopName,
  SoundName,
  initAudioUnlock,
  isMuted,
  loadMutePreference,
  playSound,
  setWaterFill,
  startLoop,
  stopAllLoops,
  stopLoop,
  subscribeMute,
  toggleMuted,
} from '@/lib/sounds';

const serverMuted = () => false;

/**
 * Sound controls for a game screen. The engine is a module-level singleton,
 * so every caller shares one AudioContext and one mute preference.
 */
export function useSound() {
  const muted = useSyncExternalStore(subscribeMute, isMuted, serverMuted);

  // Pick up the stored preference once on mount (localStorage is client-only)
  useEffect(() => {
    loadMutePreference();
    // M18: register the gesture-based AudioContext unlock backstop once per
    // page, independent of whether playSound()/startLoop() has run yet.
    initAudioUnlock();
  }, []);

  // Never leave a loop running when the screen unmounts
  useEffect(() => () => stopAllLoops(), []);

  const play = useCallback((name: SoundName) => playSound(name), []);
  const loop = useCallback((name: LoopName) => startLoop(name), []);
  const stop = useCallback((name: LoopName) => stopLoop(name), []);
  const setFill = useCallback((percent: number) => setWaterFill(percent), []);

  return { muted, play, loop, stop, setFill, toggle: toggleMuted };
}
