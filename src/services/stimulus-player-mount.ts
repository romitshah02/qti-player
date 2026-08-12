/**
 * The one file in this app that touches Vue directly — qti3-stimulus-player
 * (the shared-passage/stimulus renderer) is itself a Vue 2 component with no
 * framework-neutral equivalent (see the migration plan's "qti3-stimulus-player
 * problem"). Mounting it as an isolated "Vue island" — a Vue instance
 * constructed and $mount()-ed imperatively into a container this app owns —
 * lets the rest of the app stay Vue-free.
 */
import Vue from 'vue';
import Qti3StimulusPlayer from 'qti3-stimulus-player';
import type { Configuration } from './longsight-player-adapter';

const CONTAINER_CLASS = 'qti3-player-container-fluid';
// padding-0: QuestionNavBar already pads above the item; the stimulus
// player's own padding on top of that made a visible double gap.
const CONTAINER_PADDING_CLASS = 'qti3-player-container-padding-0';
const COLOR_CLASS = 'qti3-player-color-default';

export interface StimulusPlayerInstance {
  $destroy(): void;
  $el: Element;
}

export interface StimulusPlayerHandle {
  loadStimulusFromXml(xml: string, config: Configuration): void;
}

function createInstance(onReady: (player: StimulusPlayerHandle) => void, onCatalogEvent: (event: Record<string, unknown>) => void): StimulusPlayerInstance {
  const StimulusPlayerCtor = Vue.extend(Qti3StimulusPlayer);
  const instance = new StimulusPlayerCtor({
    propsData: { containerClass: CONTAINER_CLASS, containerPaddingClass: CONTAINER_PADDING_CLASS, colorClass: COLOR_CLASS },
  }) as unknown as StimulusPlayerInstance & { $on: (event: string, handler: (...args: never[]) => void) => void; $mount: () => void };
  instance.$on('notifyQti3StimulusPlayerReady', onReady);
  instance.$on('notifyQti3StimulusCatalogEvent', onCatalogEvent);
  instance.$mount();
  return instance;
}

/** Mounts into a container this app renders (the undocked stimulus panel). */
export function mountStimulusPlayer(
  container: Element,
  onReady: (player: StimulusPlayerHandle) => void,
  onCatalogEvent: (event: Record<string, unknown>) => void,
): StimulusPlayerInstance {
  const instance = createInstance(onReady, onCatalogEvent);
  container.appendChild(instance.$el);
  return instance;
}

/** Mounts in place of an authored docking div found inside the rendered item. */
export function mountDockedStimulusPlayer(
  dockingElement: Element,
  onReady: (player: StimulusPlayerHandle) => void,
  onCatalogEvent: (event: Record<string, unknown>) => void,
): StimulusPlayerInstance {
  const instance = createInstance(onReady, onCatalogEvent);
  dockingElement.parentNode!.replaceChild(instance.$el, dockingElement);
  return instance;
}
