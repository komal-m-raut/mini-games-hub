'use client';

import { useCallback, useEffect, useRef } from 'react';

interface UsePressAndHoldOptions {
  onStart?: () => void;
  onEnd?: () => void;
  disabled?: boolean;
}

type HoldSource = 'pointer' | 'keyboard';

/**
 * Returns pointer + keyboard event handlers for a press-and-hold interaction.
 * Uses setPointerCapture so inflation continues even if the pointer
 * drifts outside the element (e.g. as the balloon grows to cover it).
 *
 * Space/Enter drive the same start/end pair for keyboard and switch users
 * (C4) — a `<button>` only fires a single `click` on activation, never a
 * continuous press, so the hold itself has to come from these handlers
 * rather than from the browser's default button behavior.
 */
export function usePressAndHold({ onStart, onEnd, disabled }: UsePressAndHoldOptions) {
  const isHoldingRef = useRef(false);
  // Which input started the current hold, and (for pointer) which pointer —
  // a second finger, or a stray event from the *other* input type, must not
  // be able to end (or restart) it.
  const holdSourceRef = useRef<HoldSource | null>(null);
  const activePointerId = useRef<number | null>(null);

  const handleStart = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      if (isHoldingRef.current) return;
      // Capture the pointer so we keep receiving events even when the
      // cursor moves off the element (balloon growing under the finger).
      // Guarded: throws NotFoundError for inactive/synthetic pointers.
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        // Hold still works without capture; release just requires
        // the pointer to stay over the element.
      }
      isHoldingRef.current = true;
      holdSourceRef.current = 'pointer';
      activePointerId.current = e.pointerId;
      onStart?.();
    },
    [disabled, onStart]
  );

  const handleEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!isHoldingRef.current || holdSourceRef.current !== 'pointer') return;
      // Ignore a second pointer (e.g. another finger) lifting or cancelling —
      // only the pointer that started the hold may end it.
      if (e.pointerId !== activePointerId.current) return;
      e.preventDefault();
      isHoldingRef.current = false;
      holdSourceRef.current = null;
      activePointerId.current = null;
      onEnd?.();
    },
    [onEnd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      // Guard OS key auto-repeat — a held key resends keydown at the
      // system repeat rate, which must not restart the hold on every
      // repeat (mirrors the activePointerId guard above, for keyboard).
      if (e.repeat) return;
      if (isHoldingRef.current) return;
      e.preventDefault();
      isHoldingRef.current = true;
      holdSourceRef.current = 'keyboard';
      onStart?.();
    },
    [disabled, onStart]
  );

  const handleKeyUp = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (!isHoldingRef.current || holdSourceRef.current !== 'keyboard') return;
      e.preventDefault();
      isHoldingRef.current = false;
      holdSourceRef.current = null;
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
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    style: { userSelect: 'none' as const, touchAction: 'none' as const },
  };
}

interface UseHoldRepeatOptions {
  /** Called once per step — a single tap/click, or once per repeat tick. */
  onStep: () => void;
  disabled?: boolean;
  /** Delay before auto-repeat kicks in. Default 400ms. */
  delayMs?: number;
  /** Interval between repeated steps once auto-repeat has started. Default 90ms. */
  intervalMs?: number;
}

/**
 * Auto-repeat handlers for a discrete step button (the fine-adjust −/+
 * controls, U8). A tap/click is exactly one step; holding the pointer down
 * past `delayMs` starts repeating at `intervalMs` for coarse movement.
 *
 * Built on `onClick` rather than `onPointerDown`/`onPointerUp` so a single
 * step works identically for mouse clicks, touch taps, and keyboard
 * activation (Enter/Space on a real `<button>`) with no extra key handling —
 * `onClick` already fires exactly once per activation from any of those.
 * The pointer-hold repeat sets a flag so the `click` that follows pointerup
 * doesn't double-apply the last step.
 */
export function useHoldRepeat({
  onStep,
  disabled,
  delayMs = 400,
  intervalMs = 90,
}: UseHoldRepeatOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repeatedRef = useRef(false);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    if (disabled) return;
    clear();
    repeatedRef.current = false;
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        repeatedRef.current = true;
        onStep();
      }, intervalMs);
    }, delayMs);
  }, [disabled, onStep, clear, delayMs, intervalMs]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    // Auto-repeat already applied a step for this press — don't double it.
    if (repeatedRef.current) {
      repeatedRef.current = false;
      return;
    }
    onStep();
  }, [disabled, onStep]);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onClick: handleClick,
  };
}
