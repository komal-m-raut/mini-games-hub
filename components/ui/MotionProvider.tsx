'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Wraps the app so every Framer Motion animation respects the user's
 * `prefers-reduced-motion` setting. `MotionConfig` needs a client
 * component, so this thin wrapper exists purely to sit inside the
 * (server) root layout.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
