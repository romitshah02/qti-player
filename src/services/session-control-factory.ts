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
      max_attempts: this.constants.ATTEMPTS_UNLIMITED,
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

    if ('allow_comment' in sc && sc.allow_comment !== null) this.setAllowComment(sc.allow_comment!);
    if ('allow_review' in sc && sc.allow_review !== null) this.setAllowReview(sc.allow_review!);
    if ('allow_skipping' in sc && sc.allow_skipping !== null) this.setAllowSkipping(sc.allow_skipping!);
    if ('max_attempts' in sc && sc.max_attempts !== null) this.setMaxAttempts(sc.max_attempts!);
    if ('show_feedback' in sc && sc.show_feedback !== null) this.setShowFeedback(sc.show_feedback!);
    if ('show_solution' in sc && sc.show_solution !== null) this.setShowSolution(sc.show_solution!);

    if (sc.time_limits) {
      if ('min_time' in sc.time_limits) this.setTimeLimitsMinTime(sc.time_limits.min_time);
      if ('max_time' in sc.time_limits) this.setTimeLimitsMaxTime(sc.time_limits.max_time);
      if ('allow_late_submission' in sc.time_limits) {
        this.setTimeLimitsAllowLateSubmission(sc.time_limits.allow_late_submission);
      }
    }

    if ('validate_responses' in sc && sc.validate_responses !== null) {
      this.setValidateResponses(sc.validate_responses!);
    }
  }

  getSessionControl(): SessionControl {
    return {
      allow_comment: this.getAllowComment(),
      allow_review: this.getAllowReview(),
      allow_skipping: this.getAllowSkipping(),
      max_attempts: this.getMaxAttempts(),
      show_feedback: this.getShowFeedback(),
      show_solution: this.getShowSolution(),
      time_limits: this.getTimeLimits(),
      validate_responses: this.getValidateResponses(),
    };
  }

  getAllowComment(): boolean {
    return this.sc.allow_comment;
  }

  setAllowComment(allow_comment: boolean): void {
    this.sc.allow_comment = allow_comment;
  }

  getAllowReview(): boolean {
    return this.sc.allow_review;
  }

  setAllowReview(allow_review: boolean): void {
    this.sc.allow_review = allow_review;
  }

  getAllowSkipping(): boolean {
    return this.sc.allow_skipping;
  }

  setAllowSkipping(allow_skipping: boolean): void {
    this.sc.allow_skipping = allow_skipping;
  }

  getMaxAttempts(): number {
    return this.sc.max_attempts;
  }

  setMaxAttempts(max_attempts: number): void {
    this.sc.max_attempts = max_attempts;
  }

  getShowFeedback(): boolean {
    return this.sc.show_feedback;
  }

  setShowFeedback(show_feedback: boolean): void {
    this.sc.show_feedback = show_feedback;
  }

  getShowSolution(): boolean {
    return this.sc.show_solution;
  }

  setShowSolution(show_solution: boolean): void {
    this.sc.show_solution = show_solution;
  }

  getTimeLimits(): SessionControl['time_limits'] {
    return this.sc.time_limits;
  }

  setTimeLimits(min_time: number | null = null, max_time: number | null = null, allow_late_submission = false): void {
    this.setTimeLimitsMinTime(min_time);
    this.setTimeLimitsMaxTime(max_time);
    this.setTimeLimitsAllowLateSubmission(allow_late_submission);
  }

  getTimeLimitsMinTime(): number | null {
    return this.sc.time_limits.min_time;
  }

  setTimeLimitsMinTime(min_time: number | null): void {
    this.sc.time_limits.min_time = min_time;
  }

  getTimeLimitsMaxTime(): number | null {
    return this.sc.time_limits.max_time;
  }

  setTimeLimitsMaxTime(max_time: number | null): void {
    this.sc.time_limits.max_time = max_time;
  }

  getTimeLimitsAllowLateSubmission(): boolean {
    return this.sc.time_limits.allow_late_submission;
  }

  setTimeLimitsAllowLateSubmission(allow_late_submission: boolean): void {
    this.sc.time_limits.allow_late_submission = allow_late_submission;
  }

  getValidateResponses(): boolean {
    return this.sc.validate_responses;
  }

  setValidateResponses(validate_responses: boolean): void {
    this.sc.validate_responses = validate_responses;
  }
}