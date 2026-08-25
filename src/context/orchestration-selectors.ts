/**
 * Pure derived-state getters, extracted out of useQtiRunnerOrchestration —
 * these only ever read TC (TestControllerUtilities) and RunnerState, never a
 * ref or the config, so they don't need to be hooks or live in the
 * orchestrator's closure at all. useQtiRunnerOrchestration keeps thin
 * zero/one-arg wrappers around these (same names, TC/state bound via
 * closure) so every existing call site there is untouched.
 */
import { computeSummaryBreakdown, computeTotalMaxScore, computeTotalScore } from '@/services/navigation-service';
import type { SummaryBreakdown } from '@/services/navigation-service';
import type { TestControllerUtilities } from '@/services/test-controller';
import type { RunnerState } from './QtiRunnerContext';
import type { FlattenedSection } from '@/utils/test-xml-parser';
import type { ItemSummaryEntry } from '@/types';

export function getSectionForIndex(TC: TestControllerUtilities, state: RunnerState, index: number): FlattenedSection | null {
  const item = TC.getItemAtIndex(index);
  if (!item) return null;
  return state.sections.find((s) => s.itemIdentifiers.includes(item.identifier)) || null;
}

export function isFirstItemOfSection(TC: TestControllerUtilities, state: RunnerState, index: number): boolean {
  const section = getSectionForIndex(TC, state, index);
  if (!section) return false;
  return section.itemIdentifiers[0] === TC.getItemAtIndex(index).identifier;
}

export function getCurrentSectionId(TC: TestControllerUtilities, state: RunnerState): string | null {
  if (!TC.getItems() || state.currentItem < 0) return null;
  const currentIdentifier = TC.getItemAtIndex(state.currentItem)?.identifier;
  const section = state.sections.find((s) => s.itemIdentifiers.includes(currentIdentifier));
  return section ? (section.identifier as string) : null;
}

export function getReviewSectionId(TC: TestControllerUtilities, state: RunnerState): string | null {
  if (!TC.getItems() || state.reviewIndex < 0) return null;
  const currentIdentifier = TC.getItemAtIndex(state.reviewIndex)?.identifier;
  const section = state.sections.find((s) => s.itemIdentifiers.includes(currentIdentifier));
  return section ? (section.identifier as string) : null;
}

export function getPendingSection(TC: TestControllerUtilities, state: RunnerState): FlattenedSection | null {
  return state.pendingItemIndex !== null ? getSectionForIndex(TC, state, state.pendingItemIndex) : null;
}

export function getPendingSectionIndex(TC: TestControllerUtilities, state: RunnerState): number {
  const pendingSection = getPendingSection(TC, state);
  if (!pendingSection) return 0;
  return state.sections.findIndex((s) => s.identifier === pendingSection.identifier);
}

export function getSummary(TC: TestControllerUtilities): ItemSummaryEntry[] {
  const items = TC.getItems();
  if (!items) return [];
  return items.map((item, index) => ({
    identifier: item.identifier,
    index,
    answered: !TC.isItemNullResponse(TC.getItemStateByGuid(item.guid)),
  }));
}

export function getBreakdown(TC: TestControllerUtilities): SummaryBreakdown {
  const items = TC.getItems();
  if (!items) return { correct: 0, wrong: 0, partial: 0, skipped: 0, score: 0, maxScore: 0 };
  const itemStates = TC.getItemStates() ?? new Map();
  const totalScore = computeTotalScore(itemStates);
  const totalMaxScore = computeTotalMaxScore(items, TC);
  return computeSummaryBreakdown(items, TC, totalScore, totalMaxScore);
}

export function getSectionsWithCounts(TC: TestControllerUtilities, state: RunnerState) {
  const items = TC.getItems();
  if (!items) return [];
  return state.sections.map((section) => {
    const indices = (section.itemIdentifiers as string[])
      .map((identifier) => items.findIndex((item) => item.identifier === identifier))
      .filter((index) => index >= 0);
    const answered = indices.filter((index) => !TC.isItemNullResponse(TC.getItemStateByGuid(items[index].guid))).length;
    return { ...section, answered, total: indices.length };
  });
}