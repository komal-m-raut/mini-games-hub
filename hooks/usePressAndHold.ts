'use client';

import { useCallback, useRef } from 'react';

interface UsePressAndHoldOptions {
  onStart?: () => void;
  onEnd?: () => void;
  disabled?: boolean;
}

/**
 * Returns pointer event handlers for a press-and-hold interaction.
 * Uses setPointerCapture so inflation continues even if the pointer
 * drifts outside the element (e.g. as the balloon grows to cover it).
 */
export function usePressAndHold({ onStart, onEnd, disabled }: UsePressAndHoldOptions) {
  const isHoldingRef = useRef(false);

  const handleStart = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      if (isHoldingRef.current) return;
      // Capture the pointer so we keep receiving events even when the
      // cursor moves off the element (balloon growing under the finger).
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isHoldingRef.current = true;
      onStart?.();
    },
    [disabled, onStart]
  );

  const handleEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!isHoldingRef.current) return;
      e.preventDefault();
      isHoldingRef.current = false;
      onEnd?.();
    },
    [onEnd]
  );

  return {
    onPointerDown: handleStart,
    onPointerUp: handleEnd,
    // onPointerLeave intentionally omitted — setPointerCapture prevents
    // spurious leave events; release only happens on explicit up/cancel.
    onPointerCancel: handleEnd,
    style: { userSelect: 'none' as const, touchAction: 'none' as const },
  };
}
