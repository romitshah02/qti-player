/**
 * Stimulus docking — mounting the qti3-stimulus-player "Vue island" into an
 * authored docking div inside a loaded item, and surfacing undocked stimuli
 * for <StimulusMount>. Extracted out of useQtiRunnerOrchestration: the module
 * doc there calls this out by name as a distinct concern, and its interface
 * into the rest of the orchestrator is narrow (item-player ref, content
 * loader, a getConfiguration callback) — nothing here calls back into
 * navigation or attempt-completion.
 */
import { useRef } from 'react';
import type { RefObject } from 'react';
import type { ContentLoader, ResolvedStimulus } from '@/services/content-loader';
import type { Configuration } from '@/services/longsight-player-adapter';
import type { StimulusPlayerInstance } from '@/services/stimulus-player-mount';
import type { StimulusDescriptor, TestItem } from '@/types';
import type { QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react';
import { findDockingElement, hasDockingDiv } from '@/utils/stimulus-docking';

export interface UseStimulusDockingOptions {
  itemPlayerRef: RefObject<QtiAssessmentItemPlayerHandle | null>;
  contentLoaderRef: RefObject<ContentLoader | null>;
  stimulusList: StimulusDescriptor[];
  currentStimuli: ResolvedStimulus[];
  setStimuli: (stimuli: ResolvedStimulus[]) => void;
  getConfiguration: (guid: string) => Configuration;
}

export function useStimulusDocking({
  itemPlayerRef,
  contentLoaderRef,
  stimulusList,
  currentStimuli,
  setStimuli,
  getConfiguration,
}: UseStimulusDockingOptions) {
  const stimulusPlayersRef = useRef<Record<string, { loadStimulusFromXml: (xml: string, config: Configuration) => void }>>({});
  const dockedStimulusInstancesRef = useRef<StimulusPlayerInstance[]>([]);
  const dockedStimulusFactoryRef = useRef<(dockingElement: Element, stim: ResolvedStimulus) => StimulusPlayerInstance | null>(() => null);

  /**
   * Mounts a stimulus player instance ("Vue island") into an authored
   * docking div inside the rendered item — see the migration plan's
   * qti3-stimulus-player decision. The actual Vue.extend(...) construction
   * lives in StimulusDocking's mount helper (Phase 4's real-engine wiring);
   * this just finds the target element and delegates.
   */
  function mountDockedStimulus(stim: ResolvedStimulus) {
    const root = itemPlayerRef.current?.element ?? null;
    const dockingElement = findDockingElement(root, stim.identifier);
    if (!dockingElement) {
      console.warn(`[useStimulusDocking] Docking div for stimulus "${stim.identifier}" not found in rendered item`);
      return;
    }
    const instance = dockedStimulusFactoryRef.current(dockingElement, stim);
    if (instance) dockedStimulusInstancesRef.current.push(instance);
  }

  // loadXml (in the caller) already resolved, so the item's DOM (and any
  // docking divs in it) is guaranteed ready by the time this runs.
  async function loadStimuliForItem(item: TestItem, itemXml: string) {
    const stimuli = await contentLoaderRef.current!.getStimulusXmlList(item, stimulusList);
    const docked = stimuli.filter((stim) => hasDockingDiv(itemXml, stim.identifier));
    const undocked = stimuli.filter((stim) => !hasDockingDiv(itemXml, stim.identifier));
    setStimuli(undocked);

    docked.forEach((stim) => mountDockedStimulus(stim));
  }

  function loadStimulusIfReady(identifier: string) {
    const stim = currentStimuli.find((s) => s.identifier === identifier);
    const player = stimulusPlayersRef.current[identifier];
    if (!stim || !player) return;
    player.loadStimulusFromXml(stim.xml, getConfiguration(identifier));
  }

  function handleStimulusPlayerReady(identifier: string, player: { loadStimulusFromXml: (xml: string, config: Configuration) => void }) {
    stimulusPlayersRef.current[identifier] = player;
    loadStimulusIfReady(identifier);
  }

  /**
   * Overridable seam for the Vue-island construction (new Vue.extend(...),
   * $mount(), event wiring) — kept out of this file so useStimulusDocking has
   * no direct Vue dependency; the component hosting the item player assigns
   * the real implementation (services/stimulus-player-mount.ts). A ref, not a
   * plain closure variable — this hook's body re-runs every render, so a
   * plain `let` here would reset to the no-op default each time; the caller
   * re-assigns this ref every render instead (cheap, and always up to date).
   */
  function setDockedStimulusFactory(factory: (dockingElement: Element, stim: ResolvedStimulus) => StimulusPlayerInstance | null) {
    dockedStimulusFactoryRef.current = factory;
  }

  function destroyDockedStimuli() {
    dockedStimulusInstancesRef.current.forEach((instance) => instance.$destroy());
    dockedStimulusInstancesRef.current = [];
  }

  return {
    loadStimuliForItem,
    handleStimulusPlayerReady,
    setDockedStimulusFactory,
    destroyDockedStimuli,
  };
}