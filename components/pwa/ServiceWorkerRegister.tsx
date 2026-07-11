'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker. Production-only: in dev the SW
 * would cache un-hashed HMR chunks and serve stale code.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // A SW registered by a previous production run on this origin (e.g.
      // localhost) would keep serving stale cached chunks to the dev server.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.filter((k) => k.startsWith('mgh-')).forEach((k) => caches.delete(k));
        });
      }
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .catch((err) => console.error('[PWA] Service worker registration failed:', err));
  }, []);

  return null;
}
