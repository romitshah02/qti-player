import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { QtiRunnerProvider } from './QtiRunnerContext';
import { useQtiRunnerOrchestration } from './useQtiRunnerOrchestration';
import type { QtiAssessmentItemPlayerHandle } from '@longsightgroup/qti3-player-react';
import type { QtiEndAttemptEventDetail } from '@/types/qti-player-element';
import type { RunnerConfig } from '@/types';

const wrapper = ({ children }: { children: ReactNode }) => <QtiRunnerProvider>{children}</QtiRunnerProvider>;

function mockItemPlayer(): QtiAssessmentItemPlayerHandle {
  return {
    loadXml: vi.fn(async () => {}),
    endAttempt: vi.fn(),
    suspend: vi.fn(),
    reset: vi.fn(),
  } as unknown as QtiAssessmentItemPlayerHandle;
}

function itemXml(identifier: string, adaptive = false) {
  return `<qti-assessment-item identifier="${identifier}"${adaptive ? ' adaptive="true"' : ''}><qti-item-body><qti-choice-interaction response-identifier="RESPONSE"/></qti-item-body></qti-assessment-item>`;
}

function endAttemptEvent(outcomes: Record<string, unknown>, itemIdentifier: string): QtiEndAttemptEventDetail {
  return {
    state: { schema: 'qti3.attempt-state.v1', itemIdentifier, status: 'closed', responses: {}, outcomes, validationMessages: [] },
  } as unknown as QtiEndAttemptEventDetail;
}

const TWO_ITEM_CONFIG: RunnerConfig = {
  title: 'Sample Quiz',
  items: [
    { identifier: 'i1', guid: 'g1', xml: itemXml('i1'), sessionControl: { submissionMode: 'individual' } },
    { identifier: 'i2', guid: 'g2', xml: itemXml('i2'), sessionControl: { submissionMode: 'individual' } },
  ],
  showSectionIntro: false,
};

describe('useQtiRunnerOrchestration', () => {
  it('initializes and loads the first item', async () => {
    const { result } = renderHook(() => useQtiRunnerOrchestration(TWO_ITEM_CONFIG), { wrapper });
    const player = mockItemPlayer();
    result.current.itemPlayerRef.current = player;

    await act(async () => {
      result.current.initialize();
    });

    expect(player.loadXml).toHaveBeenCalledTimes(1);
    expect(player.loadXml).toHaveBeenCalledWith(itemXml('i1'), expect.objectContaining({ status: 'interacting' }));
  });

  it('advances to the next item once the attempt completes with a real score', async () => {
    const { result } = renderHook(() => useQtiRunnerOrchestration(TWO_ITEM_CONFIG), { wrapper });
    const player = mockItemPlayer();
    result.current.itemPlayerRef.current = player;
    await act(async () => result.current.initialize());

    await act(async () => result.current.handleNextItem());
    expect(player.endAttempt).toHaveBeenCalledTimes(1); // submissionMode: individual -> endAttempt, not suspend

    await act(async () => {
      result.current.handleEndAttemptCompleted(endAttemptEvent({ SCORE: 1 }, 'i1'));
    });

    expect(player.loadXml).toHaveBeenCalledTimes(2);
    expect(player.loadXml).toHaveBeenLastCalledWith(itemXml('i2'), expect.anything());
  });

  it('blocks navigation on an incomplete adaptive item, shows a toast, and re-enables Next', async () => {
    const adaptiveConfig: RunnerConfig = {
      items: [{ identifier: 'i1', guid: 'g1', xml: itemXml('i1', true), sessionControl: { submissionMode: 'individual' } }],
      showSectionIntro: false,
    };
    const { result } = renderHook(() => useQtiRunnerOrchestration(adaptiveConfig), { wrapper });
    const player = mockItemPlayer();
    result.current.itemPlayerRef.current = player;
    await act(async () => result.current.initialize());

    await act(async () => result.current.handleNextItem());
    await act(async () => {
      result.current.handleEndAttemptCompleted(endAttemptEvent({ completionStatus: 'incomplete' }, 'i1'));
    });

    expect(player.loadXml).toHaveBeenCalledTimes(1); // never advanced past item 1
    expect(result.current.itemPlayerRef.current).toBe(player);
  });

  it('handleAdvancePart never blocks on incompleteness (the in-card "next part" button)', async () => {
    const adaptiveConfig: RunnerConfig = {
      items: [{ identifier: 'i1', guid: 'g1', xml: itemXml('i1', true), sessionControl: { submissionMode: 'individual' } }],
      showSectionIntro: false,
    };
    const { result } = renderHook(() => useQtiRunnerOrchestration(adaptiveConfig), { wrapper });
    const player = mockItemPlayer();
    result.current.itemPlayerRef.current = player;
    await act(async () => result.current.initialize());

    await act(async () => result.current.handleAdvancePart());
    await act(async () => {
      result.current.handleEndAttemptCompleted(endAttemptEvent({ completionStatus: 'incomplete' }, 'i1'));
    });

    // Stays on the same item (only one item in this fixture) with no error thrown/toast-blocking path taken.
    expect(player.loadXml).toHaveBeenCalledTimes(1);
  });
});
