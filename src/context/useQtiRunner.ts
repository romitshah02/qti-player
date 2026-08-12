import { useContext } from 'react';
import { QtiRunnerContext } from './QtiRunnerContext';
import type { QtiRunnerContextValue, RunnerState } from './QtiRunnerContext';

export function useQtiRunner(): QtiRunnerContextValue {
  const context = useContext(QtiRunnerContext);
  if (!context) {
    throw new Error('useQtiRunner must be used within QtiRunnerProvider');
  }
  return context;
}

/** useQtiRunnerState — when you only need state (not dispatch or actions). */
export function useQtiRunnerState(): RunnerState {
  const { state } = useQtiRunner();
  return state;
}

/** useQtiRunnerActions — when you only need actions (not state). */
export function useQtiRunnerActions() {
  const context = useQtiRunner();
  return {
    initialize: context.initialize,
    setPanel: context.setPanel,
    setCurrentItem: context.setCurrentItem,
    setReviewIndex: context.setReviewIndex,
    setPendingItemIndex: context.setPendingItemIndex,
    setButtonDisabled: context.setButtonDisabled,
    updateButtonState: context.updateButtonState,
    setItemMeta: context.setItemMeta,
    setStimuli: context.setStimuli,
    setDrawerOpen: context.setDrawerOpen,
    setSubmitModalOpen: context.setSubmitModalOpen,
    setToast: context.setToast,
    restart: context.restart,
  };
}
