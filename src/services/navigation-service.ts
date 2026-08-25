import { scoreQtiItemServerSide } from '@longsightgroup/qti3-core';
import type { LegacyAttemptState, QtiDiagnosticMessage, QtiVariable, TestItem } from '@/types';
import type { ContentLoader } from './content-loader';
import type { TestControllerUtilities } from './test-controller';

export type NavigationTarget =
  | 'advancePart'
  | 'navigateNextItem'
  | 'navigatePrevItem'
  | 'navigateItem'
  | 'navigateEnd'
  | 'openReview'
  | 'sectionTimeExpired'
  | 'testTimeExpired'
  | null;

export interface NavigationDecision {
  action: 'advancePart' | 'blocked' | 'proceed' | 'skip' | 'endAttemptInteraction';
  reason?: 'invalid-responses';
  message?: string;
}

/** Any item-internal end-attempt-interaction (Skip, Hint, Show Solution...)
 * fires with a null target — the engine can't tell them apart, so only
 * advance for our own "SKIP" item. */
export function isSkipResponse(responseVariables: QtiVariable[]): boolean {
  return responseVariables.some((variable) => variable.identifier === 'SKIP' && (variable.value === true || variable.value === 'true'));
}

export function isInvalidResponses(validationMessages: QtiDiagnosticMessage[], validateResponses: boolean): boolean {
  if (!validateResponses) return false;
  return validationMessages.length > 0;
}

export interface NavigationContext {
  validateResponses: boolean;
}

/**
 * Decide what a completed attempt should do next, given the target that
 * triggered it. Pure — callers own the actual navigation (which function to
 * invoke) and any UI side effects (toast, re-enabling a button); this only
 * decides proceed/blocked/skip/etc. and, when blocked, why.
 */
export function resolveNavigationOutcome(target: NavigationTarget, state: LegacyAttemptState, ctx: NavigationContext): NavigationDecision {
  if (target === 'advancePart') return { action: 'advancePart' };
  if (target === 'openReview') return { action: 'proceed' }; // read-only, never blocked by incompleteness
  if (target === 'sectionTimeExpired' || target === 'testTimeExpired') return { action: 'proceed' };

  if (target === 'navigateNextItem' || target === 'navigatePrevItem' || target === 'navigateItem' || target === 'navigateEnd') {
    if (isInvalidResponses(state.validationMessages, ctx.validateResponses)) {
      return { action: 'blocked', reason: 'invalid-responses', message: state.validationMessages[0]?.message };
    }
    return { action: 'proceed' };
  }

  // target === null: an item-internal end-attempt-interaction.
  if (isSkipResponse(state.responseVariables)) return { action: 'skip' };
  return { action: 'endAttemptInteraction' };
}

// MAXSCORE is a QTI 3 built-in outcome (spec-defined alongside SCORE), but
// nothing requires items to declare it — callers default to 1 when absent.
export function getOutcomeValue(state: LegacyAttemptState | undefined, identifier: string, fallback: number): number {
  const outcomeVar = state?.outcomeVariables.find((v) => v.identifier === identifier);
  return outcomeVar ? Number(outcomeVar.value) || fallback : fallback;
}

export function computeTotalScore(itemStates: Map<string, LegacyAttemptState>): number {
  let total = 0;
  itemStates.forEach((state) => {
    const score = getOutcomeValue(state, 'SCORE', 0);
    const maxScore = getOutcomeValue(state, 'MAXSCORE', 1);
    total += Math.min(score, maxScore);
  });
  return total;
}

// Iterates every item in the test, not just itemStates — an unattempted item
// has no state at all, but its max still counts toward the total.
export function computeTotalMaxScore(items: TestItem[], TC: TestControllerUtilities): number {
  let total = 0;
  items.forEach((item) => {
    total += getOutcomeValue(TC.getItemStateByGuid(item.guid), 'MAXSCORE', 1);
  });
  return total;
}

export interface ResolvedItemOutcome {
  item: TestItem;
  score: number;
  maxScore: number;
}

/**
 * For every item with a null response (never attempted, or attempted with no
 * answer), fetches its XML and runs it through scoreQtiItemServerSide with no
 * response, writing the resulting outcome variables into TC's itemStates.
 * When the engine can't produce a score at all (fetch failure, or an item
 * type with no automated response processing, e.g. upload-interaction or a
 * feedback/template block), writes SCORE 0 / MAXSCORE 1 instead, so every
 * item still gets an entry.
 */
export async function finalizeUnattemptedItemOutcomes(items: TestItem[], TC: TestControllerUtilities, contentLoader: ContentLoader): Promise<ResolvedItemOutcome[]> {
  const unattempted = items.filter((item) => TC.isItemNullResponse(TC.getItemStateByGuid(item.guid)));
  return Promise.all(
    unattempted.map(async (item): Promise<ResolvedItemOutcome> => {
      let outcomeVariables: QtiVariable[];
      try {
        const itemXml = await contentLoader.resolveItemXml(item);
        const result = scoreQtiItemServerSide({ itemXml });
        if (result.ok) {
          outcomeVariables = Object.entries(result.outcomes).map(([identifier, value]) => ({ identifier, value }));
        } else {
          outcomeVariables = [{ identifier: 'SCORE', value: 0 }, { identifier: 'MAXSCORE', value: 1 }];
        }
      } catch {
        outcomeVariables = [{ identifier: 'SCORE', value: 0 }, { identifier: 'MAXSCORE', value: 1 }];
      }

      const state: LegacyAttemptState = {
        guid: item.guid,
        identifier: item.identifier,
        status: 'interacting',
        responseVariables: [],
        outcomeVariables,
        validationMessages: [],
      };
      TC.getItemStates()!.set(item.guid, state);
      return { item, score: getOutcomeValue(state, 'SCORE', 0), maxScore: getOutcomeValue(state, 'MAXSCORE', 1) };
    }),
  );
}

export interface SummaryBreakdown {
  correct: number;
  wrong: number;
  partial: number;
  skipped: number;
  score: number;
  maxScore: number;
}

export function computeSummaryBreakdown(items: TestItem[], TC: TestControllerUtilities, totalScore: number, totalMaxScore: number): SummaryBreakdown {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  items.forEach((item) => {
    const state = TC.getItemStateByGuid(item.guid);
    if (TC.isItemNullResponse(state)) {
      skipped++;
      return;
    }
    const scoreVar = state!.outcomeVariables.find((v) => v.identifier === 'SCORE');
    if (scoreVar && Number(scoreVar.value) > 0) correct++;
    else wrong++;
  });
  return { correct, wrong, partial: 0, skipped, score: totalScore, maxScore: totalMaxScore };
}

export function computeItemSubmissionMode(item: TestItem, testSubmissionMode: string): string {
  return item.sessionControl?.submissionMode || testSubmissionMode;
}
