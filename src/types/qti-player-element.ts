import type { LoadOptions } from '@/services/longsight-player-adapter';
import type { QtiAttemptStateV1, QtiDiagnosticMessage } from './index';

/**
 * The subset of @longsightgroup/qti3-player's <qti-assessment-item-player>
 * custom element this app actually calls/listens to. It's a framework-
 * neutral DOM element — this interface describes its imperative surface so
 * TypeScript can type a ref to it (real or, in tests, a mock implementing
 * the same shape).
 */
export interface QtiAssessmentItemPlayerElement extends HTMLElement {
  loadXml(xml: string, options?: LoadOptions): Promise<void>;
  endAttempt(): void;
  suspend(): void;
  reset(): void;
}

export interface QtiEndAttemptEventDetail {
  state: QtiAttemptStateV1;
}

export interface QtiValidationEventDetail {
  validationMessages: QtiDiagnosticMessage[];
  state: QtiAttemptStateV1;
}

export interface QtiDiagnosticsEventDetail {
  diagnostics: QtiDiagnosticMessage[];
}

export interface QtiCatalogRequestEventDetail {
  reference?: string;
  delivery?: unknown;
  activation?: unknown;
}
