import { useEffect } from 'react';
import { defineQtiAssessmentItemPlayer } from '@longsightgroup/qti3-player';
import { QtiRunnerProvider } from '@/context/QtiRunnerContext';
import { useQtiRunnerState, useQtiRunnerActions } from '@/context/useQtiRunner';
import { useQtiRunnerOrchestration } from '@/context/useQtiRunnerOrchestration';
import { mountDockedStimulusPlayer } from '@/services/stimulus-player-mount';
import { PlayerHeader } from '../PlayerHeader/PlayerHeader';
import { Sidebar } from '../Sidebar/Sidebar';
import { MobileSectionsDrawer } from '../MobileSectionsDrawer/MobileSectionsDrawer';
import { QuestionNavBar } from '../QuestionNavBar/QuestionNavBar';
import { SectionIntro } from '../SectionIntro/SectionIntro';
import { SubmitModal } from '../SubmitModal/SubmitModal';
import { Toast } from '../Toast/Toast';
import { ResultsScreen } from '../ResultsScreen/ResultsScreen';
import { StimulusMount } from '../StimulusMount/StimulusMount';
import type { NavEvent, PlayerEvent, RunnerConfig } from '@/types';
import type { QtiCatalogRequestEventDetail, QtiDiagnosticsEventDetail, QtiEndAttemptEventDetail } from '@/types/qti-player-element';
import styles from './TestRunner.module.scss';

// React renders <qti-assessment-item-player> as a plain DOM element — unlike
// Vue there's no compiler-level "unknown custom element" warning to
// suppress, defineQtiAssessmentItemPlayer() just needs to run once before
// first render.
let itemPlayerDefined = false;
function ensureItemPlayerDefined() {
  if (itemPlayerDefined) return;
  defineQtiAssessmentItemPlayer();
  itemPlayerDefined = true;
}

function unsupportedInteractionLabel(tag: string | null): string {
  if (!tag) return '';
  return tag.replace(/^qti-/, '').replace(/-interaction$/, '').replace(/-/g, ' ');
}

export interface TestRunnerProps {
  config: RunnerConfig;
  onPlayerEvent?: (event: PlayerEvent) => void;
  onNavEvent?: (event: NavEvent) => void;
}

export function TestRunner(props: TestRunnerProps) {
  return (
    <QtiRunnerProvider>
      <TestRunnerInner {...props} />
    </QtiRunnerProvider>
  );
}

function TestRunnerInner({ config, onPlayerEvent, onNavEvent }: TestRunnerProps) {
  ensureItemPlayerDefined();
  const state = useQtiRunnerState();
  const actions = useQtiRunnerActions();
  const runner = useQtiRunnerOrchestration(config, { onPlayerEvent, onNavEvent });

  // Reassigned every render (not a mount-only effect) so the docked-stimulus
  // factory always closes over the latest runner handlers — see
  // useQtiRunnerOrchestration's setDockedStimulusFactory doc.
  runner.setDockedStimulusFactory((dockingElement, stim) =>
    mountDockedStimulusPlayer(
      dockingElement,
      (player) => runner.handleStimulusPlayerReady(stim.identifier, player),
      runner.handleStimulusCatalogEvent,
    ),
  );

  useEffect(() => {
    onPlayerEvent?.({ type: 'ready' });
    runner.initialize();
    // Mount-only — config is the one prop this app takes and isn't expected
    // to change after mount (matches the original's mounted()-only initialize).
  }, []);

  // No dependency array: re-binds every render so the listeners always call
  // the current render's handlers (state.currentItem etc. change across
  // renders within the same 'item' panel, with no panel/element remount to
  // key an effect on). Cheap — a handful of listeners on one element,
  // rebound only as often as this component re-renders from real user
  // actions, not a hot path.
  useEffect(() => {
    const el = runner.itemPlayerRef.current;
    if (!el) return;

    const onReady = () => runner.handleItemReady();
    el.addEventListener('qti-ready', onReady);
    const cleanups = [() => el.removeEventListener('qti-ready', onReady)];

    // The review panel only ever listens for qti-ready (status: 'review'
    // disables all interactions, so nothing else should fire there anyway).
    if (state.currentPanel === 'item') {
      const onSuspend = (e: Event) => runner.handleSuspendAttemptCompleted(e as CustomEvent<QtiEndAttemptEventDetail>);
      const onEndAttempt = (e: Event) => runner.handleEndAttemptCompleted(e as CustomEvent<QtiEndAttemptEventDetail>);
      const onDiagnostics = (e: Event) => runner.displayItemAlertEvent(e as CustomEvent<QtiDiagnosticsEventDetail>);
      const onCatalogRequest = (e: Event) => runner.handleItemCatalogEvent(e as CustomEvent<QtiCatalogRequestEventDetail>);

      el.addEventListener('qti-suspend', onSuspend);
      el.addEventListener('qti-endattempt', onEndAttempt);
      el.addEventListener('qti-diagnostics', onDiagnostics);
      el.addEventListener('qti-catalogrequest', onCatalogRequest);
      cleanups.push(
        () => el.removeEventListener('qti-suspend', onSuspend),
        () => el.removeEventListener('qti-endattempt', onEndAttempt),
        () => el.removeEventListener('qti-diagnostics', onDiagnostics),
        () => el.removeEventListener('qti-catalogrequest', onCatalogRequest),
      );
    }

    return () => cleanups.forEach((fn) => fn());
  });

  return (
    <div className={styles.appShell}>
      {state.currentPanel !== 'results' && (
        <PlayerHeader
          brandName={state.testTitle}
          sections={runner.sectionsWithCounts}
          currentSectionId={runner.currentSectionId}
          currentItem={state.currentItem}
          maxItems={state.maxItems}
          reviewEnabled={runner.isLastItem && state.currentPanel === 'item'}
          showMenuToggle
          onMenuToggle={() => actions.setDrawerOpen(true)}
          onSectionJump={runner.onSectionJump}
          onReview={runner.handleReviewClick}
          onSubmit={runner.handleSubmitClick}
        />
      )}

      <div className={styles.appBody}>
        {(state.currentPanel === 'item' || state.currentPanel === 'section-intro') && (
          <div className={styles.sidebarRail}>
            <Sidebar sections={runner.sectionsWithCounts} currentSectionId={runner.currentSectionId} onSectionJump={runner.onSectionJump} />
          </div>
        )}

        <div className={styles.main}>
          {state.currentPanel === 'section-intro' && runner.pendingSection && (
            <SectionIntro section={runner.pendingSection} sectionIndex={runner.pendingSectionIndex} onBegin={runner.handleBeginSection} />
          )}

          {state.currentPanel === 'item' && (
            <>
              <QuestionNavBar
                currentItem={state.currentItem}
                maxItems={state.maxItems}
                isPreviousDisabled={state.isBtnPreviousDisabled}
                isNextDisabled={state.isBtnNextDisabled}
                onPrevious={runner.handlePrevItem}
                onNext={runner.handleNextItem}
                onFinish={runner.handleGotoEnd}
                onExit={() => {}}
              />
              <div className={styles.qtiContent}>
                <div className={`${styles.qtiCard} qti-card`}>
                  {state.currentStimuli.length > 0 && (
                    <div className={styles.qtiStimulusPanel}>
                      {state.currentStimuli.map((stim) => (
                        <StimulusMount
                          key={stim.identifier}
                          onReady={(player) => runner.handleStimulusPlayerReady(stim.identifier, player)}
                          onCatalogEvent={runner.handleStimulusCatalogEvent}
                        />
                      ))}
                    </div>
                  )}
                  <div className={`${styles.qtiItemPanel} qti-item-panel`}>
                    {state.currentItemInteractionType && (
                      <div className={styles.qtiMeta}>
                        <span className={styles.qtiCategory}>{state.currentItemInteractionType}</span>
                      </div>
                    )}
                    {state.currentItemUnsupportedTag && (
                      <div className={styles.qtiUnsupported}>
                        <p>This question's interaction type ("{unsupportedInteractionLabel(state.currentItemUnsupportedTag)}") isn't supported yet — you can continue to the next question.</p>
                      </div>
                    )}
                    <qti-assessment-item-player
                      ref={runner.itemPlayerRef}
                      style={state.currentItemUnsupportedTag ? { display: 'none' } : undefined}
                    />
                    {state.currentItemIsAdaptive && (
                      <div className={styles.qtiAdaptiveNext}>
                        <button type="button" className={styles.qtiAdaptiveNextBtn} disabled={state.isBtnNextDisabled} onClick={runner.handleAdvancePart}>
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {state.currentPanel === 'review' && (
            <>
              <QuestionNavBar
                currentItem={state.reviewIndex}
                maxItems={state.maxItems}
                isPreviousDisabled={state.reviewIndex === 0}
                isNextDisabled={state.reviewIndex + 1 === state.maxItems}
                showExit
                exitLabel="Back to assessment"
                onPrevious={runner.reviewPrevItem}
                onNext={runner.reviewNextItem}
                onFinish={() => {}}
                onExit={runner.exitReview}
              />
              <div className={styles.qtiContent}>
                <div className={`${styles.qtiCard} qti-card`}>
                  {state.currentStimuli.length > 0 && (
                    <div className={styles.qtiStimulusPanel}>
                      {state.currentStimuli.map((stim) => (
                        <StimulusMount
                          key={stim.identifier}
                          onReady={(player) => runner.handleStimulusPlayerReady(stim.identifier, player)}
                          onCatalogEvent={runner.handleStimulusCatalogEvent}
                        />
                      ))}
                    </div>
                  )}
                  <div className={`${styles.qtiItemPanel} qti-item-panel`}>
                    {state.currentItemInteractionType && (
                      <div className={styles.qtiMeta}>
                        <span className={styles.qtiCategory}>{state.currentItemInteractionType}</span>
                      </div>
                    )}
                    <qti-assessment-item-player ref={runner.itemPlayerRef} />
                  </div>
                </div>
              </div>
            </>
          )}

          {state.currentPanel === 'results' && (
            <ResultsScreen summary={runner.summary} onNavigateItem={runner.handleNavigateItem} onRestart={runner.handleRestart} />
          )}
        </div>

        <MobileSectionsDrawer
          open={state.drawerOpen}
          sections={runner.sectionsWithCounts}
          currentSectionId={runner.currentSectionId}
          onSectionJump={runner.onSectionJump}
          onClose={() => actions.setDrawerOpen(false)}
        />
      </div>

      <SubmitModal
        open={state.submitModalOpen}
        answeredCount={runner.answeredCount}
        totalCount={state.maxItems}
        onCancel={() => actions.setSubmitModalOpen(false)}
        onConfirm={runner.confirmSubmit}
      />

      {state.toast && <Toast type={state.toast.type} message={state.toast.message} onClose={() => actions.setToast(null)} />}
    </div>
  );
}
