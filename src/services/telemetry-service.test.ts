import { describe, expect, it } from 'vitest';
import { logInteraction, subscribeTelemetry } from './telemetry-service';

// Without a real EkTelemetry/CS SDK context, dispatch still emits to local
// subscribers (used by the app's own telemetry-event listeners) — only the
// SDK delivery path is skipped.
describe('subscribeTelemetry', () => {
  it('notifies subscribers of a locally-built event even with no SDK present', () => {
    const events: Array<{ eid: string }> = [];
    const unsubscribe = subscribeTelemetry((event) => events.push(event));

    logInteraction('choice-a', 3);

    expect(events).toHaveLength(1);
    expect(events[0].eid).toBe('INTERACT');
    unsubscribe();

    logInteraction('choice-b', 4);
    expect(events).toHaveLength(1); // no longer subscribed
  });
});