import type { SessionControl } from '@/types';

export class SessionControlFactory {
  sc: SessionControl;

  constants = {
    TIME_LIMITS_DEFAULT: {
      min_time: null, // no limit
      max_time: null, // no limit
      allow_late_submission: false,
    },
    ATTEMPTS_UNLIMITED: 0,
  };

  constructor() {
    this.sc = this.defaultSessionControl();
  }

  defaultSessionControl(): SessionControl {
    return {
      allow_comment: false,
      allow_review: true,
      allow_skipping: true,
      max_attempts: 1,
      show_feedback: false,
      show_solution: false,
      time_limits: { ...this.constants.TIME_LIMITS_DEFAULT },
      // When true, blocks submission until all interactions have valid
      // responses. Only applies in individual submission mode.
      validate_responses: false,
    };
  }

  setSessionControl(sc: Partial<SessionControl> | null | undefined): void {
    if (typeof sc === 'undefined') return;

    if (sc === null) {
      this.sc = this.defaultSessionControl();
      return;
    }

    if ('allow_comment' in sc && sc.allow_comment !== null) this.sc.allow_comment = sc.allow_comment!;
    if ('allow_review' in sc && sc.allow_review !== null) this.sc.allow_review = sc.allow_review!;
    if ('allow_skipping' in sc && sc.allow_skipping !== null) this.sc.allow_skipping = sc.allow_skipping!;
    if ('max_attempts' in sc && sc.max_attempts !== null) this.sc.max_attempts = sc.max_attempts!;
    if ('show_feedback' in sc && sc.show_feedback !== null) this.sc.show_feedback = sc.show_feedback!;
    if ('show_solution' in sc && sc.show_solution !== null) this.sc.show_solution = sc.show_solution!;

    if (sc.time_limits) {
      if ('min_time' in sc.time_limits) this.sc.time_limits.min_time = sc.time_limits.min_time;
      if ('max_time' in sc.time_limits) this.sc.time_limits.max_time = sc.time_limits.max_time;
      if ('allow_late_submission' in sc.time_limits) {
        this.sc.time_limits.allow_late_submission = sc.time_limits.allow_late_submission;
      }
    }

    if ('validate_responses' in sc && sc.validate_responses !== null) this.sc.validate_responses = sc.validate_responses!;
  }

  getSessionControl(): SessionControl {
    return { ...this.sc };
  }

  getValidateResponses(): boolean {
    return this.sc.validate_responses;
  }

  getMaxAttempts(): number {
    return this.sc.max_attempts;
  }

  setValidateResponses(validate_responses: boolean): void {
    this.sc.validate_responses = validate_responses;
  }

  setShowFeedback(show_feedback: boolean): void {
    this.sc.show_feedback = show_feedback;
  }
}