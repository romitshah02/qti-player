import { describe, expect, it } from 'vitest';
import { TestControllerUtilities } from './test-controller';
import type { LegacyAttemptState } from '@/types';

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