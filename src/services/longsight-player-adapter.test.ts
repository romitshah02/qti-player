import { describe, expect, it } from 'vitest';
import { toLegacyState, toLoadOptions } from './longsight-player-adapter';
import type { LegacyAttemptState, QtiAttemptStateV1 } from '@/types';

describe('toLoadOptions', () => {
  it('maps legacy configuration to the engine LoadOptions shape', () => {
    const legacyState: LegacyAttemptState = {
      identifier: 'item1',
      status: 'interacting',
      responseVariables: [{ identifier: 'RESPONSE', value: 'A' }],
      outcomeVariables: [{ identifier: 'SCORE', value: 1 }],
      validationMessages: [],
    };
    const options = toLoadOptions({
      status: 'interacting',
      state: legacyState,
      sessionControl: { validate_responses: true, show_feedback: false },
    });
    expect(options.status).toBe('interacting');
    expect(options.state?.responses).toEqual({ RESPONSE: 'A' });
    expect(options.state?.outcomes).toEqual({ SCORE: 1 });
    expect(options.sessionControl).toEqual({ validateResponses: true, showFeedback: false });
  });

  it('maps the review status to the engine\'s completed status', () => {
    expect(toLoadOptions({ status: 'review' }).status).toBe('completed');
  });
});

describe('toLegacyState', () => {
  it('round-trips templateValues/interactionStates (regression: Monty Hall re-randomization on restore)', () => {
    const engineState: QtiAttemptStateV1 = {
      schema: 'qti3.attempt-state.v1',
      itemIdentifier: 'monty-hall',
      status: 'interacting',
      responses: { CHOICE: 'door1' },
      outcomes: { SCORE: 1 },
      templateValues: { PRIZEDOOR: 'door2' },
      interactionStates: { CHOICE: { touched: true } },
      validationMessages: [],
    };
    const legacy = toLegacyState(engineState, 'guid-123');
    expect(legacy.guid).toBe('guid-123');
    expect(legacy.templateVariables).toEqual([{ identifier: 'PRIZEDOOR', value: 'door2' }]);
    expect(legacy.interactionStates).toEqual({ CHOICE: { touched: true } });
  });
});