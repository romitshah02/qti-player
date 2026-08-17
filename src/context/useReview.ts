/**
 * Review panel — read-only revisit of answered items. Item-loading and
 * endOrSuspendAttempt come in as plain params (both built first). The one
 * back-edge (attempt-completion calling this module's openReview) is
 * handled on the caller's side via the same "latest ref" idiom as the
 * timer hooks.
 */
import type { RunnerState } from './QtiRunnerContext';
import * as TelemetryService from '@/services/telemetry-service';
import type { NavigationTarget } from '@/services/navigation-service';

export interface UseReviewOptions {
  state: RunnerState;
  actions: {
    setReviewIndex: (index: number) => void;
    updateButtonState: () => void;
  };
  loadReviewItemAtIndex: (index: number) => Promise<void>;
  switchToReviewAndLoad: (index: number) => void;
  switchToItemAndLoad: (index: number) => void;
  endOrSuspendAttempt: (target: NavigationTarget, navigationDirection: 'next' | 'prev' | 'goto' | null) => void;
}

export function useReview(options: UseReviewOptions) {
  const { state, actions, loadReviewItemAtIndex, switchToReviewAndLoad, switchToItemAndLoad, endOrSuspendAttempt } = options;

  function openReview() {
    switchToReviewAndLoad(0);
  }

  // Review is read-only, never finalizes — just saves the last item's
  // response first so Review can read it back.
  function handleReviewClick() {
    TelemetryService.logInteraction('review', state.currentItem);
    endOrSuspendAttempt('openReview', null);
  }

  function reviewTo(index: number) {
    actions.setReviewIndex(index);
    void loadReviewItemAtIndex(index);
  }

  function reviewPrevItem() {
    if (state.reviewIndex === 0) return;
    reviewTo(state.reviewIndex - 1);
  }

  function reviewNextItem() {
    if (state.reviewIndex + 1 === state.maxItems) return;
    reviewTo(state.reviewIndex + 1);
  }

  function exitReview() {
    switchToItemAndLoad(state.currentItem);
    actions.updateButtonState();
  }

  return {
    handleReviewClick,
    openReview,
    reviewPrevItem,
    reviewNextItem,
    exitReview,
  };
}