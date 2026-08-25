import { useEffect } from 'react';
import { QtiAssessmentItemPlayer } from '@longsightgroup/qti3-player-react';
import { QtiRunnerProvider } from '@/context/QtiRunnerContext';
import { useQtiRunner } from '@/context/useQtiRunner';
import { useQtiRunnerOrchestration } from '@/context/useQtiRunnerOrchestration';
import { mountDockedStimulusPlayer } from '@/services/stimulus-player-mount';
import { PlayerHeader } from '../PlayerHeader/PlayerHeader';
import { Sidebar } from '../Sidebar/Sidebar';
import { MobileSectionsDrawer } from '../MobileSectionsDrawer/MobileSectionsDrawer';
import { QuestionNavBar } from '../QuestionNavBar/QuestionNavBar';
import { AssessmentIntro } from '../AssessmentIntro/AssessmentIntro';
import { SectionIntro } from '../SectionIntro/SectionIntro';
import { SubmitModal } from '../SubmitModal/SubmitModal';
import { Toast } from '../Toast/Toast';
import { ResultsScreen } from '../ResultsScreen/ResultsScreen';
import { StimulusMount } from '../StimulusMount/StimulusMount';
import type { NavEvent, PlayerEvent, RunnerConfig } from '@/types';
import styles from './TestRunner.module.scss';

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
  const { state, ...actions } = useQtiRunner();
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
    if (config.derivedMetadata) {
      onPlayerEvent?.({ type: 'derived-metadata', ...config.derivedMetadata });
    }
    runner.initialize();
    // Mount-only — config is the one prop this app takes and isn't expected
    // to change after mount (matches the original's mounted()-only initialize).
  }, []);

  return (
    <div className={styles.appShell}>
      {state.currentPanel !== 'results' && state.currentPanel !== 'assessment-intro' && (
        <PlayerHeader
          brandName={state.testTitle}
          sections={runner.sectionsWithCounts}
          currentSectionId={runner.currentSectionId}
          currentItem={state.currentItem}
          maxItems={state.maxItems}
          reviewEnabled={runner.isLastItem && state.currentPanel === 'item'}
          testTimeRemaining={runner.testTimeRemaining}
          sectionTimeRemaining={runner.sectionTimeRemaining}
          sectionTimeOverrun={runner.sectionTimeOverrun}
          onMenuToggle={() => actions.setDrawerOpen(true)}
          onBrandClick={runner.handleGoToAssessmentIntro}
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

        {state.currentPanel === 'review' && (
          <div className={styles.sidebarRail}>
            <Sidebar sections={runner.sectionsWithCounts} currentSectionId={runner.currentReviewSectionId} onSectionJump={runner.onSectionJump} />
          </div>
        )}

        <div className={styles.main}>
          {state.currentPanel === 'assessment-intro' && (
            <AssessmentIntro
              title={state.testTitle}
              totalQuestions={state.maxItems}
              sections={runner.sectionsWithCounts}
              timeLimitSeconds={config.timeLimitSeconds}
              maxAttempts={config.sessionControl?.max_attempts}
              onBegin={runner.handleBeginAssessment}
              onSectionSelect={runner.handleBeginAssessmentAtSection}
            />
          )}

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
                    <QtiAssessmentItemPlayer
                      // Vue (a dependency of the qti3-stimulus-player island) ships a global
                      // JSX namespace augmentation that merges into React's own project-wide,
                      // forcing every forwardRef component's ref prop into an intersection
                      // with Vue's callback-shaped VNodeRef that no real ref value satisfies.
                      ref={runner.itemPlayerRef as any}
                      style={state.currentItemUnsupportedTag ? { display: 'none' } : undefined}
                      onReady={runner.handleItemReady}
                      onSuspend={runner.handleSuspendAttemptCompleted}
                      onEndAttempt={runner.handleEndAttemptCompleted}
                      onValidation={runner.handleValidationEvent}
                      onDiagnostics={runner.displayItemAlertEvent}
                      onCatalogRequest={runner.handleItemCatalogEvent}
                    />
                    {(state.currentItemIsAdaptive || state.currentItemHasFeedback) && (
                      <div className={styles.qtiAdaptiveNext}>
                        <button type="button" className={styles.qtiAdaptiveNextBtn} disabled={state.isBtnNextDisabled} onClick={runner.handleAdvancePart}>
                          Check
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
                    <QtiAssessmentItemPlayer ref={runner.itemPlayerRef as any} onReady={runner.handleItemReady} />
                  </div>
                </div>
              </div>
            </>
          )}

          {state.currentPanel === 'results' && (
            <ResultsScreen
              breakdown={runner.breakdown}
              timeTakenSeconds={runner.timeTakenSeconds}
              attemptsRemaining={runner.attemptsRemaining}
              onRestart={runner.handleRestart}
            />
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
