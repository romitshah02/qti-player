/**
 * Assessment lifecycle — init, begin/restart/end. One-way outward into
 * item-loading only. navigateEnd is called inbound from
 * navigation/attempt-completion, but this module is built first, so it's
 * just a plain reference — no ref needed.
 */
import type { MutableRefObject, RefObject } from 'react';
import type { Panel, RunnerState } from './QtiRunnerContext';
import * as Selectors from './orchestration-selectors';
import { ContentLoader } from '@/services/content-loader';
import { SessionControlFactory } from '@/services/session-control-factory';
import * as TelemetryService from '@/services/telemetry-service';
import { computeSummaryBreakdown, computeTotalMaxScore, computeTotalScore, finalizeUnattemptedItemOutcomes } from '@/services/navigation-service';
import type { TestControllerUtilities } from '@/services/test-controller';
import type { FlattenedSection } from '@/utils/test-xml-parser';
import type { NavEvent, RunnerConfig } from '@/types';
import type { QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react';

export interface UseAssessmentLifecycleOptions {
  config: RunnerConfig;
  state: RunnerState;
  actions: {
    initialize: (payload: { testTitle: string; maxItems: number; sections: FlattenedSection[] }) => void;
    setPanel: (panel: Panel) => void;
    setCurrentItem: (index: number) => void;
    updateButtonState: () => void;
    restart: () => void;
  };
  TC: TestControllerUtilities;
  itemPlayerRef: RefObject<QtiAssessmentItemPlayerHandle | null>;
  contentLoaderRef: MutableRefObject<ContentLoader | null>;
  sessionControlRef: MutableRefObject<SessionControlFactory | null>;
  testSubmissionModeRef: MutableRefObject<string>;
  showSectionIntroRef: MutableRefObject<boolean>;
  showAssessmentIntroRef: MutableRefObject<boolean>;
  shownSectionIntrosRef: MutableRefObject<Set<string>>;
  testStartedAtRef: MutableRefObject<number | null>;
  testDurationMsRef: MutableRefObject<number | null>;
  testAttemptNumberRef: MutableRefObject<number>;
  resetSectionTimer: () => void;
  resetTestTimer: () => void;
  onNavEvent?: (event: NavEvent) => void;
  switchToItemAndLoad: (index: number) => void;
}

export function useAssessmentLifecycle(options: UseAssessmentLifecycleOptions) {
  const {
    config,
    state,
    actions,
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
    switchToItemAndLoad,
  } = options;

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

  function initialize() {
    if (!config || !Array.isArray(config.items) || config.items.length === 0) {
      console.warn('[useAssessmentLifecycle] config.items is required and must be non-empty');
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

    const sections = buildSections(config);
    actions.initialize({ testTitle: config.title || '', maxItems: config.items.length, sections });

    if (showAssessmentIntroRef.current) {
      actions.setPanel('assessment-intro');
    } else {
      testStartedAtRef.current = Date.now();
      TelemetryService.logAssessmentStart(0);
      // Deferred — dispatch above hasn't updated `state` yet this render,
      // and loadItemAtIndex needs the fresh maxItems/sections.
      switchToItemAndLoad(0);
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

  function getAttemptsRemaining(): number | null {
    const max = sessionControlRef.current?.getMaxAttempts() ?? 1;
    if (max === 0) return null;
    return Math.max(0, max - testAttemptNumberRef.current);
  }

  async function navigateEnd() {
    itemPlayerRef.current?.reset();
    onNavEvent?.({ type: 'end', currentItem: state.currentItem, maxItems: state.maxItems });

    const items = TC.getItems()!;
    const resolved = await finalizeUnattemptedItemOutcomes(items, TC, contentLoaderRef.current!);
    resolved.forEach(({ item, score, maxScore }) => {
      const index = items.findIndex((i) => i.guid === item.guid);
      TelemetryService.logAnswerSubmitted(
        { identifier: item.identifier },
        index,
        [],
        score,
        maxScore,
        { sectionId: Selectors.getSectionForIndex(TC, state, index)?.identifier ?? undefined },
      );
    });
    actions.setPanel('results');

    const itemStates = TC.getItemStates()!;
    const totalScore = computeTotalScore(itemStates);
    const totalMaxScore = computeTotalMaxScore(items, TC);
    testDurationMsRef.current = Date.now() - testStartedAtRef.current!;
    TelemetryService.logAssessmentEnd(state.currentItem, state.maxItems, testDurationMsRef.current, totalScore, totalMaxScore);
    TelemetryService.logSummary(
      computeSummaryBreakdown(items, TC, totalScore, totalMaxScore),
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
    resetSectionTimer();
    resetTestTimer();
    actions.restart();
    switchToItemAndLoad(0);
    actions.updateButtonState();
    onNavEvent?.({ type: 'restart', currentItem: 0, maxItems: state.maxItems });
    TelemetryService.logInteraction('restart', 0);
  }

  return {
    initialize,
    handleBeginAssessment,
    handleGoToAssessmentIntro,
    handleBeginAssessmentAtSection,
    handleRestart,
    navigateEnd,
    getAttemptsRemaining,
  };
}