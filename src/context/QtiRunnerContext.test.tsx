import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { QtiRunnerProvider, initialState, runnerReducer, RunnerActionTypes } from './QtiRunnerContext';
import { useQtiRunner } from './useQtiRunner';

const wrapper = ({ children }: { children: ReactNode }) => <QtiRunnerProvider>{children}</QtiRunnerProvider>;

describe('runnerReducer', () => {
  it('INITIALIZE resets to a fresh run at item 0 with the given title/sections', () => {
    const sections = [{ identifier: 'sec1', name: 'A', blurb: '', itemIdentifiers: ['i1'] }];
    const next = runnerReducer(initialState, { type: RunnerActionTypes.INITIALIZE, payload: { testTitle: 'Quiz', maxItems: 3, sections } });
    expect(next.currentItem).toBe(0);
    expect(next.maxItems).toBe(3);
    expect(next.testTitle).toBe('Quiz');
    expect(next.sections).toBe(sections);
  });

  it('UPDATE_BUTTON_STATE disables Previous only at item 0', () => {
    const atStart = runnerReducer({ ...initialState, currentItem: 0 }, { type: RunnerActionTypes.UPDATE_BUTTON_STATE });
    expect(atStart.isBtnPreviousDisabled).toBe(true);
    expect(atStart.isBtnNextDisabled).toBe(false);

    const midway = runnerReducer({ ...initialState, currentItem: 2 }, { type: RunnerActionTypes.UPDATE_BUTTON_STATE });
    expect(midway.isBtnPreviousDisabled).toBe(false);
  });

  it('RESTART returns to item 0/panel item and clears transient UI, but not maxItems/sections', () => {
    const dirty = { ...initialState, currentItem: 4, maxItems: 6, currentPanel: 'results' as const, drawerOpen: true, toast: { type: 'error' as const, message: 'x' } };
    const next = runnerReducer(dirty, { type: RunnerActionTypes.RESTART });
    expect(next.currentItem).toBe(0);
    expect(next.currentPanel).toBe('item');
    expect(next.drawerOpen).toBe(false);
    expect(next.toast).toBeNull();
    expect(next.maxItems).toBe(6); // untouched
  });
});

describe('useQtiRunner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when used outside QtiRunnerProvider', () => {
    // Suppress React's expected error log for this render.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useQtiRunner())).toThrow('useQtiRunner must be used within QtiRunnerProvider');
  });

  it('dispatches through action creators and reflects the new state', () => {
    const { result } = renderHook(() => useQtiRunner(), { wrapper });

    act(() => result.current.setPanel('review'));
    expect(result.current.state.currentPanel).toBe('review');

    act(() => result.current.setToast({ type: 'error', message: 'nope' }));
    expect(result.current.state.toast).toEqual({ type: 'error', message: 'nope' });
  });
});
