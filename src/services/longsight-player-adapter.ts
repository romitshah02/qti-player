import type { LegacyAttemptState, QtiAttemptStateV1, QtiVariable, SessionControl } from '@/types';

/**
 * Translates between this app's existing configuration/state shapes (array-
 * shaped state, snake_case sessionControl) and @longsightgroup/qti3-player's
 * QtiPlayerLoadOptions / QtiAttemptStateV1 shapes (Record-keyed state,
 * camelCase sessionControl), so the rest of the app doesn't need to know
 * which engine is loaded.
 *
 * status mapping: the engine's QtiAttemptStatus is
 * "initialized" | "interacting" | "suspended" | "completed" — no "review"
 * value. Mapped to "completed" as the closest read-only-disabled equivalent.
 */

const STATUS_MAP: Record<string, string> = {
  interacting: 'interacting',
  review: 'completed',
};

export interface Configuration {
  status: string;
  state?: LegacyAttemptState;
  sessionControl?: Partial<SessionControl>;
}

export interface LoadOptions {
  status: string;
  state?: QtiAttemptStateV1;
  sessionControl?: { validateResponses?: boolean; showFeedback?: boolean };
}

export function toLoadOptions(configuration: Configuration): LoadOptions {
  const options: LoadOptions = { status: STATUS_MAP[configuration.status] || configuration.status };

  if (configuration.state) options.state = toEngineState(configuration.state);

  if (configuration.sessionControl) {
    options.sessionControl = {
      validateResponses: configuration.sessionControl.validate_responses,
      showFeedback: configuration.sessionControl.show_feedback,
    };
  }

  return options;
}

export function toLegacyState(qtiAttemptState: QtiAttemptStateV1, guid?: string): LegacyAttemptState {
  return {
    guid,
    identifier: qtiAttemptState.itemIdentifier,
    status: qtiAttemptState.status,
    responseVariables: toVariableList(qtiAttemptState.responses),
    outcomeVariables: toVariableList(qtiAttemptState.outcomes),
    templateVariables: toVariableList(qtiAttemptState.templateValues),
    interactionStates: qtiAttemptState.interactionStates || undefined,
    validationMessages: qtiAttemptState.validationMessages || [],
  };
}

function toEngineState(legacyState: LegacyAttemptState): QtiAttemptStateV1 {
  return {
    schema: 'qti3.attempt-state.v1',
    itemIdentifier: legacyState.identifier!,
    status: STATUS_MAP[legacyState.status] || legacyState.status || 'interacting',
    responses: toRecord(legacyState.responseVariables),
    outcomes: toRecord(legacyState.outcomeVariables),
    templateValues: toRecord(legacyState.templateVariables),
    interactionStates: legacyState.interactionStates || undefined,
    validationMessages: legacyState.validationMessages || [],
  };
}

function toVariableList(record: Record<string, unknown> | undefined): QtiVariable[] {
  return Object.entries(record || {}).map(([identifier, value]) => ({ identifier, value }));
}

function toRecord(list: QtiVariable[] | undefined): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  (list || []).forEach(({ identifier, value }) => {
    record[identifier] = value;
  });
  return record;
}