/**
 * Per-section time-limit countdown, extracted out of useQtiRunnerOrchestration
 * because it's a genuinely separable concern: a narrow interface (current
 * panel/section, the section list, an onExpired callback) in, a countdown +
 * "which sections have expired" predicate out. Unlike item-loading/navigation
 * (which stay in one hook — see that file's module doc), this subsystem
 * doesn't recursively call back into the rest of the orchestrator; it only
 * ever calls the one callback the caller hands it.
 */
import { useEffect, useRef, useState } from 'react';
import type { Panel } from './QtiRunnerContext';
import type { FlattenedSection } from '@/utils/test-xml-parser';

export interface UseSectionTimerResult {
  sectionTimeRemaining: number | null;
  sectionTimeOverrun: boolean;
  isSectionExpired: (sectionId: string) => boolean;
  resetSectionTimer: () => void;
}

export function useSectionTimer(
  currentPanel: Panel,
  currentSectionId: string | null,
  sections: FlattenedSection[],
  onSectionExpired: (sectionId: string) => void,
): UseSectionTimerResult {
  const activeTimedSectionIdRef = useRef<string | null>(null);
  const sectionElapsedMsRef = useRef<Map<string, number>>(new Map());
  const sectionExpiryFiredRef = useRef(false);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState<number | null>(null);
  const [sectionTimeOverrun, setSectionTimeOverrun] = useState(false);
  const [expiredSectionIds, setExpiredSectionIds] = useState<Set<string>>(new Set());

  const onSectionExpiredRef = useRef(onSectionExpired);
  onSectionExpiredRef.current = onSectionExpired;

  // Deliberately no dependency array — see the module doc on why this
  // pattern (used throughout the orchestrator) runs every commit.
  useEffect(() => {
    if (currentPanel !== 'item' || !currentSectionId) return;

    const section = sections.find((s) => s.identifier === currentSectionId);
    const alreadyExpired = expiredSectionIds.has(currentSectionId);

    if (currentSectionId !== activeTimedSectionIdRef.current) {
      activeTimedSectionIdRef.current = currentSectionId;
      sectionExpiryFiredRef.current = alreadyExpired;
      setSectionTimeOverrun(false);
      const elapsedSoFarMs = sectionElapsedMsRef.current.get(currentSectionId) ?? 0;
      setSectionTimeRemaining(
        section?.timeLimitSeconds ? (alreadyExpired ? 0 : Math.max(0, Math.ceil(section.timeLimitSeconds - elapsedSoFarMs / 1000))) : null,
      );
    }

    if (!section?.timeLimitSeconds || alreadyExpired) return;

    const limitSeconds = section.timeLimitSeconds;
    const allowLate = section.allowLateSubmission ?? false;
    const resumedAt = Date.now(); // start of THIS viewing session, not the section's first-ever entry
    const baseElapsedMs = sectionElapsedMsRef.current.get(currentSectionId) ?? 0;
    const intervalHolder: { current: ReturnType<typeof setInterval> | null } = { current: null };

    const tick = () => {
      const elapsedMs = baseElapsedMs + (Date.now() - resumedAt);
      const remaining = Math.max(0, Math.ceil(limitSeconds - elapsedMs / 1000));
      setSectionTimeRemaining(remaining);
      if (remaining > 0) return;
      if (allowLate) {
        setSectionTimeOverrun(true);
      } else if (!sectionExpiryFiredRef.current) {
        sectionExpiryFiredRef.current = true;
        setExpiredSectionIds((prev) => new Set(prev).add(currentSectionId));
        onSectionExpiredRef.current(currentSectionId);
      }
      if (intervalHolder.current) clearInterval(intervalHolder.current);
    };
    tick();
    intervalHolder.current = setInterval(tick, 1000);
    return () => {
      if (intervalHolder.current) clearInterval(intervalHolder.current);
      // Pause: bank whatever elapsed during this viewing session so a later
      // return to this section resumes instead of restarting.
      sectionElapsedMsRef.current.set(currentSectionId, baseElapsedMs + (Date.now() - resumedAt));
    };
  });

  function isSectionExpired(sectionId: string): boolean {
    return expiredSectionIds.has(sectionId);
  }

  function resetSectionTimer(): void {
    activeTimedSectionIdRef.current = null;
    sectionElapsedMsRef.current.clear();
    setExpiredSectionIds(new Set());
  }

  return { sectionTimeRemaining, sectionTimeOverrun, isSectionExpired, resetSectionTimer };
}