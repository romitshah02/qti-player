import type { SessionControl } from '@/types';

export class SessionControlFactory {
  sc: SessionControl;

  constants = {
    TIME_LIMITS_DEFAULT: {
      min_time: null, // no limit
      max_time: null, // no limit
      allow_late_submission: false,
    },
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

  private assignIfPresent<T extends object>(
    target: T,
    source: Partial<Record<keyof T, T[keyof T] | null>>,
    keys: (keyof T)[],
    skipNull: boolean,
  ): void {
    for (const key of keys) {
      if (!(key in source)) continue;
      const value = source[key];
      if (skipNull && value === null) continue;
      target[key] = value as T[keyof T];
    }
  }

  setSessionControl(sc: Partial<SessionControl> | null | undefined): void {
    if (typeof sc === 'undefined') return;

    if (sc === null) {
      this.sc = this.defaultSessionControl();
      return;
    }

    this.assignIfPresent(
      this.sc,
      sc,
      ['allow_comment', 'allow_review', 'allow_skipping', 'max_attempts', 'show_feedback', 'show_solution', 'validate_responses'],
      true,
    );

    if (sc.time_limits) {
      this.assignIfPresent(this.sc.time_limits, sc.time_limits, ['min_time', 'max_time', 'allow_late_submission'], false);
    }
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