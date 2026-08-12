import { useEffect, useRef } from 'react';
import { mountStimulusPlayer } from '@/services/stimulus-player-mount';
import type { StimulusPlayerHandle } from '@/services/stimulus-player-mount';

export interface StimulusMountProps {
  onReady: (player: StimulusPlayerHandle) => void;
  onCatalogEvent: (event: Record<string, unknown>) => void;
}

/** Mounts one "Vue island" stimulus-player instance into a container this
 * component owns — see services/stimulus-player-mount.ts. One of these per
 * undocked stimulus (docked ones mount directly into the item's own DOM
 * instead, see useQtiRunnerOrchestration's mountDockedStimulus). */
export function StimulusMount({ onReady, onCatalogEvent }: StimulusMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const instance = mountStimulusPlayer(container, onReady, onCatalogEvent);
    return () => instance.$destroy();
    // Mount-once per instance; the caller keys this component on the
    // stimulus identifier so a different stimulus gets a fresh mount.
  }, []);

  return <div ref={containerRef} />;
}
