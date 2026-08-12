import type { ItemSummaryEntry, LegacyAttemptState, TestItem } from '@/types';

export class TestControllerUtilities {
  items: TestItem[] | null = null;
  // Candidate's item state, keyed by item guid.
  itemStates: Map<string, LegacyAttemptState> | null = null;
  // { index, identifier } — set when navigating on a nonlinear test.
  navigateItemData: { index: number; identifier: string } | null = null;

  setItems(items: TestItem[]): void {
    this.items = items;
  }

  getItems(): TestItem[] | null {
    return this.items;
  }

  getNavigateItemData(): { index: number; identifier: string } | null {
    return this.navigateItemData;
  }

  setNavigateItemData(data: { index: number; identifier: string } | null): void {
    this.navigateItemData = data;
  }

  getItemAtIndex(index: number): TestItem {
    return this.items![index];
  }

  getItemByIdentifier(identifier: string): TestItem | null {
    const itemIndex = this.items!.findIndex((item) => item.identifier === identifier);
    if (itemIndex < 0) return null;
    return this.items![itemIndex];
  }

  getItemStates(): Map<string, LegacyAttemptState> | null {
    return this.itemStates;
  }

  setItemStates(itemStates: Map<string, LegacyAttemptState>): void {
    this.itemStates = itemStates;
  }

  getItemStateByGuid(guid: string): LegacyAttemptState | undefined {
    return this.itemStates!.get(guid);
  }

  isItemNullResponse(state: LegacyAttemptState | undefined | null): boolean {
    if (!this.isItemStateDefined(state)) return true;
    if (state === null) return true;

    for (const responseVariable of state!.responseVariables) {
      // Skip built-in responseVariables
      if (responseVariable.identifier === 'duration' || responseVariable.identifier === 'numAttempts') {
        continue;
      }

      if (responseVariable.value !== null) return false;
    }

    return true;
  }

  isItemStateDefined(state: LegacyAttemptState | undefined | null): boolean {
    return typeof state !== 'undefined';
  }

  /** Per-item answered/unanswered summary. */
  computeSummary(): ItemSummaryEntry[] {
    return this.items!.map((item, index) => ({
      identifier: item.identifier,
      index,
      answered: !this.isItemNullResponse(this.getItemStateByGuid(item.guid)),
    }));
  }
}