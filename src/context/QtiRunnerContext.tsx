/**
 * QtiRunnerContext — owns the runner's pure UI/data state: which panel is
 * showing, current/review item index, per-item display metadata, and
 * transient UI (drawer/modal/toast open state). Long-lived service
 * instances (TestControllerUtilities, ContentLoader, PnpFactory,
 * SessionControlFactory) and the item-player ref are NOT here — they're
 * mutable, non-rendered, and held in refs by useQtiRunnerOrchestration
 * instead (putting a mutable class instance through a reducer buys nothing).
 */
import { createContext, useCallback, useMemo, useReducer } from 'react';
import type { Dispatch, ReactNode } from 'react';
import type { ResolvedStimulus } from '@/services/content-loader';
import type { FlattenedSection } from '@/utils/test-xml-parser';

export type Panel = 'item' | 'review' | 'results' | 'section-intro';

export interface Toast {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface RunnerState {
  testTitle: string;
  currentPanel: Panel;
  currentItem: number;
  maxItems: number;
  reviewIndex: number;
  pendingItemIndex: number | null;
  isBtnPreviousDisabled: boolean;
  isBtnNextDisabled: boolean;
  sections: FlattenedSection[];
  currentItemInteractionType: string | null;
  currentItemIsAdaptive: boolean;
  currentItemUnsupportedTag: string | null;
  drawerOpen: boolean;
  submitModalOpen: boolean;
  toast: Toast | null;
  currentStimuli: ResolvedStimulus[];
}

export const initialState: RunnerState = {
  testTitle: '',
  currentPanel: 'item',
  currentItem: -1,
  maxItems: 0,
  reviewIndex: 0,
  pendingItemIndex: null,
  isBtnPreviousDisabled: true,
  isBtnNextDisabled: true,
  sections: [],
  currentItemInteractionType: null,
  currentItemIsAdaptive: false,
  currentItemUnsupportedTag: null,
  drawerOpen: false,
  submitModalOpen: false,
  toast: null,
  currentStimuli: [],
};

export const RunnerActionTypes = {
  INITIALIZE: 'INITIALIZE',
  SET_PANEL: 'SET_PANEL',
  SET_CURRENT_ITEM: 'SET_CURRENT_ITEM',
  SET_REVIEW_INDEX: 'SET_REVIEW_INDEX',
  SET_PENDING_ITEM_INDEX: 'SET_PENDING_ITEM_INDEX',
  SET_BUTTON_DISABLED: 'SET_BUTTON_DISABLED',
  UPDATE_BUTTON_STATE: 'UPDATE_BUTTON_STATE',
  SET_ITEM_META: 'SET_ITEM_META',
  SET_STIMULI: 'SET_STIMULI',
  SET_DRAWER_OPEN: 'SET_DRAWER_OPEN',
  SET_SUBMIT_MODAL_OPEN: 'SET_SUBMIT_MODAL_OPEN',
  SET_TOAST: 'SET_TOAST',
  RESTART: 'RESTART',
} as const;

export type RunnerAction =
  | { type: typeof RunnerActionTypes.INITIALIZE; payload: { testTitle: string; maxItems: number; sections: FlattenedSection[] } }
  | { type: typeof RunnerActionTypes.SET_PANEL; payload: Panel }
  | { type: typeof RunnerActionTypes.SET_CURRENT_ITEM; payload: number }
  | { type: typeof RunnerActionTypes.SET_REVIEW_INDEX; payload: number }
  | { type: typeof RunnerActionTypes.SET_PENDING_ITEM_INDEX; payload: number | null }
  | { type: typeof RunnerActionTypes.SET_BUTTON_DISABLED; payload: { which: 'next' | 'prev'; disabled: boolean } }
  | { type: typeof RunnerActionTypes.UPDATE_BUTTON_STATE }
  | { type: typeof RunnerActionTypes.SET_ITEM_META; payload: { interactionType: string | null; isAdaptive: boolean; unsupportedTag: string | null } }
  | { type: typeof RunnerActionTypes.SET_STIMULI; payload: ResolvedStimulus[] }
  | { type: typeof RunnerActionTypes.SET_DRAWER_OPEN; payload: boolean }
  | { type: typeof RunnerActionTypes.SET_SUBMIT_MODAL_OPEN; payload: boolean }
  | { type: typeof RunnerActionTypes.SET_TOAST; payload: Toast | null }
  | { type: typeof RunnerActionTypes.RESTART };

export function runnerReducer(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case RunnerActionTypes.INITIALIZE:
      return {
        ...initialState,
        testTitle: action.payload.testTitle,
        maxItems: action.payload.maxItems,
        sections: action.payload.sections,
        currentItem: 0,
      };

    case RunnerActionTypes.SET_PANEL:
      return { ...state, currentPanel: action.payload };

    case RunnerActionTypes.SET_CURRENT_ITEM:
      return { ...state, currentItem: action.payload };

    case RunnerActionTypes.SET_REVIEW_INDEX:
      return { ...state, reviewIndex: action.payload };

    case RunnerActionTypes.SET_PENDING_ITEM_INDEX:
      return { ...state, pendingItemIndex: action.payload };

    case RunnerActionTypes.SET_BUTTON_DISABLED:
      return action.payload.which === 'next'
        ? { ...state, isBtnNextDisabled: action.payload.disabled }
        : { ...state, isBtnPreviousDisabled: action.payload.disabled };

    case RunnerActionTypes.UPDATE_BUTTON_STATE:
      return { ...state, isBtnNextDisabled: false, isBtnPreviousDisabled: state.currentItem === 0 };

    case RunnerActionTypes.SET_ITEM_META:
      return {
        ...state,
        currentItemInteractionType: action.payload.interactionType,
        currentItemIsAdaptive: action.payload.isAdaptive,
        currentItemUnsupportedTag: action.payload.unsupportedTag,
      };

    case RunnerActionTypes.SET_STIMULI:
      return { ...state, currentStimuli: action.payload };

    case RunnerActionTypes.SET_DRAWER_OPEN:
      return { ...state, drawerOpen: action.payload };

    case RunnerActionTypes.SET_SUBMIT_MODAL_OPEN:
      return { ...state, submitModalOpen: action.payload };

    case RunnerActionTypes.SET_TOAST:
      return { ...state, toast: action.payload };

    case RunnerActionTypes.RESTART:
      return {
        ...state,
        currentItem: 0,
        currentPanel: 'item',
        pendingItemIndex: null,
        drawerOpen: false,
        submitModalOpen: false,
        toast: null,
      };

    default:
      return state;
  }
}

export interface QtiRunnerContextValue {
  state: RunnerState;
  dispatch: Dispatch<RunnerAction>;
  initialize: (payload: { testTitle: string; maxItems: number; sections: FlattenedSection[] }) => void;
  setPanel: (panel: Panel) => void;
  setCurrentItem: (index: number) => void;
  setReviewIndex: (index: number) => void;
  setPendingItemIndex: (index: number | null) => void;
  setButtonDisabled: (which: 'next' | 'prev', disabled: boolean) => void;
  updateButtonState: () => void;
  setItemMeta: (meta: { interactionType: string | null; isAdaptive: boolean; unsupportedTag: string | null }) => void;
  setStimuli: (stimuli: ResolvedStimulus[]) => void;
  setDrawerOpen: (open: boolean) => void;
  setSubmitModalOpen: (open: boolean) => void;
  setToast: (toast: Toast | null) => void;
  restart: () => void;
}

export const QtiRunnerContext = createContext<QtiRunnerContextValue | null>(null);

interface QtiRunnerProviderProps {
  children: ReactNode;
}

export function QtiRunnerProvider({ children }: QtiRunnerProviderProps) {
  const [state, dispatch] = useReducer(runnerReducer, initialState);

  const initialize = useCallback((payload: { testTitle: string; maxItems: number; sections: FlattenedSection[] }) => {
    dispatch({ type: RunnerActionTypes.INITIALIZE, payload });
  }, []);
  const setPanel = useCallback((panel: Panel) => dispatch({ type: RunnerActionTypes.SET_PANEL, payload: panel }), []);
  const setCurrentItem = useCallback((index: number) => dispatch({ type: RunnerActionTypes.SET_CURRENT_ITEM, payload: index }), []);
  const setReviewIndex = useCallback((index: number) => dispatch({ type: RunnerActionTypes.SET_REVIEW_INDEX, payload: index }), []);
  const setPendingItemIndex = useCallback((index: number | null) => dispatch({ type: RunnerActionTypes.SET_PENDING_ITEM_INDEX, payload: index }), []);
  const setButtonDisabled = useCallback(
    (which: 'next' | 'prev', disabled: boolean) => dispatch({ type: RunnerActionTypes.SET_BUTTON_DISABLED, payload: { which, disabled } }),
    [],
  );
  const updateButtonState = useCallback(() => dispatch({ type: RunnerActionTypes.UPDATE_BUTTON_STATE }), []);
  const setItemMeta = useCallback(
    (meta: { interactionType: string | null; isAdaptive: boolean; unsupportedTag: string | null }) =>
      dispatch({ type: RunnerActionTypes.SET_ITEM_META, payload: meta }),
    [],
  );
  const setStimuli = useCallback((stimuli: ResolvedStimulus[]) => dispatch({ type: RunnerActionTypes.SET_STIMULI, payload: stimuli }), []);
  const setDrawerOpen = useCallback((open: boolean) => dispatch({ type: RunnerActionTypes.SET_DRAWER_OPEN, payload: open }), []);
  const setSubmitModalOpen = useCallback((open: boolean) => dispatch({ type: RunnerActionTypes.SET_SUBMIT_MODAL_OPEN, payload: open }), []);
  const setToast = useCallback((toast: Toast | null) => dispatch({ type: RunnerActionTypes.SET_TOAST, payload: toast }), []);
  const restart = useCallback(() => dispatch({ type: RunnerActionTypes.RESTART }), []);

  const value = useMemo<QtiRunnerContextValue>(
    () => ({
      state,
      dispatch,
      initialize,
      setPanel,
      setCurrentItem,
      setReviewIndex,
      setPendingItemIndex,
      setButtonDisabled,
      updateButtonState,
      setItemMeta,
      setStimuli,
      setDrawerOpen,
      setSubmitModalOpen,
      setToast,
      restart,
    }),
    [state, initialize, setPanel, setCurrentItem, setReviewIndex, setPendingItemIndex, setButtonDisabled, updateButtonState, setItemMeta, setStimuli, setDrawerOpen, setSubmitModalOpen, setToast, restart],
  );

  return <QtiRunnerContext.Provider value={value}>{children}</QtiRunnerContext.Provider>;
}
