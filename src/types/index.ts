// Shared shapes crossing the old (array-based) and new (Record-based) attempt
// state representations. Kept intentionally loose (unknown, not a full QTI
// value union) — the values themselves are opaque to everything except the
// engine and response-processing.

export interface QtiVariable {
  identifier: string;
  value: unknown;
}

export interface QtiDiagnosticMessage {
  code?: string;
  severity?: string;
  message: string;
}

/** qti3-item-player's (and this app's own) legacy array-shaped attempt state. */
export interface LegacyAttemptState {
  guid?: string;
  identifier?: string;
  status: string;
  responseVariables: QtiVariable[];
  outcomeVariables: QtiVariable[];
  templateVariables?: QtiVariable[];
  interactionStates?: unknown;
  validationMessages: QtiDiagnosticMessage[];
}

/** @longsightgroup/qti3-player's Record-keyed QtiAttemptStateV1 shape. */
export interface QtiAttemptStateV1 {
  schema: string;
  itemIdentifier: string;
  status: string;
  responses: Record<string, unknown>;
  outcomes: Record<string, unknown>;
  templateValues?: Record<string, unknown>;
  interactionStates?: unknown;
  validationMessages: QtiDiagnosticMessage[];
}

export interface SessionControl {
  allow_comment: boolean;
  allow_review: boolean;
  allow_skipping: boolean;
  max_attempts: number;
  show_feedback: boolean;
  show_solution: boolean;
  time_limits: {
    min_time: number | null;
    max_time: number | null;
    allow_late_submission: boolean;
  };
  validate_responses: boolean;
}

/**
 * Per-item sessionControl override — camelCase, and a DIFFERENT shape than
 * the top-level (snake_case) SessionControl config: only these three fields
 * are ever overridden per-item.
 */
export interface ItemSessionControlOverride {
  validateResponses?: boolean;
  showFeedback?: boolean;
  submissionMode?: string;
}

export interface TestItem {
  identifier: string;
  guid: string;
  xml?: string;
  href?: string;
  stimulusRefs?: string[];
  sessionControl?: ItemSessionControlOverride;
  interactionType?: string;
}

export interface StimulusDescriptor {
  identifier: string;
  href: string;
}

export interface Section {
  identifier: string;
  name: string | null;
  blurb?: string;
  itemIdentifiers?: (string | null)[];
  answered?: number;
  total?: number;
}

export interface ItemSummaryEntry {
  identifier: string;
  index: number;
  answered: boolean;
}

export interface ConfigSection {
  identifier: string;
  name: string;
  blurb?: string;
  itemIdentifiers: string[];
}

/**
 * The single prop this app takes: everything about one test run. Items
 * carry either xml (used as-is) or href (fetched via ContentLoader).
 * context is the Sunbird TelemetryContext (uid, sid, channel, pdata, host,
 * etc.) — empty/omitted skips telemetry entirely.
 */
export interface RunnerConfig {
  title?: string;
  items: TestItem[];
  sections?: ConfigSection[];
  submissionMode?: string;
  sessionControl?: Partial<SessionControl>;
  pciContext?: unknown;
  previewUrl?: string;
  stimulusList?: StimulusDescriptor[];
  showSectionIntro?: boolean;
  context?: Record<string, unknown>;
}

export interface NavEvent {
  type: 'next' | 'previous' | 'goto' | 'end' | 'submit' | 'restart';
  currentItem: number;
  maxItems: number;
}

export type PlayerEvent =
  | { type: 'ready' }
  | { type: 'item-ready' }
  | { type: 'alert'; code?: string; severity?: string; message: string }
  | { type: 'catalog'; [key: string]: unknown }
  | { type: 'stimulus-catalog'; [key: string]: unknown };