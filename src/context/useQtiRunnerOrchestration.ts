/**
 * Navigation + endAttempt/suspend round-trip. Kept together — verified
 * bidirectional: Navigation calls endOrSuspendAttempt synchronously; the
 * return leg lands async via handleEndAttemptCompleted/
 * handleSuspendAttemptCompleted → evaluateResults → handleEvaluatedAttempt
 * → back into navigate*. Splitting further would need a ctx object
 * duplicating the same state/actions/TC/ref coupling — no real separation.
 *
 * Everything else is its own file: useSectionTimer/useTestTimer (timers),
 * useStimulusDocking, useItemLoading (one-way sink), useAssessmentLifecycle
 * (one-way), useReview (one backward edge, via "latest ref" like the
 * timers), orchestration-selectors (pure getters).
 */
import { useRef } from 'react';
import { useQtiRunner } from './useQtiRunner';
import { useSectionTimer } from './useSectionTimer';
import { useTestTimer } from './useTestTimer';
import { useStimulusDocking } from './useStimulusDocking';
import { useItemLoading } from './useItemLoading';
import { useAssessmentLifecycle } from './useAssessmentLifecycle';
import { useReview } from './useReview';
import * as Selectors from './orchestration-selectors';
import type { Toast } from './QtiRunnerContext';
import { TestControllerUtilities } from '@/services/test-controller';
import { ContentLoader } from '@/services/content-loader';
import { SessionControlFactory } from '@/services/session-control-factory';
import * as LongsightPlayerAdapter from '@/services/longsight-player-adapter';
import type { Configuration } from '@/services/longsight-player-adapter';
import * as TelemetryService from '@/services/telemetry-service';
import { getOutcomeValue, resolveNavigationOutcome } from '@/services/navigation-service';
import type { NavigationTarget } from '@/services/navigation-service';
import type { FlattenedSection } from '@/utils/test-xml-parser';
import type { LegacyAttemptState, NavEvent, PlayerEvent, RunnerConfig } from '@/types';
import type { QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react';
import type { QtiCatalogRequestEventDetail, QtiDiagnosticsEventDetail, QtiEndAttemptEventDetail, QtiValidationEventDetail } from '@/types/qti-player-element';

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
  // Forward ref for the one backward edge (attempt-completion → review's
  // openReview) — review isn't built yet when endOrSuspendAttempt is.
  const openReviewRef = useRef<() => void>(() => {});

  function getCurrentSectionId(): string | null {
    return Selectors.getCurrentSectionId(TC, state);
  }

  const { sectionTimeRemaining, sectionTimeOverrun, isSectionExpired, resetSectionTimer } = useSectionTimer(
    state.currentPanel,
    getCurrentSectionId(),
    state.sections,
    handleSectionTimeExpired,
  );
  const { testTimeRemaining, resetTestTimer } = useTestTimer(
    state.currentPanel,
    config.timeLimitSeconds,
    testStartedAtRef.current,
    handleTestTimeExpired,
  );

  // Shared by item-loading and stimulus-docking below — each needs
  // something FROM the other, so owning this in either would cycle.
  function getConfiguration(guid: string): Configuration {
    const itemState = TC.getItemStates()?.get(guid);
    const configuration: Configuration = { status: itemState?.status ?? 'interacting' };
    if (typeof itemState !== 'undefined') configuration.state = itemState;
    configuration.sessionControl = sessionControlRef.current!.getSessionControl();
    return configuration;
  }

  const { loadStimuliForItem, handleStimulusPlayerReady, setDockedStimulusFactory, destroyDockedStimuli } = useStimulusDocking({
    itemPlayerRef,
    contentLoaderRef,
    stimulusList: config.stimulusList || [],
    currentStimuli: state.currentStimuli,
    setStimuli: actions.setStimuli,
    getConfiguration,
  });

  const itemLoading = useItemLoading({
    state,
    actions: {
      setPanel: actions.setPanel,
      setPendingItemIndex: actions.setPendingItemIndex,
      setReviewIndex: actions.setReviewIndex,
      setItemMeta: actions.setItemMeta,
    },
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
  });

  const lifecycle = useAssessmentLifecycle({
    config,
    state,
    actions: {
      initialize: actions.initialize,
      setPanel: actions.setPanel,
      setCurrentItem: actions.setCurrentItem,
      updateButtonState: actions.updateButtonState,
      restart: actions.restart,
    },
    TC,
    itemPlayerRef,
    contentLoaderRef,
    sessionControlRef,
    testSubmissionModeRef,
    showSectionIntroRef,
    showAssessmentIntroRef,
    shownSectionIntrosRef,
    testStartedAtRef,
    testDurationMsRef,
    testAttemptNumberRef,
    resetSectionTimer,
    resetTestTimer,
    onNavEvent,
    switchToItemAndLoad: itemLoading.switchToItemAndLoad,
  });

  const review = useReview({
    state,
    actions: {
      setReviewIndex: actions.setReviewIndex,
      updateButtonState: actions.updateButtonState,
    },
    loadReviewItemAtIndex: itemLoading.loadReviewItemAtIndex,
    switchToReviewAndLoad: itemLoading.switchToReviewAndLoad,
    switchToItemAndLoad: itemLoading.switchToItemAndLoad,
    endOrSuspendAttempt,
  });
  openReviewRef.current = review.openReview;

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
      itemLoading.switchToItemAndLoad(index);
      actions.setCurrentItem(index);
      actions.updateButtonState();
      return;
    }
    if (state.currentPanel === 'review') {
      if (index === state.reviewIndex) return;
      actions.setReviewIndex(index);
      void itemLoading.loadReviewItemAtIndex(index);
      return;
    }
    if (index === state.currentItem) return;
    initiateNavigateItem('navigateItem', { index, identifier });
  }

  function handleBeginSection() {
    const section = Selectors.getPendingSection(TC, state);
    if (section) shownSectionIntrosRef.current.add(section.identifier as string);
    const index = state.pendingItemIndex;
    actions.setPendingItemIndex(null);
    if (index === null) return;
    TelemetryService.logInteraction('start-section', index);
    itemLoading.switchToItemAndLoad(index);
  }

  function handleGotoEnd() {
    actions.setSubmitModalOpen(false);
    initiateNavigateEnd();
  }

  function handleSubmitClick() {
    if (state.currentPanel !== 'item') return;
    actions.setSubmitModalOpen(true);
  }

  function confirmSubmit() {
    actions.setSubmitModalOpen(false);
    onNavEvent?.({ type: 'submit', currentItem: state.currentItem, maxItems: state.maxItems });
    TelemetryService.logInteraction('submit', state.currentItem);
    initiateNavigateEnd();
  }

  function navigateTo(index: number, type: 'next' | 'previous' | 'goto', interaction: string) {
    actions.setCurrentItem(index);
    void itemLoading.loadItemAtIndex(index);
    actions.updateButtonState();
    onNavEvent?.({ type, currentItem: index, maxItems: state.maxItems });
    TelemetryService.logInteraction(interaction, index);
  }

  function initiateNavigateNextItem() {
    if (state.currentItem + 1 === state.maxItems) return initiateNavigateEnd();
    if (itemLoading.isItemInExpiredSection(state.currentItem)) return navigateNextItem();
    endOrSuspendAttempt('navigateNextItem', 'next');
  }

  function navigateNextItem() {
    navigateTo(state.currentItem + 1, 'next', 'next');
  }

  function initiateNavigatePrevItem() {
    if (itemLoading.isItemInExpiredSection(state.currentItem)) return navigatePrevItem();
    endOrSuspendAttempt('navigatePrevItem', 'prev');
  }

  function navigatePrevItem() {
    navigateTo(state.currentItem - 1, 'previous', 'previous');
  }

  function initiateNavigateItem(target: NavigationTarget, data: { index: number; identifier: string }) {
    TC.setNavigateItemData(data);
    if (itemLoading.isItemInExpiredSection(state.currentItem)) return navigateItem();
    endOrSuspendAttempt(target, 'goto');
  }

  function navigateItem() {
    const data = TC.getNavigateItemData()!;
    navigateTo(data.index, 'goto', 'goto');
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
      lifecycle.navigateEnd();
      return;
    }
    navigateTo(index, 'goto', 'section-time-expired-advance');
  }

  function handleSectionTimeExpired() {
    if (state.currentPanel !== 'item') return;
    TelemetryService.logInteraction('section-time-expired', state.currentItem);
    endOrSuspendAttempt('sectionTimeExpired', 'next');
  }

  function handleTestTimeExpired() {
    TelemetryService.logInteraction('test-time-expired', state.currentItem);
    if (state.currentPanel === 'item') {
      endOrSuspendAttempt('testTimeExpired', 'next');
    } else {
      lifecycle.navigateEnd();
    }
  }

  function initiateNavigateEnd() {
    endOrSuspendAttempt('navigateEnd', null);
  }

  // ── Attempt-completion round-trip ───────────────────────────────────────

  // A broken qti-response-processing may throw here instead of ever firing
  // the qti-endattempt event, which would otherwise hang navigation silently.
  function endOrSuspendAttempt(target: NavigationTarget, navigationDirection: 'next' | 'prev' | 'goto' | null) {
    if (state.currentItemUnsupportedTag) {
      handleEvaluatedAttempt(target, { responseVariables: [], outcomeVariables: [], validationMessages: [], status: 'interacting' });
      return;
    }
    pendingAttemptTargetRef.current = target;
    try {
      if (itemSubmissionModeRef.current === 'individual') itemPlayerRef.current!.endAttempt();
      else itemPlayerRef.current!.suspend();
    } catch (error) {
      TelemetryService.logError(error);
      if (navigationDirection) actions.setButtonDisabled(navigationDirection === 'goto' ? 'next' : navigationDirection, false);
      actions.setToast({ type: 'error', message: 'This item could not be scored due to an internal error. Please try again or contact support.' });
    }
  }

  function handleAttemptCompleted(detail: QtiEndAttemptEventDetail) {
    evaluateResults(toEvaluateResultsData(detail));
  }

  function handleValidationEvent(detail: QtiValidationEventDetail) {
    const target = pendingAttemptTargetRef.current;
    pendingAttemptTargetRef.current = null;
    const navigationDirection = target === 'navigatePrevItem' ? 'prev' : 'next';
    actions.setButtonDisabled(navigationDirection, false);
    actions.setToast({ type: 'error', message: detail.validationMessages[0]?.message || 'Unable to continue.' });
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

  function raiseAssessAndResponse(itemState: LegacyAttemptState) {
    const duration = itemStartedAtRef.current ? (Date.now() - itemStartedAtRef.current) / 1000 : 0;
    const score = getOutcomeValue(itemState, 'SCORE', 0);
    const maxScore = getOutcomeValue(itemState, 'MAXSCORE', 1);
    const resvalues = itemState.responseVariables
      .filter((v) => v.identifier !== 'duration' && v.identifier !== 'numAttempts')
      .map((v) => ({ value: v.value }));

    TelemetryService.logAnswerSubmitted(
      { identifier: itemState.identifier! },
      state.currentItem,
      resvalues,
      score,
      maxScore,
      { sectionId: getCurrentSectionId() ?? undefined, durationSec: duration },
    );
    TelemetryService.logResponse(itemState.identifier!, state.currentItemInteractionType ?? undefined, resvalues[0] ? resvalues[0].value : null);
  }

  function setTestStateItemState(itemState: LegacyAttemptState) {
    TC.getItemStates()!.set(itemState.guid!, itemState);
  }

  /** Decision logic lives in navigation-service.ts's
   * resolveNavigationOutcome; this just acts on it. */
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
          case 'navigateEnd': return lifecycle.navigateEnd();
          case 'openReview': return openReviewRef.current();
          case 'sectionTimeExpired': return navigateToNextSectionOrEnd();
          case 'testTimeExpired': return lifecycle.navigateEnd();
          default: return;
        }
      }
    }
  }

  // ── Item-player event handlers ──────────────────────────────────────────

  function handleStimulusCatalogEvent(event: Record<string, unknown>) {
    onPlayerEvent?.({ type: 'stimulus-catalog', ...event });
  }

  function displayItemAlertEvent(detail: QtiDiagnosticsEventDetail) {
    const diagnostic = detail.diagnostics[0];
    if (!diagnostic) return;
    const severity = diagnostic.severity as Toast['type'];
    actions.setToast({ type: (['success', 'error', 'warning', 'info'] as const).includes(severity) ? severity : 'info', message: diagnostic.message });
    onPlayerEvent?.({ type: 'alert', ...diagnostic });
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
    summary: Selectors.getSummary(TC),
    breakdown: Selectors.getBreakdown(TC),
    timeTakenSeconds: testDurationMsRef.current !== null ? Math.round(testDurationMsRef.current / 1000) : null,
    sectionsWithCounts: Selectors.getSectionsWithCounts(TC, state),
    currentSectionId: getCurrentSectionId(),
    currentReviewSectionId: Selectors.getReviewSectionId(TC, state),
    pendingSection: Selectors.getPendingSection(TC, state),
    pendingSectionIndex: Selectors.getPendingSectionIndex(TC, state),
    answeredCount: Selectors.getSummary(TC).filter((item) => item.answered).length,
    isLastItem: state.currentItem + 1 === state.maxItems,
    attemptsRemaining: lifecycle.getAttemptsRemaining(),
    sectionTimeRemaining,
    sectionTimeOverrun,
    testTimeRemaining,

    initialize: lifecycle.initialize,
    setDockedStimulusFactory,

    handleBeginAssessment: lifecycle.handleBeginAssessment,
    handleBeginAssessmentAtSection: lifecycle.handleBeginAssessmentAtSection,
    handleGoToAssessmentIntro: lifecycle.handleGoToAssessmentIntro,
    handleNextItem,
    handleAdvancePart,
    handlePrevItem,
    onSectionJump,
    handleBeginSection,
    handleGotoEnd,
    handleSubmitClick,
    handleReviewClick: review.handleReviewClick,
    reviewPrevItem: review.reviewPrevItem,
    reviewNextItem: review.reviewNextItem,
    exitReview: review.exitReview,
    confirmSubmit,
    handleRestart: lifecycle.handleRestart,

    handleEndAttemptCompleted: handleAttemptCompleted,
    handleSuspendAttemptCompleted: handleAttemptCompleted,
    handleValidationEvent,
    handleStimulusPlayerReady,
    handleStimulusCatalogEvent,
    displayItemAlertEvent,
    handleItemCatalogEvent,
    handleItemReady,
  };
}