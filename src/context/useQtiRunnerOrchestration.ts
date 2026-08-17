/**
 * The orchestrator: item navigation, review, section intros, submit/restart,
 * and stimulus docking. This is the React-hooks replacement for
 * TestRunner.vue's data()/methods — kept as one hook (not the three
 * originally sketched in the migration plan) because these concerns turned
 * out to be tightly mutually-recursive once actually written (loadItemAtIndex
 * calls loadStimuliForItem; evaluateResults calls next() which calls
 * navigateNextItem which calls loadItemAtIndex) — splitting them into
 * separate hook files would only add indirection for passing the same shared
 * refs back and forth, not real separation.
 *
 * Rendered state lives in QtiRunnerContext (via useQtiRunner).
 * Everything here is either a ref (long-lived service instances, the item
 * player element, timestamps, sets/maps that don't drive rendering) or a
 * plain function closing over the current render's state — there's exactly
 * one consumer (the root TestRunner component), so useCallback's identity
 * stability buys nothing and would just add ~30 interdependent dependency
 * arrays to get right.
 */
import { useEffect, useRef, useState } from 'react';
import { useQtiRunner } from './useQtiRunner';
import type { Panel, Toast } from './QtiRunnerContext';
import { TestControllerUtilities } from '@/services/test-controller';
import { ContentLoader } from '@/services/content-loader';
import type { ResolvedStimulus } from '@/services/content-loader';
import { SessionControlFactory } from '@/services/session-control-factory';
import * as LongsightPlayerAdapter from '@/services/longsight-player-adapter';
import type { Configuration } from '@/services/longsight-player-adapter';
import * as TelemetryService from '@/services/telemetry-service';
import { detectInteractionType, findUnsupportedInteraction, hasFeedbackContent, isAdaptiveItem } from '@/utils/interaction-type-detector';
import { findDockingElement, hasDockingDiv } from '@/utils/stimulus-docking';
import {
  computeItemSubmissionMode,
  computeSummaryBreakdown,
  computeTotalScore,
  resolveNavigationOutcome,
} from '@/services/navigation-service';
import type { NavigationTarget, SummaryBreakdown } from '@/services/navigation-service';
import type { FlattenedSection } from '@/utils/test-xml-parser';
import type { ItemSummaryEntry, LegacyAttemptState, NavEvent, PlayerEvent, RunnerConfig, TestItem } from '@/types';
import type { QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react';
import type { QtiCatalogRequestEventDetail, QtiDiagnosticsEventDetail, QtiEndAttemptEventDetail, QtiValidationEventDetail } from '@/types/qti-player-element';

/** A mounted "Vue island" stimulus-player instance — kept opaque here, its
 * exact shape only matters to StimulusDocking's own Vue.extend() call
 * (Phase 4). */
interface StimulusPlayerInstance {
  $destroy(): void;
  $el: Element;
}

export interface UseQtiRunnerOrchestrationOptions {
  onPlayerEvent?: (event: PlayerEvent) => void;
  onNavEvent?: (event: NavEvent) => void;
}

export function useQtiRunnerOrchestration(config: RunnerConfig, options: UseQtiRunnerOrchestrationOptions = {}) {
  const { state, ...actions } = useQtiRunner();
  const { onPlayerEvent, onNavEvent } = options;

  const itemPlayerRef = useRef<QtiAssessmentItemPlayerHandle>(null);
  const TC = useRef(new TestControllerUtilities()).current;
  const contentLoaderRef = useRef<ContentLoader | null>(null);
  const sessionControlRef = useRef<SessionControlFactory | null>(null);
  const testSubmissionModeRef = useRef('simultaneous');
  const itemSubmissionModeRef = useRef<string | null>(null);
  const pendingAttemptTargetRef = useRef<NavigationTarget>(null);
  const testStartedAtRef = useRef<number | null>(null);
  const testDurationMsRef = useRef<number | null>(null);
  const itemStartedAtRef = useRef<number | null>(null);
  const shownSectionIntrosRef = useRef<Set<string>>(new Set());
  const showSectionIntroRef = useRef(true);
  const showAssessmentIntroRef = useRef(true);
  const testAttemptNumberRef = useRef(1);
  const stimulusListRef = useRef(config.stimulusList || []);
  const stimulusPlayersRef = useRef<Record<string, { loadStimulusFromXml: (xml: string, config: Configuration) => void }>>({});
  const dockedStimulusInstancesRef = useRef<StimulusPlayerInstance[]>([]);
  const dockedStimulusFactoryRef = useRef<(dockingElement: Element, stim: ResolvedStimulus) => StimulusPlayerInstance | null>(() => null);
  // Set right before a panel dispatch whose target element won't exist in
  // the DOM until after the next commit — see the module doc for why.
  const pendingLoadRef = useRef<{ panel: Panel; index: number } | null>(null);
  const activeTimedSectionIdRef = useRef<string | null>(null);
  const sectionElapsedMsRef = useRef<Map<string, number>>(new Map());
  const sectionExpiryFiredRef = useRef(false);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState<number | null>(null);
  const [sectionTimeOverrun, setSectionTimeOverrun] = useState(false);
  const handleSectionTimeExpiredRef = useRef<() => void>(() => {});
  const [testTimeRemaining, setTestTimeRemaining] = useState<number | null>(null);
  const [expiredSectionIds, setExpiredSectionIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const currentSectionId = getCurrentSectionId();

    if (state.currentPanel !== 'item' || !currentSectionId) return;

    const section = state.sections.find((s) => s.identifier === currentSectionId);

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
        handleSectionTimeExpiredRef.current();
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

  useEffect(() => {
    const started = testStartedAtRef.current;
    if (!config.timeLimitSeconds || started === null || state.currentPanel === 'assessment-intro' || state.currentPanel === 'results') {
      return;
    }
    const limitSeconds = config.timeLimitSeconds;
    const tick = () => setTestTimeRemaining(Math.max(0, Math.ceil(limitSeconds - (Date.now() - started) / 1000)));
    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
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

  // ── Initialization ──────────────────────────────────────────────────────

  function initialize() {
    if (!config || !Array.isArray(config.items) || config.items.length === 0) {
      console.warn('[useQtiRunnerOrchestration] config.items is required and must be non-empty');
      return;
    }

    TelemetryService.initializeTelemetry(config.context || {});

    TC.setItems(config.items);
    TC.setItemStates(new Map());
    shownSectionIntrosRef.current = new Set();
    showSectionIntroRef.current = config.showSectionIntro !== false;
    showAssessmentIntroRef.current = config.showAssessmentIntro !== false;

    const sessionControl = new SessionControlFactory();
    sessionControl.setSessionControl(config.sessionControl);
    sessionControlRef.current = sessionControl;

    testSubmissionModeRef.current = config.submissionMode || 'simultaneous';

    contentLoaderRef.current = new ContentLoader(config.previewUrl!);
    stimulusListRef.current = config.stimulusList || [];

    const sections = buildSections(config);
    actions.initialize({ testTitle: config.title || '', maxItems: config.items.length, sections });

    if (showAssessmentIntroRef.current) {
      actions.setPanel('assessment-intro');
    } else {
      testStartedAtRef.current = Date.now();
      TelemetryService.logAssessmentStart(0);
      // Deferred via pendingLoadRef, not called directly: `actions.initialize`
      // above dispatches maxItems/sections, but dispatch doesn't update this
      // closure's `state` until the next render — loadItemAtIndex reads both
      // (for its bounds check and shouldShowSectionIntroFor), so calling it
      // synchronously here would see stale (pre-init) values. The pending-load
      // effect picks this up after the dispatch actually commits.
      pendingLoadRef.current = { panel: 'item', index: 0 };
    }
    actions.updateButtonState();
  }

  function handleBeginAssessment(index = 0) {
    testStartedAtRef.current = Date.now();
    TelemetryService.logAssessmentStart(0);
    TelemetryService.logInteraction('start-assessment', index);
    switchToItemAndLoad(index);
    actions.setCurrentItem(index);
  }

  function handleGoToAssessmentIntro() {
    actions.setPanel('assessment-intro');
  }

  function handleBeginAssessmentAtSection(section: FlattenedSection) {
    const identifier = (section.itemIdentifiers as string[])[0];
    const items = TC.getItems();
    const index = items ? items.findIndex((item) => item.identifier === identifier) : -1;
    if (index < 0) return;
    handleBeginAssessment(index);
  }

  function buildSections(cfg: RunnerConfig): FlattenedSection[] {
    if (Array.isArray(cfg.sections) && cfg.sections.length) {
      return cfg.sections.map((s) => ({
        identifier: s.identifier,
        name: s.name,
        blurb: s.blurb || '',
        itemIdentifiers: s.itemIdentifiers,
        timeLimitSeconds: s.timeLimitSeconds ?? null,
        allowLateSubmission: s.allowLateSubmission ?? false,
      }));
    }
    return [{
      identifier: 'default',
      name: cfg.title || 'Section A',
      blurb: '',
      itemIdentifiers: cfg.items.map((item) => item.identifier),
      timeLimitSeconds: null,
      allowLateSubmission: false,
    }];
  }

  // ── Derived (read) helpers — mirror the original's computed properties ──

  function getSectionForIndex(index: number): FlattenedSection | null {
    const item = TC.getItemAtIndex(index);
    if (!item) return null;
    return state.sections.find((s) => s.itemIdentifiers.includes(item.identifier)) || null;
  }

  function isItemInExpiredSection(index: number): boolean {
    const section = getSectionForIndex(index);
    return !!section && expiredSectionIds.has(section.identifier as string);
  }

  function isFirstItemOfSection(index: number): boolean {
    const section = getSectionForIndex(index);
    if (!section) return false;
    return section.itemIdentifiers[0] === TC.getItemAtIndex(index).identifier;
  }

  function shouldShowSectionIntroFor(index: number): boolean {
    if (!showSectionIntroRef.current) return false;
    const section = getSectionForIndex(index);
    if (!section || shownSectionIntrosRef.current.has(section.identifier as string)) return false;
    return isFirstItemOfSection(index);
  }

  function getCurrentSectionId(): string | null {
    if (!TC.getItems() || state.currentItem < 0) return null;
    const currentIdentifier = TC.getItemAtIndex(state.currentItem)?.identifier;
    const section = state.sections.find((s) => s.itemIdentifiers.includes(currentIdentifier));
    return section ? (section.identifier as string) : null;
  }

  function getReviewSectionId(): string | null {
    if (!TC.getItems() || state.reviewIndex < 0) return null;
    const currentIdentifier = TC.getItemAtIndex(state.reviewIndex)?.identifier;
    const section = state.sections.find((s) => s.itemIdentifiers.includes(currentIdentifier));
    return section ? (section.identifier as string) : null;
  }

  function getPendingSection(): FlattenedSection | null {
    return state.pendingItemIndex !== null ? getSectionForIndex(state.pendingItemIndex) : null;
  }

  function getPendingSectionIndex(): number {
    const pendingSection = getPendingSection();
    if (!pendingSection) return 0;
    return state.sections.findIndex((s) => s.identifier === pendingSection.identifier);
  }

  function getSummary(): ItemSummaryEntry[] {
    const items = TC.getItems();
    if (!items) return [];
    return items.map((item, index) => ({
      identifier: item.identifier,
      index,
      answered: !TC.isItemNullResponse(TC.getItemStateByGuid(item.guid)),
    }));
  }

  function getBreakdown(): SummaryBreakdown {
    const items = TC.getItems();
    if (!items) return { correct: 0, wrong: 0, partial: 0, skipped: 0, score: 0 };
    const totalScore = computeTotalScore(TC.getItemStates() ?? new Map());
    return computeSummaryBreakdown(items, TC, totalScore);
  }

  function getSectionsWithCounts() {
    const items = TC.getItems();
    if (!items) return [];
    return state.sections.map((section) => {
      const indices = (section.itemIdentifiers as string[])
        .map((identifier) => items.findIndex((item) => item.identifier === identifier))
        .filter((index) => index >= 0);
      const answered = indices.filter((index) => !TC.isItemNullResponse(TC.getItemStateByGuid(items[index].guid))).length;
      return { ...section, answered, total: indices.length };
    });
  }

  function getConfiguration(guid: string): Configuration {
    const itemState = TC.getItemStates()?.get(guid);
    const configuration: Configuration = { status: itemState?.status ?? 'interacting' };
    if (typeof itemState !== 'undefined') configuration.state = itemState;
    configuration.sessionControl = sessionControlRef.current!.getSessionControl();
    return configuration;
  }

  // ── Item loading ────────────────────────────────────────────────────────

  async function loadItemAtIndex(index: number) {
    if (index === null || index < 0 || index > state.maxItems - 1) return;

    if (shouldShowSectionIntroFor(index)) {
      actions.setPendingItemIndex(index);
      actions.setPanel('section-intro');
      return;
    }

    const item = TC.getItemAtIndex(index);
    itemSubmissionModeRef.current = computeItemSubmissionMode(item, testSubmissionModeRef.current);

    if (item.sessionControl) {
      if ('validateResponses' in item.sessionControl) sessionControlRef.current!.setValidateResponses(item.sessionControl.validateResponses!);
      if ('showFeedback' in item.sessionControl) sessionControlRef.current!.setShowFeedback(item.sessionControl.showFeedback!);
    }

    TelemetryService.logPageViewed(item.identifier, index);

    let xml: string;
    try {
      xml = await contentLoaderRef.current!.resolveItemXml(item);
    } catch (error) {
      TelemetryService.logError(error);
      throw error;
    }

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
    destroyDockedStimuli();
    await itemPlayerRef.current!.loadXml(xml, LongsightPlayerAdapter.toLoadOptions(configuration));
    await loadStimuliForItem(item, xml);
  }

  async function loadReviewItemAtIndex(index: number) {
    if (index < 0 || index > state.maxItems - 1) return;
    const item = TC.getItemAtIndex(index);
    let xml: string;
    try {
      xml = await contentLoaderRef.current!.resolveItemXml(item);
    } catch (error) {
      TelemetryService.logError(error);
      throw error;
    }
    const interactionType = item.interactionType || detectInteractionType(xml);
    actions.setItemMeta({
      interactionType,
      isAdaptive: state.currentItemIsAdaptive,
      hasFeedback: state.currentItemHasFeedback,
      unsupportedTag: null,
    });

    const configuration = getConfiguration(item.guid);
    configuration.status = 'review'; // disables all interactions
    destroyDockedStimuli();
    await itemPlayerRef.current!.loadXml(xml, LongsightPlayerAdapter.toLoadOptions(configuration));
    await loadStimuliForItem(item, xml);
  }

  // ── Stimulus docking ────────────────────────────────────────────────────

  // loadXml above already resolved, so the item's DOM (and any docking divs
  // in it) is guaranteed ready by the time this runs.
  async function loadStimuliForItem(item: TestItem, itemXml: string) {
    const stimuli = await contentLoaderRef.current!.getStimulusXmlList(item, stimulusListRef.current);
    const docked = stimuli.filter((stim) => hasDockingDiv(itemXml, stim.identifier));
    const undocked = stimuli.filter((stim) => !hasDockingDiv(itemXml, stim.identifier));
    actions.setStimuli(undocked);

    docked.forEach((stim) => mountDockedStimulus(stim));
  }

  function handleStimulusPlayerReady(identifier: string, player: { loadStimulusFromXml: (xml: string, config: Configuration) => void }) {
    stimulusPlayersRef.current[identifier] = player;
    loadStimulusIfReady(identifier);
  }

  function loadStimulusIfReady(identifier: string) {
    const stim = state.currentStimuli.find((s) => s.identifier === identifier);
    const player = stimulusPlayersRef.current[identifier];
    if (!stim || !player) return;
    player.loadStimulusFromXml(stim.xml, getConfiguration(identifier));
  }

  function handleStimulusCatalogEvent(event: Record<string, unknown>) {
    onPlayerEvent?.({ type: 'stimulus-catalog', ...event });
  }

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
      console.warn(`[useQtiRunnerOrchestration] Docking div for stimulus "${stim.identifier}" not found in rendered item`);
      return;
    }
    const instance = dockedStimulusFactoryRef.current(dockingElement, stim);
    if (instance) dockedStimulusInstancesRef.current.push(instance);
  }

  /**
   * Overridable seam for the Vue-island construction (new Vue.extend(...),
   * $mount(), event wiring) — kept out of this file so useQtiRunnerOrchestration
   * has no direct Vue dependency; the component hosting the item player
   * assigns the real implementation (services/stimulus-player-mount.ts).
   * A ref, not a plain closure variable — this hook's body re-runs every
   * render, so a plain `let` here would reset to the no-op default each
   * time; the caller re-assigns this ref every render instead (cheap, and
   * always up to date — see setDockedStimulusFactory's own doc).
   */
  function setDockedStimulusFactory(factory: (dockingElement: Element, stim: ResolvedStimulus) => StimulusPlayerInstance | null) {
    dockedStimulusFactoryRef.current = factory;
  }

  function destroyDockedStimuli() {
    dockedStimulusInstancesRef.current.forEach((instance) => instance.$destroy());
    dockedStimulusInstancesRef.current = [];
  }

  // ── Navigation ──────────────────────────────────────────────────────────

  function handleNextItem() {
    actions.setButtonDisabled('next', true);
    initiateNavigateNextItem();
  }

  function handleAdvancePart() {
    actions.setButtonDisabled('next', true);
    endOrSuspendAttempt('advancePart', 'next');
  }


  function handlePrevItem() {
    if (state.currentItem === 0) return;
    actions.setButtonDisabled('prev', true);
    initiateNavigatePrevItem();
  }

  function onSectionJump(section: FlattenedSection) {
    const identifier = (section.itemIdentifiers as string[])[0];
    const items = TC.getItems();
    const index = items ? items.findIndex((item) => item.identifier === identifier) : -1;
    if (index < 0) return;

    if (state.currentPanel === 'section-intro') {
      if (index === state.pendingItemIndex) return;
      switchToItemAndLoad(index);
      actions.setCurrentItem(index);
      actions.updateButtonState();
      return;
    }
    if (state.currentPanel === 'review') {
      if (index === state.reviewIndex) return;
      actions.setReviewIndex(index);
      void loadReviewItemAtIndex(index);
      return;
    }
    if (index === state.currentItem) return;
    initiateNavigateItem('navigateItem', { index, identifier });
  }

  function handleBeginSection() {
    const section = getPendingSection();
    if (section) shownSectionIntrosRef.current.add(section.identifier as string);
    const index = state.pendingItemIndex;
    actions.setPendingItemIndex(null);
    if (index === null) return;
    TelemetryService.logInteraction('start-section', index);
    switchToItemAndLoad(index);
  }

  function handleGotoEnd() {
    actions.setSubmitModalOpen(false);
    initiateNavigateEnd();
  }

  function handleSubmitClick() {
    if (state.currentPanel !== 'item') return;
    actions.setSubmitModalOpen(true);
  }

  // Review is read-only, never finalizes — just saves the last item's
  // response first so Review can read it back.
  function handleReviewClick() {
    TelemetryService.logInteraction('review', state.currentItem);
    endOrSuspendAttempt('openReview', null);
  }

  function openReview() {
    switchToReviewAndLoad(0);
  }

  function reviewPrevItem() {
    if (state.reviewIndex === 0) return;
    const index = state.reviewIndex - 1;
    actions.setReviewIndex(index);
    void loadReviewItemAtIndex(index);
  }

  function reviewNextItem() {
    if (state.reviewIndex + 1 === state.maxItems) return;
    const index = state.reviewIndex + 1;
    actions.setReviewIndex(index);
    void loadReviewItemAtIndex(index);
  }

  function exitReview() {
    switchToItemAndLoad(state.currentItem);
    actions.updateButtonState();
  }

  function confirmSubmit() {
    actions.setSubmitModalOpen(false);
    onNavEvent?.({ type: 'submit', currentItem: state.currentItem, maxItems: state.maxItems });
    TelemetryService.logInteraction('submit', state.currentItem);
    initiateNavigateEnd();
  }

  function initiateNavigateNextItem() {
    if (state.currentItem + 1 === state.maxItems) return initiateNavigateEnd();
    if (isItemInExpiredSection(state.currentItem)) return navigateNextItem();
    endOrSuspendAttempt('navigateNextItem', 'next');
  }

  function navigateNextItem() {
    const index = state.currentItem + 1;
    actions.setCurrentItem(index);
    void loadItemAtIndex(index);
    actions.updateButtonState();
    onNavEvent?.({ type: 'next', currentItem: index, maxItems: state.maxItems });
    TelemetryService.logInteraction('next', index);
  }

  function initiateNavigatePrevItem() {
    if (isItemInExpiredSection(state.currentItem)) return navigatePrevItem();
    endOrSuspendAttempt('navigatePrevItem', 'prev');
  }

  function navigatePrevItem() {
    const index = state.currentItem - 1;
    actions.setCurrentItem(index);
    void loadItemAtIndex(index);
    actions.updateButtonState();
    onNavEvent?.({ type: 'previous', currentItem: index, maxItems: state.maxItems });
    TelemetryService.logInteraction('previous', index);
  }

  function initiateNavigateItem(target: NavigationTarget, data: { index: number; identifier: string }) {
    TC.setNavigateItemData(data);
    if (isItemInExpiredSection(state.currentItem)) return navigateItem();
    endOrSuspendAttempt(target, 'goto');
  }

  function navigateItem() {
    const data = TC.getNavigateItemData()!;
    actions.setCurrentItem(data.index);
    void loadItemAtIndex(data.index);
    actions.updateButtonState();
    onNavEvent?.({ type: 'goto', currentItem: data.index, maxItems: state.maxItems });
    TelemetryService.logInteraction('goto', data.index);
  }

  function getNextSectionAfterCurrent(): FlattenedSection | null {
    const currentId = getCurrentSectionId();
    if (!currentId) return null;
    const index = state.sections.findIndex((s) => s.identifier === currentId);
    if (index < 0 || index + 1 >= state.sections.length) return null;
    return state.sections[index + 1];
  }

  function navigateToNextSectionOrEnd() {
    const nextSection = getNextSectionAfterCurrent();
    const identifier = nextSection ? (nextSection.itemIdentifiers as string[])[0] : null;
    const items = TC.getItems();
    const index = identifier && items ? items.findIndex((item) => item.identifier === identifier) : -1;
    if (index < 0) {
      navigateEnd();
      return;
    }
    actions.setCurrentItem(index);
    void loadItemAtIndex(index);
    actions.updateButtonState();
    onNavEvent?.({ type: 'goto', currentItem: index, maxItems: state.maxItems });
    TelemetryService.logInteraction('section-time-expired-advance', index);
  }

  function handleSectionTimeExpired() {
    if (state.currentPanel !== 'item') return;
    TelemetryService.logInteraction('section-time-expired', state.currentItem);
    endOrSuspendAttempt('sectionTimeExpired', 'next');
  }
  handleSectionTimeExpiredRef.current = handleSectionTimeExpired;

  function initiateNavigateEnd() {
    endOrSuspendAttempt('navigateEnd', null);
  }

  function navigateEnd() {
    actions.setPanel('results');
    itemPlayerRef.current?.reset();
    onNavEvent?.({ type: 'end', currentItem: state.currentItem, maxItems: state.maxItems });

    const itemStates = TC.getItemStates()!;
    const totalScore = computeTotalScore(itemStates);
    testDurationMsRef.current = Date.now() - testStartedAtRef.current!;
    TelemetryService.logAssessmentEnd(state.currentItem, state.maxItems, testDurationMsRef.current, totalScore);
    TelemetryService.logSummary(
      computeSummaryBreakdown(TC.getItems()!, TC, totalScore),
      { currentQuestionIndex: state.currentItem, totalQuestions: state.maxItems, starttime: testStartedAtRef.current! },
    );
  }

  function handleRestart() {
    if (getAttemptsRemaining() === 0) return;
    testAttemptNumberRef.current += 1;
    testStartedAtRef.current = Date.now();
    testDurationMsRef.current = null;
    TC.getItemStates()!.clear();
    shownSectionIntrosRef.current.clear();
    activeTimedSectionIdRef.current = null;
    sectionElapsedMsRef.current.clear();
    setExpiredSectionIds(new Set());
    actions.restart();
    switchToItemAndLoad(0);
    actions.updateButtonState();
    onNavEvent?.({ type: 'restart', currentItem: 0, maxItems: state.maxItems });
    TelemetryService.logInteraction('restart', 0);
  }

  // ── Attempt completion (endAttempt/suspend round-trip) ──────────────────

  function isSubmissionModeIndividual(): boolean {
    return itemSubmissionModeRef.current === 'individual';
  }

  // A broken qti-response-processing (bad expression, null operand it
  // doesn't guard, etc.) may throw here rather than ever calling back with
  // the qti-endattempt event, which would otherwise leave navigation
  // silently hung with no feedback.
  function endOrSuspendAttempt(target: NavigationTarget, navigationDirection: 'next' | 'prev' | 'goto' | null) {
    if (state.currentItemUnsupportedTag) {
      handleEvaluatedAttempt(target, { responseVariables: [], outcomeVariables: [], validationMessages: [], status: 'interacting' });
      return;
    }
    pendingAttemptTargetRef.current = target;
    try {
      if (isSubmissionModeIndividual()) itemPlayerRef.current!.endAttempt();
      else itemPlayerRef.current!.suspend();
    } catch (error) {
      TelemetryService.logError(error);
      if (navigationDirection) actions.setButtonDisabled(navigationDirection === 'goto' ? 'next' : navigationDirection, false);
      actions.setToast({ type: 'error', message: 'This item could not be scored due to an internal error. Please try again or contact support.' });
    }
  }

  function handleEndAttemptCompleted(detail: QtiEndAttemptEventDetail) {
    evaluateResults(toEvaluateResultsData(detail));
  }

  function handleValidationEvent(detail: QtiValidationEventDetail) {
    const target = pendingAttemptTargetRef.current;
    pendingAttemptTargetRef.current = null;
    const navigationDirection = target === 'navigatePrevItem' ? 'prev' : 'next';
    actions.setButtonDisabled(navigationDirection, false);
    actions.setToast({ type: 'error', message: detail.validationMessages[0]?.message || 'Unable to continue.' });
  }

  function handleSuspendAttemptCompleted(detail: QtiEndAttemptEventDetail) {
    evaluateResults(toEvaluateResultsData(detail));
  }

  function toEvaluateResultsData(detail: QtiEndAttemptEventDetail) {
    const item = TC.getItemAtIndex(state.currentItem);
    const target = pendingAttemptTargetRef.current;
    pendingAttemptTargetRef.current = null;
    return { target, state: LongsightPlayerAdapter.toLegacyState(detail.state, item.guid) };
  }

  function evaluateResults(data: { target: NavigationTarget; state: LegacyAttemptState }) {
    if (TC.isItemNullResponse(data.state)) data.state.status = 'interacting';
    if (data.target !== 'openReview') raiseAssessAndResponse(data.state);
    setTestStateItemState(data.state);
    handleEvaluatedAttempt(data.target, data.state);
  }

  function getAttemptsRemaining(): number | null {
    const max = sessionControlRef.current?.getMaxAttempts() ?? 1;
    if (max === 0) return null;
    return Math.max(0, max - testAttemptNumberRef.current);
  }

  function raiseAssessAndResponse(itemState: LegacyAttemptState) {
    const duration = itemStartedAtRef.current ? (Date.now() - itemStartedAtRef.current) / 1000 : 0;
    const scoreVar = itemState.outcomeVariables.find((v) => v.identifier === 'SCORE');
    const score = scoreVar ? Number(scoreVar.value) || 0 : 0;
    const resvalues = itemState.responseVariables
      .filter((v) => v.identifier !== 'duration' && v.identifier !== 'numAttempts')
      .map((v) => ({ value: v.value }));

    TelemetryService.logAnswerSubmitted(
      { identifier: itemState.identifier! },
      state.currentItem,
      resvalues,
      score,
      1,
      { sectionId: getCurrentSectionId() ?? undefined, durationSec: duration },
    );
    TelemetryService.logResponse(itemState.identifier!, state.currentItemInteractionType ?? undefined, resvalues[0] ? resvalues[0].value : null);
  }

  function setTestStateItemState(itemState: LegacyAttemptState) {
    TC.getItemStates()!.set(itemState.guid!, itemState);
  }

  /** The original's next(data) switch — decision logic lives in
   * navigation-service.ts's resolveNavigationOutcome; this just acts on it. */
  function handleEvaluatedAttempt(target: NavigationTarget, itemState: LegacyAttemptState) {
    const decision = resolveNavigationOutcome(target, itemState, {
      validateResponses: sessionControlRef.current!.getValidateResponses(),
    });

    switch (decision.action) {
      case 'advancePart':
        actions.setButtonDisabled('next', false);
        return;
      case 'blocked': {
        const navigationDirection = target === 'navigatePrevItem' ? 'prev' : 'next';
        actions.setButtonDisabled(navigationDirection, false);
        actions.setToast({ type: 'error', message: decision.message || 'Unable to continue.' });
        return;
      }
      case 'skip':
        TelemetryService.logInteraction('skip', state.currentItem);
        navigateNextItem();
        return;
      case 'endAttemptInteraction':
        TelemetryService.logInteraction('end-attempt-interaction', state.currentItem);
        return;
      case 'proceed': {
        switch (target) {
          case 'navigateNextItem': return navigateNextItem();
          case 'navigatePrevItem': return navigatePrevItem();
          case 'navigateItem': return navigateItem();
          case 'navigateEnd': return navigateEnd();
          case 'openReview': return openReview();
          case 'sectionTimeExpired': return navigateToNextSectionOrEnd();
          default: return;
        }
      }
    }
  }

  // ── Item-player event handlers ──────────────────────────────────────────

  function displayItemAlertEvent(detail: QtiDiagnosticsEventDetail) {
    const diagnostic = detail.diagnostics[0];
    if (!diagnostic) return;
    const toast: Toast = { type: mapSeverityToToastType(diagnostic.severity), message: diagnostic.message };
    actions.setToast(toast);
    onPlayerEvent?.({ type: 'alert', ...diagnostic });
  }

  function mapSeverityToToastType(severity: string | undefined): Toast['type'] {
    return (['success', 'error', 'warning', 'info'] as const).includes(severity as Toast['type']) ? (severity as Toast['type']) : 'info';
  }

  function handleItemCatalogEvent(detail: QtiCatalogRequestEventDetail) {
    onPlayerEvent?.({ type: 'catalog', ...detail });
  }

  function handleItemReady() {
    itemStartedAtRef.current = Date.now();
    onPlayerEvent?.({ type: 'item-ready' });
  }

  return {
    itemPlayerRef,
    summary: getSummary(),
    breakdown: getBreakdown(),
    timeTakenSeconds: testDurationMsRef.current !== null ? Math.round(testDurationMsRef.current / 1000) : null,
    sectionsWithCounts: getSectionsWithCounts(),
    currentSectionId: getCurrentSectionId(),
    currentReviewSectionId: getReviewSectionId(),
    pendingSection: getPendingSection(),
    pendingSectionIndex: getPendingSectionIndex(),
    answeredCount: getSummary().filter((item) => item.answered).length,
    isLastItem: state.currentItem + 1 === state.maxItems,
    attemptsRemaining: getAttemptsRemaining(),
    sectionTimeRemaining,
    sectionTimeOverrun,
    testTimeRemaining,

    initialize,
    setDockedStimulusFactory,

    handleBeginAssessment,
    handleBeginAssessmentAtSection,
    handleGoToAssessmentIntro,
    handleNextItem,
    handleAdvancePart,
    handlePrevItem,
    onSectionJump,
    handleBeginSection,
    handleGotoEnd,
    handleSubmitClick,
    handleReviewClick,
    reviewPrevItem,
    reviewNextItem,
    exitReview,
    confirmSubmit,
    handleRestart,

    handleEndAttemptCompleted,
    handleSuspendAttemptCompleted,
    handleValidationEvent,
    handleStimulusPlayerReady,
    handleStimulusCatalogEvent,
    displayItemAlertEvent,
    handleItemCatalogEvent,
    handleItemReady,
  };
}
