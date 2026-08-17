/**
 * Whole-assessment time-limit countdown — the same extraction rationale as
 * useSectionTimer, split into its own file since it's an independent limit
 * (test-level, not per-section) with its own expiry callback.
 */
import { useEffect, useRef, useState } from 'react';
import type { Panel } from './QtiRunnerContext';

export interface UseTestTimerResult {
  testTimeRemaining: number | null;
  resetTestTimer: () => void;
}

export function useTestTimer(
  currentPanel: Panel,
  timeLimitSeconds: number | undefined,
  testStartedAtMs: number | null,
  onTestExpired: () => void,
): UseTestTimerResult {
  const [testTimeRemaining, setTestTimeRemaining] = useState<number | null>(null);
  const testExpiryFiredRef = useRef(false);

  const onTestExpiredRef = useRef(onTestExpired);
  onTestExpiredRef.current = onTestExpired;

  useEffect(() => {
    if (!timeLimitSeconds || testStartedAtMs === null || currentPanel === 'assessment-intro' || currentPanel === 'results') {
      return;
    }
    const limitSeconds = timeLimitSeconds;
    const intervalHolder: { current: ReturnType<typeof setInterval> | null } = { current: null };
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(limitSeconds - (Date.now() - testStartedAtMs) / 1000));
      setTestTimeRemaining(remaining);
      if (remaining > 0 || testExpiryFiredRef.current) return;
      testExpiryFiredRef.current = true;
      onTestExpiredRef.current();
      if (intervalHolder.current) clearInterval(intervalHolder.current);
    };
    tick();
    intervalHolder.current = setInterval(tick, 1000);
    return () => {
      if (intervalHolder.current) clearInterval(intervalHolder.current);
    };
  });

  function resetTestTimer(): void {
    testExpiryFiredRef.current = false;
  }

  return { testTimeRemaining, resetTestTimer };
}