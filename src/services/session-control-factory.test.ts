import { describe, expect, it } from 'vitest';
import { SessionControlFactory } from './session-control-factory';

describe('SessionControlFactory', () => {
  it('defaults to unlimited attempts, no validation, no time limit', () => {
    const scf = new SessionControlFactory();
    expect(scf.getSessionControl()).toEqual({
      allow_comment: false,
      allow_review: true,
      allow_skipping: true,
      max_attempts: 0,
      show_feedback: false,
      show_solution: false,
      time_limits: { min_time: null, max_time: null, allow_late_submission: false },
      validate_responses: false,
    });
  });

  it('applies a partial update without resetting unspecified fields', () => {
    const scf = new SessionControlFactory();
    scf.setSessionControl({ validate_responses: true, time_limits: { max_time: 600 } as never });
    expect(scf.getValidateResponses()).toBe(true);
    expect(scf.getSessionControl().time_limits.max_time).toBe(600);
    expect(scf.getSessionControl().allow_review).toBe(true); // untouched field keeps its default
  });
});