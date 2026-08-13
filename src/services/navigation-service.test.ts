import { describe, expect, it } from 'vitest';
import {
  computeItemSubmissionMode,
  computeSummaryBreakdown,
  computeTotalScore,
  isInvalidResponses,
  isSkipResponse,
  resolveNavigationOutcome,
} from './navigation-service';
import { TestControllerUtilities } from './test-controller';
import type { NavigationContext } from './navigation-service';
import type { LegacyAttemptState, TestItem } from '@/types';

function state(overrides: Partial<LegacyAttemptState> = {}): LegacyAttemptState {
  return { status: 'interacting', responseVariables: [], outcomeVariables: [], validationMessages: [], ...overrides };
}

function ctx(overrides: Partial<NavigationContext> = {}): NavigationContext {
  return { validateResponses: false, ...overrides };
}

describe('isSkipResponse', () => {
  it('detects the SKIP response regardless of boolean vs string true', () => {
    expect(isSkipResponse([{ identifier: 'SKIP', value: true }])).toBe(true);
    expect(isSkipResponse([{ identifier: 'SKIP', value: 'true' }])).toBe(true);
    expect(isSkipResponse([{ identifier: 'SKIP', value: false }])).toBe(false);
    expect(isSkipResponse([{ identifier: 'RESPONSE', value: 'A' }])).toBe(false);
  });
});

describe('isInvalidResponses', () => {
  it('only blocks when validation is on AND there are messages', () => {
    expect(isInvalidResponses([{ message: 'bad' }], false)).toBe(false);
    expect(isInvalidResponses([], true)).toBe(false);
    expect(isInvalidResponses([{ message: 'bad' }], true)).toBe(true);
  });
});

describe('resolveNavigationOutcome', () => {
  it('advancePart always proceeds as advancePart, regardless of completeness', () => {
    const s = state({ outcomeVariables: [{ identifier: 'completionStatus', value: 'incomplete' }] });
    expect(resolveNavigationOutcome('advancePart', s, ctx())).toEqual({ action: 'advancePart' });
  });

  it('openReview never blocks on incompleteness', () => {
    const s = state({ outcomeVariables: [{ identifier: 'completionStatus', value: 'incomplete' }] });
    expect(resolveNavigationOutcome('openReview', s, ctx())).toEqual({ action: 'proceed' });
  });

  it('navigateNextItem no longer blocks on an incomplete adaptive item — same as any other item', () => {
    const s = state({ outcomeVariables: [{ identifier: 'completionStatus', value: 'incomplete' }] });
    expect(resolveNavigationOutcome('navigateNextItem', s, ctx())).toEqual({ action: 'proceed' });
  });

  it('navigateNextItem blocks on validation messages when validateResponses is on', () => {
    const s = state({ validationMessages: [{ message: 'RESPONSE is required' }] });
    expect(resolveNavigationOutcome('navigateNextItem', s, ctx({ validateResponses: true }))).toEqual({
      action: 'blocked',
      reason: 'invalid-responses',
      message: 'RESPONSE is required',
    });
  });

  it('navigateNextItem proceeds when complete and valid', () => {
    const s = state();
    expect(resolveNavigationOutcome('navigateNextItem', s, ctx({ validateResponses: true }))).toEqual({ action: 'proceed' });
  });

  it('a null target (item-internal end-attempt-interaction) resolves to skip or endAttemptInteraction', () => {
    const skipState = state({ responseVariables: [{ identifier: 'SKIP', value: true }] });
    expect(resolveNavigationOutcome(null, skipState, ctx())).toEqual({ action: 'skip' });

    const hintState = state({ responseVariables: [{ identifier: 'HINT_REQUESTED', value: true }] });
    expect(resolveNavigationOutcome(null, hintState, ctx())).toEqual({ action: 'endAttemptInteraction' });
  });
});

describe('computeTotalScore', () => {
  it('sums SCORE across all item states, treating missing/NaN as 0', () => {
    const itemStates = new Map<string, LegacyAttemptState>([
      ['g1', state({ outcomeVariables: [{ identifier: 'SCORE', value: 1 }] })],
      ['g2', state({ outcomeVariables: [{ identifier: 'SCORE', value: 0 }] })],
      ['g3', state()], // no SCORE outcome at all
    ]);
    expect(computeTotalScore(itemStates)).toBe(1);
  });
});

describe('computeSummaryBreakdown', () => {
  it('classifies each item as correct, wrong, or skipped', () => {
    const items: TestItem[] = [{ identifier: 'i1', guid: 'g1' }, { identifier: 'i2', guid: 'g2' }, { identifier: 'i3', guid: 'g3' }];
    const TC = new TestControllerUtilities();
    TC.setItems(items);
    TC.setItemStates(new Map([
      ['g1', state({ responseVariables: [{ identifier: 'RESPONSE', value: 'A' }], outcomeVariables: [{ identifier: 'SCORE', value: 1 }] })],
      ['g2', state({ responseVariables: [{ identifier: 'RESPONSE', value: 'B' }], outcomeVariables: [{ identifier: 'SCORE', value: 0 }] })],
      // g3 has no state at all -> skipped
    ]));

    expect(computeSummaryBreakdown(items, TC, 1)).toEqual({ correct: 1, wrong: 1, partial: 0, skipped: 1, score: 1 });
  });
});

describe('computeItemSubmissionMode', () => {
  it("falls back to the test's submission mode when the item doesn't override it", () => {
    expect(computeItemSubmissionMode({ identifier: 'i1', guid: 'g1' }, 'simultaneous')).toBe('simultaneous');
    expect(computeItemSubmissionMode({ identifier: 'i1', guid: 'g1', sessionControl: { submissionMode: 'individual' } }, 'simultaneous')).toBe('individual');
  });
});
