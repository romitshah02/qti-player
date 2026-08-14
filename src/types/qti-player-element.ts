import type { QtiAttemptStateV1, QtiDiagnosticMessage } from './index';

export type { QtiCatalogRequestEventDetail } from '@longsightgroup/qti3-player';

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
