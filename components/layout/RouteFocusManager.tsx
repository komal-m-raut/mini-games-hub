'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Next's App Router doesn't move focus on client-side navigation (M4).
 * Without this, a keyboard/screen-reader user stays stranded at whatever
 * was last focused (e.g. a nav link) after navigating hub → game.
 *
 * Moves focus to <main id="main-content"> on every pathname change, but
 * skips the very first render so it doesn't steal focus from the page on
 * initial load.
 */
export function RouteFocusManager() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const main = document.getElementById('main-content');
    main?.focus();
  }, [pathname]);

  return null;
}
