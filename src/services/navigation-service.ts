import type { FlattenedSection } from '@/utils/test-xml-parser';
import type { LegacyAttemptState, QtiDiagnosticMessage, QtiVariable, TestItem } from '@/types';
import type { TestControllerUtilities } from './test-controller';

export type NavigationTarget =
  | 'advancePart'
  | 'navigateNextItem'
  | 'navigatePrevItem'
  | 'navigateItem'
  | 'navigateEnd'
  | 'openReview'
  | null;

export interface NavigationDecision {
  action: 'advancePart' | 'blocked' | 'proceed' | 'skip' | 'endAttemptInteraction';
  reason?: 'invalid-responses' | 'adaptive-incomplete';
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

export function isAdaptiveIncomplete(outcomeVariables: QtiVariable[], isAdaptive: boolean): boolean {
  if (!isAdaptive) return false;
  const completionStatus = outcomeVariables.find((v) => v.identifier === 'completionStatus');
  return !!completionStatus && completionStatus.value !== 'completed';
}

export interface NavigationContext {
  validateResponses: boolean;
  isAdaptive: boolean;
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

  if (target === 'navigateNextItem' || target === 'navigatePrevItem' || target === 'navigateItem' || target === 'navigateEnd') {
    if (isInvalidResponses(state.validationMessages, ctx.validateResponses)) {
      return { action: 'blocked', reason: 'invalid-responses', message: state.validationMessages[0]?.message };
    }
    if (isAdaptiveIncomplete(state.outcomeVariables, ctx.isAdaptive)) {
      return { action: 'blocked', reason: 'adaptive-incomplete', message: 'Complete this item before moving on.' };
    }
    return { action: 'proceed' };
  }

  // target === null: an item-internal end-attempt-interaction.
  if (isSkipResponse(state.responseVariables)) return { action: 'skip' };
  return { action: 'endAttemptInteraction' };
}

export function computeTotalScore(itemStates: Map<string, LegacyAttemptState>): number {
  let total = 0;
  itemStates.forEach((state) => {
    const scoreVar = state.outcomeVariables.find((v) => v.identifier === 'SCORE');
    total += scoreVar ? Number(scoreVar.value) || 0 : 0;
  });
  return total;
}

export interface SummaryBreakdown {
  correct: number;
  wrong: number;
  partial: number;
  skipped: number;
  score: number;
}

export function computeSummaryBreakdown(items: TestItem[], TC: TestControllerUtilities, totalScore: number): SummaryBreakdown {
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
  return { correct, wrong, partial: 0, skipped, score: totalScore };
}

export function computeItemSubmissionMode(item: TestItem, testSubmissionMode: string): string {
  return item.sessionControl?.submissionMode || testSubmissionMode;
}

export function getSectionForIndex(index: number, TC: TestControllerUtilities, sections: FlattenedSection[]): FlattenedSection | null {
  const item = TC.getItemAtIndex(index);
  if (!item) return null;
  return sections.find((s) => s.itemIdentifiers.includes(item.identifier)) || null;
}

export function isFirstItemOfSection(index: number, TC: TestControllerUtilities, sections: FlattenedSection[]): boolean {
  const section = getSectionForIndex(index, TC, sections);
  if (!section) return false;
  return section.itemIdentifiers[0] === TC.getItemAtIndex(index).identifier;
}

export function shouldShowSectionIntro(
  index: number,
  TC: TestControllerUtilities,
  sections: FlattenedSection[],
  shownSectionIntros: Set<string>,
  showSectionIntro: boolean,
): boolean {
  if (!showSectionIntro) return false;
  const section = getSectionForIndex(index, TC, sections);
  if (!section || shownSectionIntros.has(section.identifier as string)) return false;
  return isFirstItemOfSection(index, TC, sections);
}
