import { describe, expect, it } from 'vitest';
import { TestControllerUtilities } from './test-controller';
import type { LegacyAttemptState, TestItem } from '@/types';

function makeState(responseVariables: LegacyAttemptState['responseVariables']): LegacyAttemptState {
  return { status: 'interacting', responseVariables, outcomeVariables: [], validationMessages: [] };
}

describe('TestControllerUtilities.isItemNullResponse', () => {
  const tc = new TestControllerUtilities();

  it('treats a missing/undefined state as unanswered', () => {
    expect(tc.isItemNullResponse(undefined)).toBe(true);
    expect(tc.isItemNullResponse(null)).toBe(true);
  });

  it('ignores built-in duration/numAttempts variables', () => {
    const state = makeState([
      { identifier: 'duration', value: 12.3 },
      { identifier: 'numAttempts', value: 1 },
      { identifier: 'RESPONSE', value: null },
    ]);
    expect(tc.isItemNullResponse(state)).toBe(true);
  });

  it('is answered once any non-built-in variable has a non-null value', () => {
    const state = makeState([{ identifier: 'RESPONSE', value: 'A' }]);
    expect(tc.isItemNullResponse(state)).toBe(false);
  });
});

describe('TestControllerUtilities.computeSummary', () => {
  it('reports per-item answered/unanswered against itemStates', () => {
    const tc = new TestControllerUtilities();
    const items: TestItem[] = [
      { identifier: 'item1', guid: 'g1' },
      { identifier: 'item2', guid: 'g2' },
    ];
    tc.setItems(items);
    tc.setItemStates(new Map([['g1', makeState([{ identifier: 'RESPONSE', value: 'A' }])]]));

    expect(tc.computeSummary()).toEqual([
      { identifier: 'item1', index: 0, answered: true },
      { identifier: 'item2', index: 1, answered: false },
    ]);
  });
});