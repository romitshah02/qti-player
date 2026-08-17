/**
 * Item-loading pipeline — one-way sink, never calls navigation/
 * attempt-completion/review. Owns the deferred-load scheduler
 * (pendingLoadRef + effect) since switchToItemAndLoad/switchToReviewAndLoad
 * just arm it.
 */
import { useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import type { Panel, RunnerState } from './QtiRunnerContext';
import * as Selectors from './orchestration-selectors';
import type { ContentLoader } from '@/services/content-loader';
import type { SessionControlFactory } from '@/services/session-control-factory';
import * as LongsightPlayerAdapter from '@/services/longsight-player-adapter';
import type { Configuration } from '@/services/longsight-player-adapter';
import type { TestControllerUtilities } from '@/services/test-controller';
import * as TelemetryService from '@/services/telemetry-service';
import { computeItemSubmissionMode } from '@/services/navigation-service';
import { detectInteractionType, findUnsupportedInteraction, hasFeedbackContent, isAdaptiveItem } from '@/utils/interaction-type-detector';
import type { FlattenedSection } from '@/utils/test-xml-parser';
import type { TestItem } from '@/types';
import type { QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react';

export interface UseItemLoadingOptions {
  state: RunnerState;
  actions: {
    setPanel: (panel: Panel) => void;
    setPendingItemIndex: (index: number | null) => void;
    setReviewIndex: (index: number) => void;
    setItemMeta: (meta: { interactionType: string | null; isAdaptive: boolean; hasFeedback: boolean; unsupportedTag: string | null }) => void;
  };
  TC: TestControllerUtilities;
  itemPlayerRef: RefObject<QtiAssessmentItemPlayerHandle | null>;
  contentLoaderRef: RefObject<ContentLoader | null>;
  sessionControlRef: RefObject<SessionControlFactory | null>;
  itemSubmissionModeRef: MutableRefObject<string | null>;
  testSubmissionModeRef: MutableRefObject<string>;
  showSectionIntroRef: MutableRefObject<boolean>;
  shownSectionIntrosRef: MutableRefObject<Set<string>>;
  isSectionExpired: (sectionId: string) => boolean;
  loadStimuliForItem: (item: TestItem, itemXml: string) => Promise<void>;
  destroyDockedStimuli: () => void;
  getConfiguration: (guid: string) => Configuration;
}

export function useItemLoading(options: UseItemLoadingOptions) {
  const {
    state,
    actions,
    TC,
    itemPlayerRef,
    contentLoaderRef,
    sessionControlRef,
    itemSubmissionModeRef,
    testSubmissionModeRef,
    showSectionIntroRef,
    shownSectionIntrosRef,
    isSectionExpired,
    loadStimuliForItem,
    destroyDockedStimuli,
    getConfiguration,
  } = options;

  // Set right before a panel dispatch whose target element won't exist in
  // the DOM until after the next commit — see the module doc for why.
  const pendingLoadRef = useRef<{ panel: Panel; index: number } | null>(null);

  // Deliberately no dependency array — runs after every commit, but the
  // pending-ref guard makes it a no-op except right after
  // switchToItemAndLoad/switchToReviewAndLoad scheduled one.
  useEffect(() => {
    const pending = pendingLoadRef.current;
    if (!pending || pending.panel !== state.currentPanel) return;
    pendingLoadRef.current = null;
    if (pending.panel === 'item') void loadItemAtIndex(pending.index);
    else void loadReviewItemAtIndex(pending.index);
  });

  function switchToItemAndLoad(index: number) {
    pendingLoadRef.current = { panel: 'item', index };
    actions.setPanel('item');
  }

  function switchToReviewAndLoad(index: number) {
    pendingLoadRef.current = { panel: 'review', index };
    actions.setReviewIndex(index);
    actions.setPanel('review');
  }

  function getSectionForIndex(index: number): FlattenedSection | null {
    return Selectors.getSectionForIndex(TC, state, index);
  }

  function isItemInExpiredSection(index: number): boolean {
    const section = getSectionForIndex(index);
    return !!section && isSectionExpired(section.identifier as string);
  }

  function shouldShowSectionIntroFor(index: number): boolean {
    if (!showSectionIntroRef.current) return false;
    const section = getSectionForIndex(index);
    if (!section || shownSectionIntrosRef.current.has(section.identifier as string)) return false;
    return Selectors.isFirstItemOfSection(TC, state, index);
  }

  async function resolveItemXml(item: TestItem): Promise<string> {
    try {
      return await contentLoaderRef.current!.resolveItemXml(item);
    } catch (error) {
      TelemetryService.logError(error);
      throw error;
    }
  }

  async function mountItem(item: TestItem, xml: string, configuration: Configuration) {
    destroyDockedStimuli();
    await itemPlayerRef.current!.loadXml(xml, LongsightPlayerAdapter.toLoadOptions(configuration));
    await loadStimuliForItem(item, xml);
  }

  async function loadItemAtIndex(index: number) {
    if (index === null || index < 0 || index > state.maxItems - 1) return;

    if (shouldShowSectionIntroFor(index)) {
      actions.setPendingItemIndex(index);
      actions.setPanel('section-intro');
      return;
    }

    const item = TC.getItemAtIndex(index);
    itemSubmissionModeRef.current = computeItemSubmissionMode(item, testSubmissionModeRef.current!);

    if (item.sessionControl) {
      if ('validateResponses' in item.sessionControl) sessionControlRef.current!.setValidateResponses(item.sessionControl.validateResponses!);
      if ('showFeedback' in item.sessionControl) sessionControlRef.current!.setShowFeedback(item.sessionControl.showFeedback!);
    }

    TelemetryService.logPageViewed(item.identifier, index);

    const xml = await resolveItemXml(item);
    const interactionType = item.interactionType || detectInteractionType(xml);
    const unsupportedTag = findUnsupportedInteraction(xml);
    if (unsupportedTag) {
      actions.setItemMeta({ interactionType, isAdaptive: false, hasFeedback: false, unsupportedTag });
      TelemetryService.logError(`Unsupported interaction: ${unsupportedTag}`);
      return;
    }

    actions.setItemMeta({
      interactionType,
      isAdaptive: isAdaptiveItem(xml),
      hasFeedback: hasFeedbackContent(xml),
      unsupportedTag: null,
    });

    const configuration = getConfiguration(item.guid);
    if (isItemInExpiredSection(index)) configuration.status = 'review';
    await mountItem(item, xml, configuration);
  }

  async function loadReviewItemAtIndex(index: number) {
    if (index < 0 || index > state.maxItems - 1) return;
    const item = TC.getItemAtIndex(index);
    const xml = await resolveItemXml(item);
    actions.setItemMeta({
      interactionType: item.interactionType || detectInteractionType(xml),
      isAdaptive: state.currentItemIsAdaptive,
      hasFeedback: state.currentItemHasFeedback,
      unsupportedTag: null,
    });

    const configuration = getConfiguration(item.guid);
    configuration.status = 'review'; // disables all interactions
    await mountItem(item, xml, configuration);
  }

  return {
    loadItemAtIndex,
    loadReviewItemAtIndex,
    switchToItemAndLoad,
    switchToReviewAndLoad,
    getConfiguration,
    isItemInExpiredSection,
    getSectionForIndex,
    shouldShowSectionIntroFor,
  };
}